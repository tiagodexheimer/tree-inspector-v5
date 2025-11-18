import { DemandaComOrdem } from "@/app/rotas/[id]/page"; // Idealmente mova essa interface para @/types

interface RotaDetalhesResponse {
    rota: any;
    demandas: DemandaComOrdem[];
    encodedPolyline: string | null; 
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

  // A exportação retorna um Blob
  async exportXls(id: string): Promise<Blob> {
    const response = await fetch(`/api/rotas/${id}/export`);
    if (!response.ok) throw new Error("Erro ao exportar arquivo.");
    return response.blob();
  }
};