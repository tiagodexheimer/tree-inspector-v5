// src/services/client/rotas-client.ts
// ADICIONADO 'export' na frente da interface
export interface RotaComContagem {
    id: number;
    nome: string;
    responsavel: string;
    status: string;
    data_rota: string | null;
    created_at: string;
    total_demandas: number;
}

// [NOVO] Interface de resposta (reutilizada de rota-detalhes-client)
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

interface RotaDetailsResponse {
    rota: RotaComContagem;
    demandas: DemandaComOrdem[];
    encodedPolyline: string | null; 
}


export const RotasClient = {
  async getAll(): Promise<RotaComContagem[]> {
    const response = await fetch('/api/rotas');
    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status} ao buscar rotas.`);
    }
    return response.json();
  },

  // [NOVO] Adicionar método para buscar detalhes da rota
  async getRouteDetails(id: number): Promise<RotaDetailsResponse> {
    const response = await fetch(`/api/rotas/${id}`);
    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status} ao buscar detalhes da rota.`);
    }
    return response.json();
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