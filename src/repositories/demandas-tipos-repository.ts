// src/repositories/demandas-tipos-repository.ts
import pool from "@/lib/db";

// Interface do dado persistido (agora inclui dados do formulário)
export interface TipoDemandaPersistence {
  id: number;
  nome: string;
  id_formulario?: number | null;
  nome_formulario?: string | null;
}

// DTOs
export interface CreateTipoDemandaDTO {
  nome: string;
  id_formulario?: number | null;
}

export interface UpdateTipoDemandaDTO {
  nome: string;
  id_formulario?: number | null;
}

export const DemandasTiposRepository = {
  // --- MÉTODOS DE LEITURA (READ) ---

  async findAll(): Promise<TipoDemandaPersistence[]> {
    try {
      // JOIN para trazer também qual formulário está vinculado
      const query = `
        SELECT 
            dt.id, 
            dt.nome, 
            dtf.id_formulario,
            f.nome AS nome_formulario
        FROM 
            demandas_tipos dt
        LEFT JOIN 
            demandas_tipos_formularios dtf ON dt.id = dtf.id_tipo_demanda
        LEFT JOIN 
            formularios f ON dtf.id_formulario = f.id
        ORDER BY 
            dt.nome
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error("Erro no DemandasTiposRepository.findAll:", error);
      throw new Error("Falha ao buscar tipos de demanda.");
    }
  },

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

  async findById(id: number): Promise<TipoDemandaPersistence | null> {
    try {
      // Também trazemos o vínculo no findById para consistência
      const query = `
        SELECT dt.id, dt.nome, dtf.id_formulario
        FROM demandas_tipos dt
        LEFT JOIN demandas_tipos_formularios dtf ON dt.id = dtf.id_tipo_demanda
        WHERE dt.id = $1
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Erro no DemandasTiposRepository.findById:", error);
      throw new Error("Falha ao buscar tipo por ID.");
    }
  },

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

  async create(data: CreateTipoDemandaDTO): Promise<TipoDemandaPersistence> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Cria o Tipo
      const queryTipo = `INSERT INTO demandas_tipos (nome) VALUES ($1) RETURNING id, nome`;
      const resTipo = await client.query(queryTipo, [data.nome]);
      const newTipo = resTipo.rows[0];

      // 2. Se houver formulário, cria o vínculo
      if (data.id_formulario) {
        await client.query(
          `INSERT INTO demandas_tipos_formularios (id_tipo_demanda, id_formulario) VALUES ($1, $2)`,
          [newTipo.id, data.id_formulario]
        );
      }

      await client.query('COMMIT');
      return { ...newTipo, id_formulario: data.id_formulario || null };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Erro no DemandasTiposRepository.create:", error);
      throw new Error("Falha ao criar tipo de demanda.");
    } finally {
      client.release();
    }
  },

  async update(id: number, data: UpdateTipoDemandaDTO): Promise<TipoDemandaPersistence | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Atualiza o Nome
      const queryTipo = `UPDATE demandas_tipos SET nome = $1 WHERE id = $2 RETURNING id, nome`;
      const resTipo = await client.query(queryTipo, [data.nome, id]);

      if (resTipo.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      // 2. Atualiza o Vínculo (UPSERT ou DELETE)
      if (data.id_formulario) {
        // Se tem ID, insere ou atualiza (Upsert)
        const queryLink = `
            INSERT INTO demandas_tipos_formularios (id_tipo_demanda, id_formulario)
            VALUES ($1, $2)
            ON CONFLICT (id_tipo_demanda) 
            DO UPDATE SET id_formulario = $2
        `;
        await client.query(queryLink, [id, data.id_formulario]);
      } else {
        // Se não tem ID (veio null/0), remove o vínculo existente
        await client.query(
            `DELETE FROM demandas_tipos_formularios WHERE id_tipo_demanda = $1`, 
            [id]
        );
      }

      await client.query('COMMIT');
      return { ...resTipo.rows[0], id_formulario: data.id_formulario || null };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Erro no DemandasTiposRepository.update:", error);
      throw new Error("Falha ao atualizar tipo.");
    } finally {
      client.release();
    }
  },

  async delete(id: number): Promise<boolean> {
    try {
      // O ON DELETE CASCADE no banco já deve cuidar do vínculo, mas deletamos o tipo pai.
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