import pool from "@/lib/db";

// (Interfaces CreateDemandaDTO e FindDemandasParams mantidas...)
export interface CreateDemandaDTO {
  protocolo: string;
  nome_solicitante: string;
  telefone_solicitante: string | null;
  email_solicitante: string | null;
  cep: string;
  logradouro: string | null;
  numero: string;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  tipo_demanda: string;
  descricao: string;
  id_status: number | null;
  lat: number | null;
  lng: number | null;
  prazo: Date | null;
}

export interface FindDemandasParams {
  page: number;
  limit: number;
  filtro?: string;
  statusIds?: number[];
  tipoNomes?: string[];
}

// DTO para Atualização (parcial ou total)
export interface UpdateDemandaDTO {
  nome_solicitante: string;
  telefone_solicitante: string | null;
  email_solicitante: string | null;
  cep: string;
  logradouro: string | null;
  numero: string;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  tipo_demanda: string;
  descricao: string;
  lat: number | null;
  lng: number | null;
  prazo: Date | null;
}

export const DemandasRepository = {
  // ... (mantenha findAll e create aqui) ...

  // --- LEITURA (findAll com Filtros) ---
  async findAll(
    params: FindDemandasParams
  ): Promise<{ demandas: any[]; totalCount: number }> {
    // ... (código existente do findAll)
    const { page, limit, filtro, statusIds, tipoNomes } = params;
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const values: any[] = [];
    let counter = 1;

    if (filtro) {
      whereClauses.push(`(
        d.nome_solicitante ILIKE $${counter} OR 
        d.descricao ILIKE $${counter} OR 
        d.protocolo ILIKE $${counter} OR
        d.logradouro ILIKE $${counter}
      )`);
      values.push(`%${filtro}%`);
      counter++;
    }
    if (statusIds && statusIds.length > 0) {
      whereClauses.push(`d.id_status = ANY($${counter}::int[])`);
      values.push(statusIds);
      counter++;
    }
    if (tipoNomes && tipoNomes.length > 0) {
      whereClauses.push(`d.tipo_demanda = ANY($${counter}::text[])`);
      values.push(tipoNomes);
      counter++;
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const countQuery = `SELECT COUNT(d.id) AS count FROM demandas d ${whereSql}`;
    const countResult = await pool.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    const query = `
      SELECT
        d.id, d.protocolo, d.nome_solicitante, d.telefone_solicitante, d.email_solicitante,
        d.cep, d.logradouro, d.numero, d.complemento, d.bairro, d.cidade, d.uf,
        d.tipo_demanda, d.descricao, d.prazo, d.created_at, d.updated_at,
        d.id_status,
        s.nome as status_nome, 
        s.cor as status_cor,   
        ST_AsGeoJSON(d.geom) as geom,
        ST_Y(d.geom) as lat, 
        ST_X(d.geom) as lng
      FROM demandas d
      LEFT JOIN demandas_status s ON d.id_status = s.id
      ${whereSql}
      ORDER BY d.created_at DESC
      LIMIT $${counter} OFFSET $${counter + 1}
    `;

    const result = await pool.query(query, [...values, limit, offset]);
    return { demandas: result.rows, totalCount };
  },

  // --- ESCRITA (Create) ---
  async create(data: CreateDemandaDTO): Promise<any> {
    // ... (código existente do create)
    const query = `
        INSERT INTO demandas (
            protocolo, nome_solicitante, telefone_solicitante, email_solicitante,
            cep, logradouro, numero, complemento, bairro, cidade, uf,
            tipo_demanda, descricao, id_status, geom, prazo
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
            CASE 
              WHEN $15::float IS NOT NULL AND $16::float IS NOT NULL 
              THEN ST_SetSRID(ST_MakePoint($16, $15), 4326) 
              ELSE NULL 
            END, 
            $17
        )
        RETURNING *, ST_AsGeoJSON(geom) as geom, ST_Y(geom) as lat, ST_X(geom) as lng;
      `;
    const values = [
      data.protocolo,
      data.nome_solicitante,
      data.telefone_solicitante,
      data.email_solicitante,
      data.cep,
      data.logradouro,
      data.numero,
      data.complemento,
      data.bairro,
      data.cidade,
      data.uf,
      data.tipo_demanda,
      data.descricao,
      data.id_status,
      data.lat,
      data.lng,
      data.prazo,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // [NOVO] Buscar por ID (útil para validações)
  async findById(id: number): Promise<any | null> {
    const result = await pool.query("SELECT id FROM demandas WHERE id = $1", [
      id,
    ]);
    return result.rows[0] || null;
  },

  // [NOVO] Atualizar
  async update(id: number, data: UpdateDemandaDTO): Promise<any | null> {
    try {
      const query = `
        UPDATE demandas SET
            nome_solicitante = $1,
            telefone_solicitante = $2,
            email_solicitante = $3,
            cep = $4,
            logradouro = $5,
            numero = $6,
            complemento = $7,
            bairro = $8,
            cidade = $9,
            uf = $10,
            tipo_demanda = $11,
            descricao = $12,
            prazo = $13,
            geom = CASE 
              WHEN $15::float IS NOT NULL AND $16::float IS NOT NULL 
              THEN ST_SetSRID(ST_MakePoint($16, $15), 4326) -- (Lng, Lat)
              ELSE geom -- Mantém o geom antigo se não vierem coordenadas novas (ou defina NULL se preferir limpar)
            END
        WHERE id = $14
        RETURNING *, ST_Y(geom) as lat, ST_X(geom) as lng;
      `;

      const values = [
        data.nome_solicitante,
        data.telefone_solicitante,
        data.email_solicitante,
        data.cep,
        data.logradouro,
        data.numero,
        data.complemento,
        data.bairro,
        data.cidade,
        data.uf,
        data.tipo_demanda,
        data.descricao,
        data.prazo,
        id, // $14
        data.lat, // $15
        data.lng, // $16
      ];

      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Erro no DemandasRepository.update:", error);
      throw new Error("Falha ao atualizar demanda.");
    }
  },

 async updateStatusByName(ids: number[], statusName: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Busca o ID do status pelo nome
        const statusRes = await client.query(
            "SELECT id FROM demandas_status WHERE nome = $1", 
            [statusName]
        );

        if (statusRes.rows.length === 0) {
            throw new Error(`Status "${statusName}" não encontrado para atualização.`);
        }
        const idStatus = statusRes.rows[0].id;

        // 2. Atualiza as demandas em lote
        const query = `
            UPDATE demandas 
            SET id_status = $1, updated_at = NOW()
            WHERE id = ANY($2::int[])
        `;
        await client.query(query, [idStatus, ids]);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erro no DemandasRepository.updateStatusByName:", error);
        throw new Error("Falha ao atualizar status das demandas em lote.");
    } finally {
        client.release();
    }
  },

  // [NOVO] Deletar
  async delete(id: number): Promise<boolean> {
    try {
      const query = "DELETE FROM demandas WHERE id = $1 RETURNING id";
      const result = await pool.query(query, [id]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Erro no DemandasRepository.delete:", error);
      throw new Error("Falha ao deletar demanda.");
    }
  },
  // [NOVO] Atualizar apenas o Status
  async updateStatus(id: number, idStatus: number): Promise<boolean> {
    try {
      const query = `
        UPDATE demandas 
        SET id_status = $1, updated_at = NOW() 
        WHERE id = $2 
        RETURNING id
      `;
      const result = await pool.query(query, [idStatus, id]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Erro no DemandasRepository.updateStatus:", error);
      throw new Error("Falha ao atualizar status da demanda.");
    }
  },
  // Adicione dentro do objeto DemandasRepository

  async deleteMany(ids: number[]): Promise<void> {
    try {
      const query = `DELETE FROM demandas WHERE id = ANY($1)`;
      await pool.query(query, [ids]);
    } catch (error: any) {
      // Tratamento específico para erro de chave estrangeira (código 23503)
      if (error.code === "23503") {
        throw new Error(
          "Não é possível excluir uma ou mais demandas pois elas estão vinculadas a rotas ativas. Remova-as das rotas antes de excluir."
        );
      }

      console.error("Erro no DemandasRepository.deleteMany:", error);
      throw new Error("Falha ao deletar demandas no banco de dados.");
    }
  },
  async findUndistributed(): Promise<any[]> {
        try {
            const query = `
                SELECT
                    d.id, d.protocolo, d.nome_solicitante, d.tipo_demanda, d.descricao,
                    d.logradouro, d.numero, d.bairro, d.cidade, d.uf,
                    s.nome as status_nome, 
                    s.cor as status_cor,   
                    ST_Y(d.geom) as lat, 
                    ST_X(d.geom) as lng
                FROM demandas d
                LEFT JOIN rotas_demandas rd ON d.id = rd.demanda_id
                LEFT JOIN demandas_status s ON d.id_status = s.id
                WHERE rd.demanda_id IS NULL -- Filtra onde não há associação com rotas
                ORDER BY d.created_at DESC;
            `;
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error("Erro no DemandasRepository.findUndistributed:", error);
            throw new Error("Falha ao buscar demandas não distribuídas.");
        }
    },
};
