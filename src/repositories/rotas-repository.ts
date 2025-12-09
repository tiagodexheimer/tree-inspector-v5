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
  organization_id: number;
  // Campos de personalização
  inicio_personalizado_lat?: number;
  inicio_personalizado_lng?: number;
  fim_personalizado_lat?: number;
  fim_personalizado_lng?: number;
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
  inicio_personalizado?: { lat: number; lng: number } | null;
  fim_personalizado?: { lat: number; lng: number } | null;
  organization_id?: number;
}

export interface ExportDataResult {
  rotaNome: string;
  demandas: any[];
}

export const RotasRepository = {
  // --- LEITURA ---

  async findAll(organizationId: number): Promise<RotaPersistence[]> {
    try {
      const query = `
            SELECT
                r.id,
                r.nome,
                r.responsavel,
                r.status,
                r.data_rota,
                r.created_at,
                r.organization_id,
                r.inicio_personalizado_lat,
                r.inicio_personalizado_lng,
                r.fim_personalizado_lat,
                r.fim_personalizado_lng,
                COUNT(rd.demanda_id) AS total_demandas
            FROM
                rotas r
            LEFT JOIN
                rotas_demandas rd ON r.id = rd.rota_id
            WHERE 
                r.organization_id = $1
            GROUP BY
                r.id
            ORDER BY
                r.created_at DESC;
        `;
      const result = await pool.query(query, [organizationId]);
      return result.rows.map((row) => ({
        ...row,
        total_demandas: parseInt(row.total_demandas, 10) || 0,
      }));
    } catch (error) {
      console.error("Erro no RotasRepository.findAll:", error);
      throw new Error("Falha ao buscar rotas.");
    }
  },

  async findById(
    id: number,
    organizationId: number
  ): Promise<RotaPersistence | null> {
    try {
      const query = `SELECT * FROM rotas WHERE id = $1 AND organization_id = $2`;
      const result = await pool.query(query, [id, organizationId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Erro no RotasRepository.findById:", error);
      throw new Error("Falha ao buscar rota.");
    }
  },

  async deleteAllByOrganization(_organizationId: number): Promise<void> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Deleta a tabela de junção (embora o ON DELETE CASCADE já deva cuidar)
            await client.query('DELETE FROM rotas_demandas');
            // Deleta Rotas
            await client.query('DELETE FROM rotas');
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error("Erro no deleteAllByOrganization (Rotas):", error);
            throw new Error("Falha ao limpar rotas de teste.");
        } finally {
            client.release();
        }
    },

  async findDemandasByRotaId(
    id: number,
    organizationId: number
  ): Promise<any[]> {
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
            WHERE dr.rota_id = $1 AND d.organization_id = $2
            ORDER BY dr.ordem ASC
          `;
      const result = await pool.query(query, [id, organizationId]);
      return result.rows;
    } catch (error) {
      console.error("Erro no RotasRepository.findDemandasByRotaId:", error);
      throw new Error("Falha ao buscar demandas da rota.");
    }
  },

  async findExportData(
    id: number,
    organizationId: number
  ): Promise<ExportDataResult | null> {
    const client = await pool.connect();
    try {
      const rotaRes = await client.query(
        "SELECT nome FROM rotas WHERE id = $1 AND organization_id = $2",
        [id, organizationId]
      );
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
            WHERE rd.rota_id = $1 AND d.organization_id = $2
            ORDER BY rd.ordem ASC;
      `;
      const demandasRes = await client.query(query, [id, organizationId]);
      return { rotaNome, demandas: demandasRes.rows };
    } catch (error) {
      console.error("Erro no RotasRepository.findExportData:", error);
      throw new Error("Falha ao buscar dados para exportação.");
    } finally {
      client.release();
    }
  },

  // --- ESCRITA ---

  async create(data: CreateRotaDTO) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // [CORREÇÃO] Define o ID da organização com fallback para evitar ReferenceError
      const orgId = data.organization_id || 1;

      const rotaQuery = `
        INSERT INTO rotas (
            nome, responsavel, status, 
            inicio_personalizado_lat, inicio_personalizado_lng, 
            fim_personalizado_lat, fim_personalizado_lng,
            organization_id 
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, nome, responsavel, status;
      `;

      const values = [
        data.nome,
        data.responsavel,
        data.status,
        data.inicio_personalizado?.lat || null,
        data.inicio_personalizado?.lng || null,
        data.fim_personalizado?.lat || null,
        data.fim_personalizado?.lng || null,
        orgId, // Usa a variável definida acima
      ];

      const rotaResult = await client.query(rotaQuery, values);
      const newRota = rotaResult.rows[0];

      if (data.demandas.length > 0) {
        const valuesDemanda: string[] = [];
        const paramsDemanda: any[] = [newRota.id];
        data.demandas.forEach((d) => {
          const offset = paramsDemanda.length + 1;
          valuesDemanda.push(`($1, $${offset}, $${offset + 1})`);
          paramsDemanda.push(d.id, d.ordem);
        });
        const insertQuery = `INSERT INTO rotas_demandas (rota_id, demanda_id, ordem) VALUES ${valuesDemanda.join(
          ", "
        )}`;
        await client.query(insertQuery, paramsDemanda);
      }

      // Atualiza status das demandas
      if (data.demandas.length > 0) {
        const ids = data.demandas.map((d) => d.id);
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");

        // [CORREÇÃO] Usa orgId corretamente na query de update
        const updateStatusQuery = `
            UPDATE demandas 
            SET id_status = (SELECT id FROM demandas_status WHERE nome = 'Vistoria Agendada' AND organization_id = $${
              ids.length + 1
            } LIMIT 1), updated_at = NOW()
            WHERE id IN (${placeholders})
            AND organization_id = $${ids.length + 1}
          `;
        await client.query(updateStatusQuery, [...ids, orgId]);
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

  async update(
    id: number,
    data: UpdateRotaDTO,
    organizationId: number
  ): Promise<RotaPersistence | null> {
    try {
      const query = `
            UPDATE rotas
            SET nome = $1, responsavel = $2, status = $3, data_rota = $4
            WHERE id = $5 AND organization_id = $6
            RETURNING *;
          `;
      const values = [
        data.nome,
        data.responsavel,
        data.status,
        data.data_rota || null,
        id,
        organizationId,
      ];
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Erro no RotasRepository.update:", error);
      throw new Error("Falha ao atualizar rota.");
    }
  },

  async delete(id: number, organizationId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        "DELETE FROM rotas WHERE id = $1 AND organization_id = $2 RETURNING id",
        [id, organizationId]
      );

      await client.query("COMMIT");
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro no RotasRepository.delete:", error);
      throw new Error("Falha ao deletar rota.");
    } finally {
      client.release();
    }
  },

  async reorderDemandas(
    rotaId: number,
    demandas: { id: number; ordem: number }[],
    organizationId: number
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Verifica permissão
      const rotaCheck = await client.query(
        "SELECT id FROM rotas WHERE id = $1 AND organization_id = $2",
        [rotaId, organizationId]
      );
      if (rotaCheck.rowCount === 0) {
        throw new Error("Rota não encontrada ou não pertence à organização.");
      }

      await client.query("DELETE FROM rotas_demandas WHERE rota_id = $1", [
        rotaId,
      ]);

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
                  VALUES ${values.join(", ")}
              `;
        await client.query(insertQuery, params);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro no RotasRepository.reorderDemandas:", error);
      throw new Error("Falha ao reordenar demandas.");
    } finally {
      client.release();
    }
  },

  addDemandasToRota: async (
    rotaId: number,
    demandas: { id: number; ordem: number }[],
    organizationId: number
  ): Promise<void> => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const rotaCheck = await client.query(
        "SELECT id FROM rotas WHERE id = $1 AND organization_id = $2",
        [rotaId, organizationId]
      );
      if (rotaCheck.rowCount === 0) {
        throw new Error("Rota não encontrada ou não pertence à organização.");
      }

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
                VALUES ${values.join(", ")}
            `;
        await client.query(insertQuery, params);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro no RotasRepository.addDemandasToRota:", error);
      throw error;
    } finally {
      client.release();
    }
  },

  async countAllByOrganization(organizationId: number): Promise<number> {
    try {
      const query = `
                SELECT COUNT(id) as count 
                FROM rotas 
                WHERE organization_id = $1
            `;
      const result = await pool.query(query, [organizationId]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error("Erro ao contar rotas por organização:", error);
      return 0; // Falha segura
    }
  },

  
};
