// src/services/client/rota-detalhes-client.ts
import { DemandaType } from "@/types/demanda";

// ADICIONADO 'export' AQUI
export interface DemandaComOrdem extends DemandaType {
    ordem: number;
    status_nome: string;
    status_cor: string;
    lat: number | null;
    lng: number | null;
}

interface RotaDetalhesResponse {
    rota: any;
    demandas: DemandaComOrdem[];
    encodedPolyline: string | null; 
}

// [NOVA INTERFACE] para lista de Demandas Não Distribuídas
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

  async reorder(id: string, demandas: { id: number }[]): Promise<void> {
    const response = await fetch(`/api/rotas/${id}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demandas })
    });
    if (!response.ok) throw new Error("Erro ao salvar ordem.");
  },

  async exportXls(id: string): Promise<Blob> {
    const response = await fetch(`/api/rotas/${id}/export`);
    if (!response.ok) throw new Error("Erro ao exportar arquivo.");
    return response.blob();
  },
  
  // [CORRIGIDO] Alterado 'sync' para 'async'
  async getUndistributedDemandas(): Promise<DemandaNaoDistribuida[]> {
    const response = await fetch('/api/demandas/undistributed');
    if (!response.ok) throw new Error("Erro ao buscar demandas disponíveis.");
    return response.json();
  },

  // [NOVO] Adicionar demandas a uma rota
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
      return data.demandas; // Espera a nova lista completa
  }
};