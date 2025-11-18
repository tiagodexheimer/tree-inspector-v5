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

export const RotasClient = {
  async getAll(): Promise<RotaComContagem[]> {
    const response = await fetch('/api/rotas');
    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status} ao buscar rotas.`);
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