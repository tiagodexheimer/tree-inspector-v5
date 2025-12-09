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
  
  // Novos campos opcionais para evitar erro se não passados
  organizationId?: number;
  planType?: string;
}

interface UpdateDemandaInput extends Partial<Omit<CreateDemandaInput, 'organizationId' | 'planType'>> {}

export class DemandasService {
  
  // [CORREÇÃO] listDemandas aceita organizationId como number
  async listDemandas(
    params: FindDemandasParams & { organizationId?: number }, 
    userRole?: string, 
    organizationId?: number
  ) {
    if (userRole === "free_user") {
      params.limit = 10;
      params.page = 1;
    }
    
    // Se quiser filtrar no repositório, injete o ID aqui:
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

  async createDemanda(input: CreateDemandaInput) {
    if (!input.cep || !input.numero || !input.tipo_demanda || !input.descricao) {
      throw new Error("Campos obrigatórios ausentes: CEP, Número, Tipo e Descrição.");
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
        // Segue sem coordenadas se falhar
    }

    const statusPendente = await StatusRepository.findByName("Pendente");
    const initialStatusId = statusPendente?.id || null;
    
    const prazoDate = input.prazo && input.prazo.trim() !== "" ? new Date(input.prazo) : null;
    
    // Cast para 'any' no input do repositório para evitar erro de tipagem se o DTO não tiver organization_id ainda
    const payload: any = {
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
    };
    
    // Adiciona organization_id se disponível (para futuro suporte no repo)
    if (input.organizationId) {
        payload.organization_id = input.organizationId;
    }

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
    // await DemandasRepository.deleteMany(ids, organizationId);
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