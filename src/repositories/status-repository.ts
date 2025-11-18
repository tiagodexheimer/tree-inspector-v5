import pool from "@/lib/db";

export interface StatusPersistence {
  id: number;
  nome: string;
  cor: string;
}

export interface CreateStatusDTO {
  nome: string;
  cor: string;
}

export const StatusRepository = {
  // --- LEITURA ---

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

  async findById(id: number): Promise<StatusPersistence | null> {
    try {
      const result = await pool.query(
        "SELECT id, nome, cor FROM demandas_status WHERE id = $1",
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Erro no StatusRepository.findById:", error);
      throw new Error("Falha ao buscar status por ID.");
    }
  },

  // Verifica quantas demandas usam este status (por ID)
  async countUsageById(id: number): Promise<number> {
    try {
      const result = await pool.query(
        "SELECT COUNT(*) FROM demandas WHERE id_status = $1",
        [id]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error("Erro no StatusRepository.countUsageById:", error);
      throw new Error("Falha ao verificar uso do status.");
    }
  },

  // --- ESCRITA ---

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
  },

  async update(id: number, data: CreateStatusDTO): Promise<StatusPersistence | null> {
    try {
      const query = `
        UPDATE demandas_status 
        SET nome = $1, cor = $2 
        WHERE id = $3 
        RETURNING id, nome, cor
      `;
      const result = await pool.query(query, [data.nome, data.cor, id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Erro no StatusRepository.update:", error);
      throw new Error("Falha ao atualizar status.");
    }
  },

  async delete(id: number): Promise<boolean> {
    try {
      const result = await pool.query(
        "DELETE FROM demandas_status WHERE id = $1 RETURNING id",
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Erro no StatusRepository.delete:", error);
      throw new Error("Falha ao deletar status.");
    }
  }
};