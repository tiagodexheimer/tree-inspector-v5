import { RotaComContagem } from "@/app/rotas/page"; // Ou mova a interface para src/types/rotas.ts

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