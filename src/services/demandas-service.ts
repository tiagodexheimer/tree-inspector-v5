import {
  DemandasRepository,
  FindDemandasParams,
  // [CRÍTICO] Use os nomes corretos para o que é exportado
  CreateDemandaDTO as RepoCreateDemandaInput,
  DemandaPersistence, 
  UpdateDemandaDTO as RepoUpdateDemandaInput
} from "@/repositories/demandas-repository";
import { StatusRepository } from "@/repositories/status-repository";
import { geocodingService } from "@/services/geocoding-service";

// [CRÍTICO] Constantes de Limite
const DEMANDAS_LIMIT_FREE = 10;
type PlanType = 'free' | 'pro';

// Interfaces de Entrada
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
  prazo?: string | null; // Recebe string do front-end
  coordinates?: [number, number] | null;
}

interface UpdateDemandaInput extends Partial<CreateDemandaInput> {
    // Permite que o ID seja opcional
}

export class DemandasService {
  
  // --- MÉTODOS DE ESCRITA E CRIAÇÃO ---

  /**
   * Cria uma nova demanda, aplicando o limite de 10 para o Plano Free.
   */
  async createDemanda(data: CreateDemandaDTO, organizationId: number, planType: PlanType): Promise<any> {
      
      // 1. [CRÍTICO] Implementação do Limite para Plano Free
      if (planType === 'free') {
          // Conta quantas demandas existem no total para esta organização
          const countResult = await DemandasRepository.countAllByOrganization(organizationId);
          
          if (countResult >= DEMANDAS_LIMIT_FREE) {
              throw new Error(`Limite de ${DEMANDAS_LIMIT_FREE} demandas atingido para o plano Free.`);
          }
      }
      
      // Validações básicas (ajustado para ser robusto)
      if (!data.cep || !data.numero || !data.tipo_demanda || !data.descricao) {
          throw new Error("Campos obrigatórios ausentes: CEP, Número, Tipo e Descrição.");
      }
      
      // 2. Geração do Protocolo Sequencial
      const nextId = await DemandasRepository.getNextProtocoloSequence();
      const protocolo = nextId.toString().padStart(6, '0');

      // 3. Geocodificação
      const coordinates = await geocodingService.getCoordinates({
          logradouro: data.logradouro,
          numero: data.numero,
          cidade: data.cidade,
          uf: data.uf
      });
      
      const lat = coordinates ? coordinates[0] : null;
      const lng = coordinates ? coordinates[1] : null;

      // 4. Busca status inicial
      const statusPendente = await StatusRepository.findByName("Pendente");
      const initialStatusId = statusPendente?.id || null;
      
      // 5. [CRÍTICO] Formata o prazo - CORREÇÃO DO ERRO DE DATA
      const prazoDate = 
        (data.prazo && data.prazo.trim() !== "") 
          ? new Date(data.prazo) 
          : null; // <--- Se a string for vazia, enviamos NULL
      
      if (prazoDate && isNaN(prazoDate.getTime())) {
          throw new Error("Prazo inválido. Formato de data incorreto.");
      }
      
      // 6. Cria demanda no Repositório
      const newDemanda = await DemandasRepository.create({
        protocolo, 
        nome_solicitante: data.nome_solicitante,
        telefone_solicitante: data.telefone_solicitante || null,
        email_solicitante: data.email_solicitante || null,
        cep: data.cep.replace(/\D/g, ""),
        logradouro: data.logradouro || null,
        numero: data.numero,
        complemento: data.complemento || null,
        bairro: data.bairro || null,
        cidade: data.cidade || null,
        uf: data.uf ? data.uf.toUpperCase() : null,
        tipo_demanda: data.tipo_demanda,
        descricao: data.descricao,
        id_status: initialStatusId,
        lat,
        lng,
        prazo: prazoDate, // Envia null ou Date
      } as RepoCreateDemandaInput, organizationId); // [CRÍTICO] Passa organizationId

      return newDemanda;
  }
  
  /**
   * Atualiza uma demanda existente.
   */
  async updateDemanda(id: number, input: Partial<UpdateDemandaInput>, organizationId: number): Promise<DemandaPersistence> {
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
      
      // 2. [CRÍTICO] Formato de Prazo
      const prazoDate =
        (input.prazo && input.prazo.trim() !== "") 
          ? new Date(input.prazo) 
          : null; // <--- Se a string for vazia, enviamos NULL

      // 3. Atualizar
      const updated = await DemandasRepository.update(id, {
          ...input,
          lat,
          lng,
          prazo: prazoDate, // Envia null ou Date
          cep: input.cep ? input.cep.replace(/\D/g, "") : undefined,
      } as RepoUpdateDemandaInput, organizationId); // [CRÍTICO] Passa organizationId

      if (!updated) {
        throw new Error("Demanda não encontrada.");
      }

      return updated;
  }

  /**
   * Deleta uma demanda existente.
   */
  async deleteDemanda(id: number, organizationId: number): Promise<void> {
    // [CRÍTICO] A exclusão é filtrada pelo organizationId no repositório
    const success = await DemandasRepository.delete(id, organizationId);
    if (!success) {
      throw new Error("Demanda não encontrada.");
    }
  }

  /**
   * Atualiza o status de uma demanda pelo ID do status.
   */
  async updateDemandaStatus(id: number, idStatus: number, organizationId: number): Promise<void> {
    const statusExists = await StatusRepository.findById(idStatus);
    if (!statusExists) {
      throw new Error(`Status com ID ${idStatus} não encontrado.`);
    }

    // [CRÍTICO] A atualização é filtrada pelo organizationId no repositório
    const updated = await DemandasRepository.updateStatus(id, idStatus, organizationId);

    if (!updated) {
      throw new Error("Demanda não encontrada para atualização de status.");
    }
  }
  
  /**
   * Deleta múltiplas demandas.
   */
  async deleteDemandas(ids: number[], organizationId: number): Promise<void> {
    await DemandasRepository.deleteMany(ids, organizationId); // [CRÍTICO] Passa organizationId
  }


  // --- MÉTODOS DE LEITURA ---
  
  /**
   * Lista demandas com paginação e filtros.
   */
  async listDemandas(params: FindDemandasParams, organizationId: number): Promise<any> {
      // O repositório irá usar o organizationId para filtrar a query
      return DemandasRepository.findAll({...params, organizationId}); // [CRÍTICO] Passa organizationId
  }

  /**
   * Busca uma demanda por ID.
   */
  async getDemandaById(id: number, organizationId: number): Promise<any> {
      return DemandasRepository.findById(id, organizationId); // [CRÍTICO] Passa organizationId
  }
}

export const demandasService = new DemandasService();