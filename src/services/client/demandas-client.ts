// src/services/client/demandas-client.ts
import { DemandaComIdStatus, OptimizedRouteData } from "@/types/demanda";

interface FetchDemandasParams {
  page: number;
  limit: number;
  filtro?: string;
  statusIds?: number[];
  tipoNomes?: string[];
}

interface FetchDemandasResponse {
  demandas: DemandaComIdStatus[];
  totalCount: number;
}

// Interface de retorno esperada para a criação de demanda
interface CreateDemandaResponse {
    protocolo: string;
    demanda: any; // O objeto completo da demanda criada
    message: string;
}

export const DemandasClient = {
  async getAll(params: FetchDemandasParams): Promise<FetchDemandasResponse> {
    const query = new URLSearchParams({
      page: params.page.toString(),
      limit: params.limit.toString(),
      ...(params.filtro && { filtro: params.filtro }),
      ...(params.statusIds?.length && { statusIds: params.statusIds.join(',') }),
      ...(params.tipoNomes?.length && { tipoNomes: params.tipoNomes.join(',') }),
    });

    const response = await fetch(`/api/demandas?${query}`);
    if (!response.ok) throw new Error("Erro ao buscar demandas.");
    return response.json();
  },
  
  // [MÉTODO PARA CRIAR (POST)]
  async create(data: any): Promise<CreateDemandaResponse> {
    const response = await fetch('/api/demandas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `Erro HTTP ${response.status} ao criar demanda.`);
    }
    // Retorna o corpo da resposta, que contém o protocolo
    return response.json(); 
  },

  // [MÉTODO PARA ATUALIZAR (PUT)]
  async update(id: number, data: any): Promise<void> {
    const response = await fetch(`/api/demandas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `Erro HTTP ${response.status} ao atualizar demanda.`);
    }
  },

  async updateStatus(id: number, idStatus: number): Promise<void> {
    const response = await fetch(`/api/demandas/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_status: idStatus }),
    });
    if (!response.ok) throw new Error("Erro ao atualizar status.");
  },

  async deleteMany(ids: number[]): Promise<void> {
    const response = await fetch('/api/demandas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error("Erro ao deletar demandas.");
  },

  async optimizeRoute(ids: number[]): Promise<OptimizedRouteData> {
    const response = await fetch('/api/rotas/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demandaIds: ids }),
    });
    if (!response.ok) throw new Error("Erro ao otimizar rota.");
    return response.json();
  }
};