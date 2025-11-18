import pool from "@/lib/db";

// Interface do dado persistido
export interface StatusPersistence {
  id: number;
  nome: string;
  cor: string;
}

// DTO para criação
export interface CreateStatusDTO {
  nome: string;
  cor: string;
}

export const StatusRepository = {
  // Listar todos
  async findAll(): Promise<StatusPersistence[]> {
    try {
      const result = await pool.query(
        "SELECT id, nome, cor FROM demandas_status ORDER BY id"
      );
      return result.rows;
    } catch (error) {
      console.error("Erro no StatusRepository.findAll:", error);
      throw new Error("Falha ao buscar status.");
    }
  },

  // Buscar por nome (para validar duplicidade)
  async findByName(nome: string): Promise<StatusPersistence | null> {
    try {
      const result = await pool.query(
        "SELECT id, nome, cor FROM demandas_status WHERE nome = $1",
        [nome]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Erro no StatusRepository.findByName:", error);
      throw new Error("Falha ao verificar existência do status.");
    }
  },

  // Criar novo status
  async create(data: CreateStatusDTO): Promise<StatusPersistence> {
    try {
      const query = `
        INSERT INTO demandas_status (nome, cor) 
        VALUES ($1, $2) 
        RETURNING id, nome, cor
      `;
      const result = await pool.query(query, [data.nome, data.cor]);
      return result.rows[0];
    } catch (error) {
      console.error("Erro no StatusRepository.create:", error);
      throw new Error("Falha ao criar status.");
    }
  }
};