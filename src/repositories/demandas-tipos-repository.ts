import pool from "@/lib/db";

// Interface do dado persistido
export interface TipoDemandaPersistence {
  id: number;
  nome: string;
}

// DTO para criação
export interface CreateTipoDemandaDTO {
  nome: string;
}

export const DemandasTiposRepository = {
  // --- MÉTODOS DE LEITURA (READ) ---

  // Listar todos
  async findAll(): Promise<TipoDemandaPersistence[]> {
    try {
      const result = await pool.query(
        "SELECT id, nome FROM demandas_tipos ORDER BY nome"
      );
      return result.rows;
    } catch (error) {
      console.error("Erro no DemandasTiposRepository.findAll:", error);
      throw new Error("Falha ao buscar tipos de demanda.");
    }
  },

  // Buscar por nome (para validação de duplicidade)
  async findByName(nome: string): Promise<TipoDemandaPersistence | null> {
    try {
      const result = await pool.query(
        "SELECT id, nome FROM demandas_tipos WHERE nome = $1",
        [nome]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Erro no DemandasTiposRepository.findByName:", error);
      throw new Error("Falha ao verificar existência do tipo.");
    }
  },

  // Buscar por ID (para updates e deletes)
  async findById(id: number): Promise<TipoDemandaPersistence | null> {
    try {
      const result = await pool.query(
        "SELECT id, nome FROM demandas_tipos WHERE id = $1",
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Erro no DemandasTiposRepository.findById:", error);
      throw new Error("Falha ao buscar tipo por ID.");
    }
  },

  // Verificar uso na tabela demandas (Integridade Referencial Manual)
  async countUsageByName(nome: string): Promise<number> {
    try {
      const result = await pool.query(
        "SELECT COUNT(*) FROM demandas WHERE tipo_demanda = $1",
        [nome]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error("Erro no DemandasTiposRepository.countUsageByName:", error);
      throw new Error("Falha ao verificar uso do tipo.");
    }
  },

  // --- MÉTODOS DE ESCRITA (WRITE) ---

  // Criar novo tipo
  async create(data: CreateTipoDemandaDTO): Promise<TipoDemandaPersistence> {
    try {
      const query = `
        INSERT INTO demandas_tipos (nome) 
        VALUES ($1) 
        RETURNING id, nome
      `;
      const result = await pool.query(query, [data.nome]);
      return result.rows[0];
    } catch (error) {
      console.error("Erro no DemandasTiposRepository.create:", error);
      throw new Error("Falha ao criar tipo de demanda.");
    }
  },

  // Atualizar tipo
  async update(id: number, nome: string): Promise<TipoDemandaPersistence | null> {
    try {
      const result = await pool.query(
        "UPDATE demandas_tipos SET nome = $1 WHERE id = $2 RETURNING id, nome",
        [nome, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Erro no DemandasTiposRepository.update:", error);
      throw new Error("Falha ao atualizar tipo.");
    }
  },

  // Deletar tipo
  async delete(id: number): Promise<boolean> {
    try {
      const result = await pool.query(
        "DELETE FROM demandas_tipos WHERE id = $1 RETURNING id",
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Erro no DemandasTiposRepository.delete:", error);
      throw new Error("Falha ao deletar tipo.");
    }
  }
};