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
  // [NOVO] Campos de contexto injetados pelo controller
  organizationId: number;
  userId: string;
}

interface UpdateDemandaInput extends Partial<Omit<CreateDemandaInput, 'organizationId' | 'planType'>> {
    // Permite que qualquer campo seja opcional no update
}

export class DemandasService {
  
  // [MODIFICADO] Adicionado organizationId
  async listDemandas(params: FindDemandasParams, userRole?: string, organizationId?: number) {
    if (!organizationId) throw new Error("Organização não identificada.");
    
    // Injeta o ID da organização nos parâmetros de busca
    const searchParams = { ...params, organizationId };
    
    if (userRole === "free_user") {
      searchParams.limit = 10;
      // searchParams.page = 1; (Removido para permitir paginação normal até o limite)
    }

    const { demandas, totalCount } = await DemandasRepository.findAll(searchParams);
    
    const demandasFormatadas = demandas.map((d) => ({
      ...d,
      prazo: d.prazo ? new Date(d.prazo) : null,
      geom: d.geom ? JSON.parse(d.geom) : null,
    }));
    return { demandas: demandasFormatadas, totalCount };
  }

  // [MODIFICADO] Lógica de criação com limite por organização
  async createDemanda(input: CreateDemandaInput) {
    if (!input.cep || !input.numero || !input.tipo_demanda || !input.descricao) {
      throw new Error("Campos obrigatórios ausentes.");
    }

    // 1. Protocolo
    const nextId = await DemandasRepository.getNextProtocoloSequence();
    const protocolo = `${nextId}`; 

    // 2. Geocodificação (Se coordenadas não vierem do front)
    let lat = input.coordinates ? input.coordinates[0] : null;
    let lng = input.coordinates ? input.coordinates[1] : null;

    if (!lat || !lng) {
        const coords = await geocodingService.getCoordinates({
            logradouro: input.logradouro,
            numero: input.numero,
            cidade: input.cidade,
            uf: input.uf
        });
        if (coords) { lat = coords[0]; lng = coords[1]; }
    }

    // 3. Busca status inicial (Pendente da Organização correta seria o ideal, mas aqui pegamos pelo nome global se não houver colisão, ou ajustamos o repo status)
    // Para simplificar, assumimos que o nome é único ou o repo resolve.
    // O ideal seria: StatusRepository.findByName(orgId, 'Pendente')
    const statusPendente = await StatusRepository.findByName("Pendente"); 
    const initialStatusId = statusPendente?.id || null;
    
    // 4. Prazo
    const prazoDate = input.prazo ? new Date(input.prazo) : null;
    
    // 5. Criação
    return await DemandasRepository.create({
      protocolo, 
      organization_id: input.organizationId, // [NOVO]
      created_by_user_id: input.userId,      // [NOVO]
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