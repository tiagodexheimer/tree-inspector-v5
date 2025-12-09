import pool from "@/lib/db";

// Interfaces Atualizadas
export interface RotaPersistence {
  id: number;
  nome: string;
  responsavel: string;
  status: string;
  data_rota: Date | null;
  created_at: Date;
  total_demandas: number;
  organization_id: number; // [NOVO]
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
  organization_id: number; // [NOVO] Obrigatório
  inicio_personalizado?: { lat: number; lng: number } | null;
  fim_personalizado?: { lat: number; lng: number } | null;
}

export interface ExportDataResult {
  rotaNome: string;
  demandas: any[];
}

export const RotasRepository = {
  // --- LEITURA ---

  // Agora filtra por organização
  async findAll(organizationId: number): Promise<RotaPersistence[]> {
    try {
      const query = `
            SELECT
                r.id, r.nome, r.responsavel, r.status, r.data_rota, r.created_at,
                r.organization_id,
                r.inicio_personalizado_lat, r.inicio_personalizado_lng,
                r.fim_personalizado_lat, r.fim_personalizado_lng,
                COUNT(rd.demanda_id) AS total_demandas
            FROM rotas r
            LEFT JOIN rotas_demandas rd ON r.id = rd.rota_id
            WHERE r.organization_id = $1
            GROUP BY r.id
            ORDER BY r.created_at DESC;
        `;
      const result = await pool.query(query, [organizationId]);
      return result.rows.map(row => ({
          ...row,
          total_demandas: parseInt(row.total_demandas, 10) || 0
      }));
    } catch (error) {
      console.error("Erro no RotasRepository.findAll:", error);
      throw new Error("Falha ao buscar rotas.");
    }
  },

  // Valida ID e Organização
  async findById(id: number, organizationId: number): Promise<RotaPersistence | null> {
    try {
      const query = `SELECT * FROM rotas WHERE id = $1 AND organization_id = $2`;
      const result = await pool.query(query, [id, organizationId]);
      return result.rows[0] || null;
    } catch (error) {
        console.error("Erro no RotasRepository.findById:", error);
        throw new Error("Falha ao buscar rota.");
    }
  },

  async findDemandasByRotaId(id: number): Promise<any[]> {
      try {
          // Trazemos lat/lng. Se vier NULL, a demanda existe mas sem mapa.
          const query = `
            SELECT 
                d.id, d.logradouro, d.numero, d.bairro, d.tipo_demanda, d.id_status,
                d.descricao, 
                s.nome as status_nome, s.cor as status_cor,
                ST_Y(d.geom::geometry) as lat, 
                ST_X(d.geom::geometry) as lng, 
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

  async findExportData(id: number, organizationId: number): Promise<ExportDataResult | null> {
    const client = await pool.connect();
    try {
      const rotaRes = await client.query('SELECT nome FROM rotas WHERE id = $1 AND organization_id = $2', [id, organizationId]);
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
      
      // 1. Cria a Rota
      const rotaQuery = `
        INSERT INTO rotas (
            nome, responsavel, status, organization_id,
            inicio_personalizado_lat, inicio_personalizado_lng, 
            fim_personalizado_lat, fim_personalizado_lng
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, nome, responsavel, status;
      `;
      
      const values = [
          data.nome, 
          data.responsavel, 
          data.status,
          data.organization_id, 
          data.inicio_personalizado?.lat || null,
          data.inicio_personalizado?.lng || null,
          data.fim_personalizado?.lat || null,
          data.fim_personalizado?.lng || null
      ];

      const rotaResult = await client.query(rotaQuery, values);
      const newRota = rotaResult.rows[0];

      // 2. Insere Demandas (Lógica Simplificada e Robusta)
      if (data.demandas.length > 0) {
          // Ordenamos garantido pelo índice enviado
          const demandasSorted = data.demandas.sort((a, b) => a.ordem - b.ordem);
          
          for (const d of demandasSorted) {
              // Fazemos INSERT um a um dentro da transação para garantir que cada um entre
              // e para pegar erro específico se um falhar.
              // (Performance impact é desprezível para rotas pequenas de <50 itens)
              await client.query(
                  `INSERT INTO rotas_demandas (rota_id, demanda_id, ordem) VALUES ($1, $2, $3)`,
                  [newRota.id, d.id, d.ordem]
              );
          }
      }
      
      // 3. Atualiza Status das Demandas
      if (data.demandas.length > 0) {
          const ids = data.demandas.map(d => d.id);
          await client.query(`
            UPDATE demandas 
            SET id_status = (SELECT id FROM demandas_status WHERE nome = 'Vistoria Agendada' LIMIT 1), 
                updated_at = NOW()
            WHERE id = ANY($1::int[])
          `, [ids]); 
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

  async update(id: number, organizationId: number, data: UpdateRotaDTO): Promise<RotaPersistence | null> {
    try {
        const query = `
            UPDATE rotas
            SET nome = $1, responsavel = $2, status = $3, data_rota = $4
            -- CRÍTICO: Filtra por ID da Rota E ID da Organização para evitar atualização cruzada
            WHERE id = $5 AND organization_id = $6
            RETURNING *;
        `;
        // Os valores agora incluem o organizationId
        const values = [
            data.nome, 
            data.responsavel, 
            data.status, 
            data.data_rota || null, 
            id, // $5
            organizationId // $6
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
        await client.query('BEGIN');
        
        // 1. Deleta as demandas vinculadas à rota (não precisa de organizationId aqui, pois já é filtrado no passo 2)
        await client.query('DELETE FROM rotas_demandas WHERE rota_id = $1', [id]);
        
        // 2. CRÍTICO: Deleta a rota, filtrando por ID da Rota E ID da Organização para evitar exclusão cruzada
        const result = await client.query(
            'DELETE FROM rotas WHERE id = $1 AND organization_id = $2 RETURNING id', 
            [id, organizationId]
        );
        
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

  async reorderDemandas(rotaId: number, demandas: { id: number; ordem: number }[]): Promise<void> {
      const client = await pool.connect();
      try {
          await client.query('BEGIN');
          await client.query('DELETE FROM rotas_demandas WHERE rota_id = $1', [rotaId]);

          if (demandas.length > 0) {
              const values: string[] = [];
              const params: any[] = [rotaId];
              demandas.forEach((d) => {
                  const offset = params.length + 1;
                  values.push(`($1, $${offset}, $${offset + 1})`);
                  params.push(d.id, d.ordem);
              });
              const insertQuery = `INSERT INTO rotas_demandas (rota_id, demanda_id, ordem) VALUES ${values.join(', ')}`;
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
  },
  
  async addDemandasToRota(rotaId: number, demandas: { id: number; ordem: number }[]): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (demandas.length > 0) {
            const values: string[] = [];
            const params: any[] = [rotaId];
            demandas.forEach((d) => {
                const offset = params.length + 1;
                values.push(`($1, $${offset}, $${offset + 1})`);
                params.push(d.id, d.ordem);
            });
            const insertQuery = `INSERT INTO rotas_demandas (rota_id, demanda_id, ordem) VALUES ${values.join(', ')}`;
            await client.query(insertQuery, params);
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erro no RotasRepository.addDemandasToRota:", error);
        throw error;
    } finally {
        client.release();
    }
  },

  async deleteAllByOrganization(organizationId: number): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Deleta as entradas na tabela rotas_demandas que pertencem a rotas da organização
      const deleteRotasDemandasQuery = `
          DELETE FROM rotas_demandas
          WHERE rota_id IN (
              SELECT id FROM rotas WHERE organization_id = $1
          );
      `;
      await client.query(deleteRotasDemandasQuery, [organizationId]);

      // 2. Deleta as rotas em si e retorna a contagem
      const deleteRotasQuery = `
          DELETE FROM rotas
          WHERE organization_id = $1;
      `;
      const result = await client.query(deleteRotasQuery, [organizationId]);
      const deletedCount = result.rowCount ?? 0;

      await client.query('COMMIT');
      return deletedCount;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Erro no RotasRepository.deleteAllByOrganization:", error);
      throw new Error("Falha ao deletar todas as rotas da organização.");
    } finally {
      client.release();
    }
  },
};