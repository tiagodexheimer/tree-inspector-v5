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