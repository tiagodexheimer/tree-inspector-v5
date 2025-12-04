import {
  DemandasRepository,
  FindDemandasParams,
  CreateDemandaDTO  as RepoCreateDemandaInput,
  UpdateDemandaDTO as RepoUpdateDemandaInput
} from "@/repositories/demandas-repository";
import { StatusRepository } from "@/repositories/status-repository";
import { DemandasTiposRepository } from "@/repositories/demandas-tipos-repository";
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
}

interface UpdateDemandaInput extends Partial<CreateDemandaInput> {
    // Permite que qualquer campo seja opcional
}

export class DemandasService {
  
  async listDemandas(params: FindDemandasParams, userRole?: string) {
    if (userRole === "free_user") {
      params.limit = 10;
      params.page = 1;
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

    // 1. Geração do Protocolo Sequencial
    const nextId = await DemandasRepository.getNextProtocoloSequence();
    const protocolo = `${nextId}`; 

    // 2. Geocodificação
    const coordinates = await geocodingService.getCoordinates({
        logradouro: input.logradouro,
        numero: input.numero,
        cidade: input.cidade,
        uf: input.uf
    });
    
    const lat = coordinates ? coordinates[0] : null;
    const lng = coordinates ? coordinates[1] : null;

    // 3. Busca status inicial
    const statusPendente = await StatusRepository.findByName("Pendente");
    const initialStatusId = statusPendente?.id || null;
    
    // 4. Formata o prazo
    const prazoDate =
      input.prazo && input.prazo.trim() !== "" ? new Date(input.prazo) : null;
    
    // 5. Cria demanda no Repositório
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
    } as RepoCreateDemandaInput);
  }

  async importBatch(rows: any[]) {
    return { successCount: 0, errors: [] };
  }
  
  private parseDate(d: any) {
    return null;
  }

  async updateDemanda(id: number, input: Partial<UpdateDemandaInput>): Promise<any> {
    // 1. Coordenadas: Se não forem passadas, tenta geocodificar se os dados de endereço existirem
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

    // 3. Atualizar
    const updated = await DemandasRepository.update(id, {
        ...input,
        lat,
        lng,
        prazo: prazoDate,
        cep: input.cep ? input.cep.replace(/\D/g, "") : undefined,
    } as RepoUpdateDemandaInput); // Cast para o tipo de update do repositório

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
  
  async deleteDemandas(ids: number[]): Promise<void> {
    await DemandasRepository.deleteMany(ids);
  }
}

export const demandasService = new DemandasService();