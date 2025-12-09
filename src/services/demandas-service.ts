import {
  DemandasRepository,
  FindDemandasParams,
  CreateDemandaDTO as RepoCreateDemandaInput,
  DemandaPersistence,
  UpdateDemandaDTO as RepoUpdateDemandaInput
} from "@/repositories/demandas-repository";
import { StatusRepository } from "@/repositories/status-repository";
import { geocodingService } from "@/services/geocoding-service";

interface CreateDemandaInput {
  nome_solicitante: string;
  telefone_solicitante?: string | null;
  email_solicitante?: string | null;
  cep: string;
  logradouro?: string | null;
  numero: string;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  tipo_demanda: string;
  descricao: string;
  prazo?: string | null;
  coordinates?: [number, number] | null;
  // [NOVO] Campos obrigatórios para multi-tenancy
  organizationId: number;
  planType?: string; 
}

interface UpdateDemandaInput extends Partial<Omit<CreateDemandaInput, 'organizationId' | 'planType'>> {
    // Permite que qualquer campo seja opcional no update
}

export class DemandasService {
  
  // [MODIFICADO] Adicionado organizationId
  async listDemandas(params: FindDemandasParams, userRole?: string, organizationId?: number) {
    if (!organizationId) {
        throw new Error("ID da organização é obrigatório para listar demandas.");
    }

    // O limite de paginação do front pode ser sobrescrito aqui se necessário, 
    // mas o limite "físico" de quantidade de dados é controlado no create.
    
    const { demandas, totalCount } = await DemandasRepository.findAll({
        ...params,
        organizationId // Passa o ID para o repositório filtrar
    });

    const demandasFormatadas = demandas.map((d) => ({
      ...d,
      prazo: d.prazo ? new Date(d.prazo) : null,
      geom: d.geom ? JSON.parse(d.geom) : null,
    }));
    return { demandas: demandasFormatadas, totalCount };
  }

  // [MODIFICADO] Lógica de criação com limite por organização
  async createDemanda(input: CreateDemandaInput) {
    if (
      !input.cep ||
      !input.numero ||
      !input.tipo_demanda ||
      !input.descricao
    ) {
      throw new Error(
        "Campos obrigatórios ausentes: CEP, Número, Tipo e Descrição."
      );
    }

    // 1. Validação de Limite do Plano Free
    // Se o plano não for informado, assume Free por segurança
    const planType = input.planType || 'Free'; 
    
    if (planType === 'Free') {
        const currentCount = await DemandasRepository.countByOrganization(input.organizationId);
        // Limite de 10 demandas para plano Free
        if (currentCount >= 10) {
            throw new Error("Limite de 10 demandas atingido para o plano Free. Atualize para o plano Pro para criar mais.");
        }
    }

    // 2. Geração do Protocolo Sequencial
    const nextId = await DemandasRepository.getNextProtocoloSequence();
    const protocolo = `${nextId}`; 

    // 3. Geocodificação
    const coordinates = await geocodingService.getCoordinates({
        logradouro: input.logradouro,
        numero: input.numero,
        cidade: input.cidade,
        uf: input.uf
    });
    
    const lat = coordinates ? coordinates[0] : null;
    const lng = coordinates ? coordinates[1] : null;

    // 4. Busca status inicial (Pendente)
    // Nota: O StatusRepository também deveria filtrar por organização idealmente, 
    // mas se os status forem padronizados (criados pelo trigger), o nome 'Pendente' vai existir.
    // Para maior segurança, busque o status da organização específica se possível.
    const statusPendente = await StatusRepository.findByName("Pendente");
    const initialStatusId = statusPendente?.id || null;
    
    // 5. Formata o prazo
    const prazoDate =
      input.prazo && input.prazo.trim() !== "" ? new Date(input.prazo) : null;
    
    // 6. Cria demanda no Repositório vinculada à Organização
    return await DemandasRepository.create({
      protocolo, 
      nome_solicitante: input.nome_solicitante,
      telefone_solicitante: input.telefone_solicitante || null,
      email_solicitante: input.email_solicitante || null,
      cep: input.cep.replace(/\D/g, ""),
      logradouro: input.logradouro || null,
      numero: input.numero,
      complemento: input.complemento || null,
      bairro: input.bairro || null,
      cidade: input.cidade || null,
      uf: input.uf ? input.uf.toUpperCase() : null,
      tipo_demanda: input.tipo_demanda,
      descricao: input.descricao,
      id_status: initialStatusId,
      lat,
      lng,
      prazo: prazoDate,
      organization_id: input.organizationId // [CRÍTICO] Vínculo com a organização
    } as RepoCreateDemandaInput);
  }

  async importBatch(rows: any[]) {
    // Implementar lógica de importação respeitando limites e organizationId futuramente
    return { successCount: 0, errors: [] };
  }
  
  private parseDate(d: any) {
    return null;
  }

  // [MODIFICADO] Update com organizationId
  async updateDemanda(id: number, input: Partial<UpdateDemandaInput>, organizationId: number): Promise<DemandaPersistence> {
    // 1. Coordenadas
    let lat: number | null = input.coordinates ? input.coordinates[0] : null;
    let lng: number | null = input.coordinates ? input.coordinates[1] : null;

    if (!input.coordinates && input.logradouro && input.numero && input.cidade && input.uf) {
      const coords = await geocodingService.getCoordinates({
        logradouro: input.logradouro,
        numero: input.numero,
        cidade: input.cidade,
        uf: input.uf
      });
      if (coords) {
        lat = coords[0];
        lng = coords[1];
      }
    }
    
    // 2. Formato de Prazo
    const prazoDate =
      input.prazo && input.prazo.trim() !== "" ? new Date(input.prazo) : null;

    // 3. Atualizar (Passando organizationId para segurança)
    const updated = await DemandasRepository.update(id, organizationId, {
        ...input,
        lat,
        lng,
        prazo: prazoDate,
        cep: input.cep ? input.cep.replace(/\D/g, "") : undefined,
    } as RepoUpdateDemandaInput);

    if (!updated) {
      throw new Error("Demanda não encontrada ou você não tem permissão para editá-la.");
    }

    return updated;
  }

  // [MODIFICADO] Delete com organizationId
  async deleteDemanda(id: number, organizationId: number): Promise<void> {
    const success = await DemandasRepository.delete(id, organizationId);
    if (!success) {
      throw new Error("Demanda não encontrada ou você não tem permissão para excluí-la.");
    }
  }

  // [MODIFICADO] Update Status com organizationId
  async updateDemandaStatus(id: number, idStatus: number, organizationId: number): Promise<void> {
    // Verifica se o status existe (idealmente checar se pertence à org também)
    const statusExists = await StatusRepository.findById(idStatus);
    if (!statusExists) {
      throw new Error(`Status com ID ${idStatus} não encontrado.`);
    }

    const updated = await DemandasRepository.updateStatus(id, idStatus, organizationId);

    if (!updated) {
      throw new Error("Demanda não encontrada para atualização de status.");
    }
  }
  
  // [MODIFICADO] Bulk Delete com organizationId
  async deleteDemandas(ids: number[], organizationId: number): Promise<void> {
    await DemandasRepository.deleteMany(ids, organizationId);
  }

  // [NOVO] Método para buscar demandas não distribuídas (para criação de rotas)
  async findUndistributed(organizationId: number) {
      return await DemandasRepository.findUndistributed(organizationId);
  }
}

export const demandasService = new DemandasService();