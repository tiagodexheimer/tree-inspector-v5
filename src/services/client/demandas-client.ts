// src/services/client/demandas-client.ts
import { DemandaComIdStatus, OptimizedRouteData } from "@/types/demanda";

interface FetchDemandasParams {
  page: number;
  limit: number;
  filtro?: string;
  statusIds?: number[];
  tipoNomes?: string[];
  bairros?: string[];
  notificacoesVencidas?: boolean; // [NOVO]
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
    const query = new URLSearchParams();
    query.append('page', params.page.toString());
    query.append('limit', params.limit.toString());
    if (params.filtro) query.append('filtro', params.filtro);
    if (params.statusIds?.length) query.append('statusIds', params.statusIds.join(','));
    if (params.tipoNomes?.length) query.append('tipoNomes', params.tipoNomes.join(','));
    if (params.bairros?.length) query.append('bairros', params.bairros.join(','));
    if (params.notificacoesVencidas) query.append('notificacoesVencidas', 'true'); // [NOVO]

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