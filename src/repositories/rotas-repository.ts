import pool from "@/lib/db";

// Interfaces
export interface RotaPersistence {
  id: number;
  nome: string;
  responsavel: string;
  status: string;
  data_rota: Date | null;
  created_at: Date;
  total_demandas: number;
}

export interface UpdateRotaDTO {
  nome?: string;
  responsavel?: string;
  status?: string;
  data_rota?: Date | null;
}

export interface CreateRotaDTO {
  nome: string;
  responsavel: string;
  status: string;
  demandas: { id: number; ordem: number }[];
}

export interface ExportDataResult {
  rotaNome: string;
  demandas: any[];
}

export const RotasRepository = {
  // --- LEITURA ---

  async findAll(): Promise<RotaPersistence[]> {
    try {
      const query = `
            SELECT
                r.id,
                r.nome,
                r.responsavel,
                r.status,
                r.data_rota,
                r.created_at,
                COUNT(rd.demanda_id) AS total_demandas
            FROM
                rotas r
            LEFT JOIN
                rotas_demandas rd ON r.id = rd.rota_id
            GROUP BY
                r.id
            ORDER BY
                r.created_at DESC;
        `;
      const result = await pool.query(query);
      return result.rows.map(row => ({
          ...row,
          total_demandas: parseInt(row.total_demandas, 10) || 0
      }));
    } catch (error) {
      console.error("Erro no RotasRepository.findAll:", error);
      throw new Error("Falha ao buscar rotas.");
    }
  },

  async findById(id: number): Promise<RotaPersistence | null> {
    try {
      const query = `SELECT * FROM rotas WHERE id = $1`;
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
        console.error("Erro no RotasRepository.findById:", error);
        throw new Error("Falha ao buscar rota.");
    }
  },

  async findDemandasByRotaId(id: number): Promise<any[]> {
      try {
          const query = `
            SELECT 
                d.id, d.logradouro, d.numero, d.bairro, d.tipo_demanda, d.id_status,
                d.descricao, 
                s.nome as status_nome, s.cor as status_cor,
                ST_Y(d.geom) as lat, 
                ST_X(d.geom) as lng, 
                dr.ordem
            FROM rotas_demandas dr 
            JOIN demandas d ON dr.demanda_id = d.id
            LEFT JOIN demandas_status s ON d.id_status = s.id
            WHERE dr.rota_id = $1
            ORDER BY dr.ordem ASC
          `;
          const result = await pool.query(query, [id]);
          return result.rows;
      } catch (error) {
          console.error("Erro no RotasRepository.findDemandasByRotaId:", error);
          throw new Error("Falha ao buscar demandas da rota.");
      }
  },

  async findExportData(id: number): Promise<ExportDataResult | null> {
    const client = await pool.connect();
    try {
      const rotaRes = await client.query('SELECT nome FROM rotas WHERE id = $1', [id]);
      if (rotaRes.rowCount === 0) return null;
      
      const rotaNome = rotaRes.rows[0].nome;

      const query = `
            SELECT 
                rd.ordem, d.id, d.tipo_demanda, d.descricao, d.cep, d.logradouro,
                d.numero, d.bairro, d.cidade, d.uf, d.complemento, d.nome_solicitante,
                d.telefone_solicitante, d.email_solicitante, s.nome AS status_nome, d.prazo
            FROM demandas d
            JOIN rotas_demandas rd ON d.id = rd.demanda_id
            LEFT JOIN demandas_status s ON d.id_status = s.id
            WHERE rd.rota_id = $1
            ORDER BY rd.ordem ASC;
      `;
      const demandasRes = await client.query(query, [id]);
      return { rotaNome, demandas: demandasRes.rows };
    } catch (error) {
       console.error("Erro no RotasRepository.findExportData:", error);
       throw new Error("Falha ao buscar dados para exportação.");
    } finally {
       client.release();
    }
  },

  // --- ESCRITA ---

  async create(data: CreateRotaDTO): Promise<{ id: number; nome: string; responsavel: string; status: string }> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const rotaQuery = `
        INSERT INTO rotas (nome, responsavel, status)
        VALUES ($1, $2, $3)
        RETURNING id, nome, responsavel, status;
      `;
      const rotaResult = await client.query(rotaQuery, [data.nome, data.responsavel, data.status]);
      const newRota = rotaResult.rows[0];

      if (data.demandas.length > 0) {
          const values: string[] = [];
          const params: any[] = [newRota.id];
          data.demandas.forEach((d) => {
              const offset = params.length + 1;
              values.push(`($1, $${offset}, $${offset + 1})`);
              params.push(d.id, d.ordem);
          });
          const insertQuery = `INSERT INTO rotas_demandas (rota_id, demanda_id, ordem) VALUES ${values.join(", ")}`;
          await client.query(insertQuery, params);
      }
      await client.query("COMMIT");
      return newRota;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro no RotasRepository.create:", error);
      throw error;
    } finally {
      client.release();
    }
  },

  async update(id: number, data: UpdateRotaDTO): Promise<RotaPersistence | null> {
      try {
          const query = `
            UPDATE rotas
            SET nome = $1, responsavel = $2, status = $3, data_rota = $4
            WHERE id = $5
            RETURNING *;
          `;
          const values = [data.nome, data.responsavel, data.status, data.data_rota || null, id];
          const result = await pool.query(query, values);
          return result.rows[0] || null;
      } catch (error) {
          console.error("Erro no RotasRepository.update:", error);
          throw new Error("Falha ao atualizar rota.");
      }
  },

  async delete(id: number): Promise<boolean> {
      const client = await pool.connect();
      try {
          await client.query('BEGIN');
          await client.query('DELETE FROM rotas_demandas WHERE rota_id = $1', [id]);
          const result = await client.query('DELETE FROM rotas WHERE id = $1 RETURNING id', [id]);
          await client.query('COMMIT');
          return (result.rowCount ?? 0) > 0;
      } catch (error) {
          await client.query('ROLLBACK');
          console.error("Erro no RotasRepository.delete:", error);
          throw new Error("Falha ao deletar rota.");
      } finally {
          client.release();
      }
  },

  // [NOVO] Reordenar Demandas
  async reorderDemandas(rotaId: number, demandas: { id: number; ordem: number }[]): Promise<void> {
      const client = await pool.connect();
      try {
          await client.query('BEGIN');

          // 1. Limpa associações antigas da rota
          await client.query('DELETE FROM rotas_demandas WHERE rota_id = $1', [rotaId]);

          // 2. Insere novamente com a nova ordem
          if (demandas.length > 0) {
              const values: string[] = [];
              const params: any[] = [rotaId];
              
              demandas.forEach((d) => {
                  const offset = params.length + 1;
                  values.push(`($1, $${offset}, $${offset + 1})`);
                  params.push(d.id, d.ordem);
              });

              const insertQuery = `
                  INSERT INTO rotas_demandas (rota_id, demanda_id, ordem)
                  VALUES ${values.join(', ')}
              `;
              await client.query(insertQuery, params);
          }

          await client.query('COMMIT');
      } catch (error) {
          await client.query('ROLLBACK');
          console.error("Erro no RotasRepository.reorderDemandas:", error);
          throw new Error("Falha ao reordenar demandas.");
      } finally {
          client.release();
      }
  }
};