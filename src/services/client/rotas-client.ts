// src/services/client/rotas-client.ts

export interface RotaComContagem {
    id: number;
    nome: string;
    responsavel: string;
    status: string;
    data_rota: string | null;
    created_at: string;
    total_demandas: number;
}

export interface DemandaComOrdem {
    id?: number;
    logradouro?: string | null;
    numero: string;
    bairro?: string | null;
    tipo_demanda: string;
    status_nome: string;
    status_cor: string;
    lat: number | null;
    lng: number | null;
    ordem: number;
}

// [ATUALIZADO] Interface inclui os pontos de início e fim
interface RotaDetailsResponse {
    rota: RotaComContagem;
    demandas: DemandaComOrdem[];
    encodedPolyline: string | null; 
    startPoint?: { latitude: number; longitude: number };
    endPoint?: { latitude: number; longitude: number };
}

export const RotasClient = {
  async getAll(): Promise<RotaComContagem[]> {
    const response = await fetch('/api/rotas');
    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status} ao buscar rotas.`);
    }
    return response.json();
  },

  async getRouteDetails(id: number): Promise<RotaDetailsResponse> {
    const response = await fetch(`/api/rotas/${id}`);
    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status} ao buscar detalhes da rota.`);
    }
    return response.json();
  },

  async update(id: number, data: { nome?: string; responsavel?: string; status?: string }): Promise<void> {
    const response = await fetch(`/api/rotas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Erro HTTP ${response.status} ao atualizar rota.`);
    }
  },

  async delete(id: number): Promise<void> {
    const response = await fetch(`/api/rotas/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status} ao deletar rota.`);
    }
  }
};