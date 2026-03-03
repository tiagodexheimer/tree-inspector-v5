import { DemandaType } from "@/types/demanda";

export interface DemandaComOrdem extends DemandaType {
  ordem: number;
  status_nome: string;
  status_cor: string;
  lat: number | null;
  lng: number | null;
}

// [ATUALIZADO] Adicionado startPoint e endPoint
interface RotaDetalhesResponse {
  rota: any;
  demandas: DemandaComOrdem[];
  encodedPolyline: string | null;
  startPoint?: { latitude: number; longitude: number };
  endPoint?: { latitude: number; longitude: number };
}

// ... (Restante do arquivo, DemandaNaoDistribuida e RotaDetalhesClient, mantidos iguais)
export interface DemandaNaoDistribuida {
  id: number;
  protocolo: string;
  nome_solicitante: string;
  tipo_demanda: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  status_nome: string;
  status_cor: string;
  lat: number | null;
  lng: number | null;
}

export const RotaDetalhesClient = {
  async getById(id: string): Promise<RotaDetalhesResponse> {
    const response = await fetch(`/api/rotas/${id}`);
    if (!response.ok) throw new Error(`Erro ao buscar rota: ${response.status}`);
    return response.json();
  },
  // ... outros métodos mantidos
  async reorder(id: string, demandas: { id: number }[]): Promise<void> {
    const response = await fetch(`/api/rotas/${id}/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demandas })
    });
    if (!response.ok) throw new Error("Erro ao salvar ordem.");
  },

  async exportPdf(id: string): Promise<Blob> {
    const response = await fetch(`/api/rotas/${id}/export`);
    if (!response.ok) throw new Error("Erro ao exportar arquivo.");
    return response.blob();
  },

  async getUndistributedDemandas(): Promise<DemandaNaoDistribuida[]> {
    const response = await fetch('/api/demandas/undistributed');
    if (!response.ok) throw new Error("Erro ao buscar demandas disponíveis.");
    return response.json();
  },

  async addDemandas(rotaId: string, demandaIds: number[]): Promise<DemandaComOrdem[]> {
    const response = await fetch(`/api/rotas/${rotaId}/add-demanda`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demandaIds })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro ao adicionar demandas: ${response.status}`);
    }
    const data = await response.json();
    return data.demandas;
  }
};