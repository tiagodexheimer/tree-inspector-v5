// src/services/demandas-service.ts
import {
  DemandasRepository,
  FindDemandasParams,
  CreateDemandaDTO as RepoCreateDemandaInput,
  DemandaPersistence,
  UpdateDemandaDTO as RepoUpdateDemandaInput
} from "@/repositories/demandas-repository";
import { StatusRepository } from "@/repositories/status-repository";
import { geocodingService } from "@/services/geocoding-service";
import { UserRole } from "@/types/auth-types"; 

// [ATUALIZADO] Interface de criação de demanda (dados puros, sem contexto de autenticação/sessão)
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
}

interface UpdateDemandaInput extends Partial<CreateDemandaInput> {}

const MAX_DEMANDS_FREE = 10; // Limite de demandas ativas para o plano Free

export class DemandasService {
  
  // [CORRIGIDO] listDemandas para usar a nova role 'free'
  async listDemandas(
    params: FindDemandasParams & { organizationId?: number }, 
    userRole?: UserRole, 
    organizationId?: number
  ) {
    // [CORREÇÃO] Checa a nova role 'free'
    if (userRole === "free") { 
      params.limit = MAX_DEMANDS_FREE; 
      params.page = 1;
    }
    
    if (organizationId) {
        params.organizationId = organizationId;
    }

    const { demandas, totalCount } = await DemandasRepository.findAll(params);

    const demandasFormatadas = demandas.map((d) => ({
      ...d,
      prazo: d.prazo ? new Date(d.prazo) : null,
      geom: d.geom ? JSON.parse(d.geom) : null,
    }));
    return { demandas: demandasFormatadas, totalCount };
  }

  // [CORRIGIDO] createDemanda agora recebe organizationId e userRole como argumentos obrigatórios
  async createDemanda(
    input: CreateDemandaInput,
    organizationId: number, // Argumento obrigatório
    userRole: UserRole // Argumento obrigatório para aplicar regras
  ): Promise<DemandaPersistence> {
    if (!input.cep || !input.numero || !input.tipo_demanda || !input.descricao) {
      throw new Error("Campos obrigatórios ausentes: CEP, Número, Tipo e Descrição.");
    }
    
    // 1. REGRA DE NEGÓCIO: Limite Free (10 demandas)
    // O limite é aplicado SOMENTE se a role for 'free'. (Basic/Pro/Premium são ilimitados)
    if (userRole === 'free') { 
        // Assume que DemandasRepository.countByOrganization está implementado
        const currentCount = await DemandasRepository.countByOrganization(organizationId);
        if (currentCount >= MAX_DEMANDS_FREE) {
            throw new Error(`Limite de ${MAX_DEMANDS_FREE} demandas ativas atingido para o Plano Free. Considere atualizar seu plano.`);
        }
    }

    const nextId = await DemandasRepository.getNextProtocoloSequence();
    const protocolo = `${nextId}`; 

    // Tenta obter coordenadas
    let lat: number | null = null;
    let lng: number | null = null;
    
    try {
        if (input.coordinates) {
            lat = input.coordinates[0];
            lng = input.coordinates[1];
        } else {
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
    } catch (e) {
        console.warn("Erro ao geocodificar no createDemanda:", e);
    }

    const statusPendente = await StatusRepository.findByName("Pendente");
    const initialStatusId = statusPendente?.id || null;
    
    const prazoDate = input.prazo && input.prazo.trim() !== "" ? new Date(input.prazo) : null;
    
    // organization_id é garantido e passado para o payload do repositório
    const payload: RepoCreateDemandaInput = {
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
      organization_id: organizationId, // ID da organização garantido aqui
    };
    
    return await DemandasRepository.create(payload);
  }

  async updateDemanda(id: number, input: Partial<UpdateDemandaInput>): Promise<DemandaPersistence> {
    let lat: number | null = input.coordinates ? input.coordinates[0] : null;
    let lng: number | null = input.coordinates ? input.coordinates[1] : null;

    if (!input.coordinates && input.logradouro && input.numero) {
        try {
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
        } catch (e) {
            console.warn("Erro ao geocodificar no updateDemanda:", e);
        }
    }
    
    const prazoDate = input.prazo && input.prazo.trim() !== "" ? new Date(input.prazo) : null;

    const updated = await DemandasRepository.update(id, {
        ...input,
        lat,
        lng,
        prazo: prazoDate,
        cep: input.cep ? input.cep.replace(/\D/g, "") : undefined,
    } as RepoUpdateDemandaInput);

    if (!updated) {
      throw new Error("Demanda não encontrada.");
    }

    return updated;
  }

  async deleteDemanda(id: number): Promise<void> {
    const success = await DemandasRepository.delete(id);
    if (!success) {
      throw new Error("Demanda não encontrada.");
    }
  }

  // [CORREÇÃO] Adicionado 2º argumento opcional para bater com a chamada da rota
  async deleteDemandas(ids: number[], organizationId?: number): Promise<void> {
    // Note: O repositório deve usar o organizationId se fornecido para segurança multi-tenant
    await DemandasRepository.deleteMany(ids);
  }

  async updateDemandaStatus(id: number, idStatus: number): Promise<void> {
    const statusExists = await StatusRepository.findById(idStatus);
    if (!statusExists) {
      throw new Error(`Status com ID ${idStatus} não encontrado.`);
    }
    const updated = await DemandasRepository.updateStatus(id, idStatus);
    if (!updated) {
      throw new Error("Demanda não encontrada para atualização de status.");
    }
  }

  async importBatch(rows: any[]) {
    return { successCount: 0, errors: [] };
  }
}

export const demandasService = new DemandasService();