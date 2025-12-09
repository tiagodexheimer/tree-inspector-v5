import pool from "@/lib/db";

// Interfaces
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
  organization_id: number; // [NOVO] Obrigatório
}

export interface DemandaPersistence {
  id: number;
  protocolo: string;
  nome_solicitante: string;
  organization_id: number; // [NOVO]
  lat: number | null;
  lng: number | null;
  status_nome: string | null;
  status_cor: string | null;
  created_at: Date;
  updated_at: Date;
  prazo: Date | null;
  geom: any;
  // ... outros campos podem ser inferidos do banco
}

export interface FindDemandasParams {
  page: number;
  limit: number;
  filtro?: string;
  statusIds?: number[];
  tipoNomes?: string[];
  organizationId: number; // [NOVO] Obrigatório para filtrar
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
  
  async getNextProtocoloSequence(): Promise<number> {
    try {
      const result = await pool.query("SELECT nextval('protocolo_seq') as next_val");
      return parseInt(result.rows[0].next_val, 10);
    } catch (error) {
      console.error("Erro ao obter sequência de protocolo:", error);
      return 0;
    }
  },

  // [NOVO] Conta demandas por organização (Usado para verificar limite do plano Free)
  async countByOrganization(organizationId: number): Promise<number> {
    try {
        const result = await pool.query(
            "SELECT COUNT(*) as count FROM demandas WHERE organization_id = $1", 
            [organizationId]
        );
        return parseInt(result.rows[0].count, 10);
    } catch (error) {
        console.error("Erro no countByOrganization:", error);
        throw new Error("Falha ao contar demandas da organização.");
    }
  },

  // --- LEITURA (findAll com Filtros e Isolamento) ---
  async findAll(
    params: FindDemandasParams
  ): Promise<{ demandas: any[]; totalCount: number }> {
    const { page, limit, filtro, statusIds, tipoNomes, organizationId } = params;
    const offset = (page - 1) * limit;

    // [MODIFICADO] organization_id é o filtro base (segurança)
    const whereClauses: string[] = [`d.organization_id = $1`];
    const values: any[] = [organizationId];
    let counter = 2; // Começa em 2 pois $1 é a organização

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

    const whereSql = `WHERE ${whereClauses.join(" AND ")}`;
    
    // Count Query
    const countQuery = `SELECT COUNT(d.id) AS count FROM demandas d ${whereSql}`;
    const countResult = await pool.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Main Query
    const query = `
      SELECT
        d.id, d.protocolo, d.nome_solicitante, d.telefone_solicitante, d.email_solicitante,
        d.cep, d.logradouro, d.numero, d.complemento, d.bairro, d.cidade, d.uf,
        d.tipo_demanda, d.descricao, d.prazo, d.created_at, d.updated_at,
        d.id_status, d.organization_id,
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

  // --- ESCRITA (Create com Isolamento) ---
  async create(data: CreateDemandaDTO): Promise<any> {
    const query = `
        INSERT INTO demandas (
            protocolo, nome_solicitante, telefone_solicitante, email_solicitante,
            cep, logradouro, numero, complemento, bairro, cidade, uf,
            tipo_demanda, descricao, id_status, geom, prazo, organization_id
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
            CASE 
              WHEN $15::float IS NOT NULL AND $16::float IS NOT NULL 
              THEN ST_SetSRID(ST_MakePoint($16, $15), 4326) 
              ELSE NULL 
            END, 
            $17, $18
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
      data.organization_id // [NOVO] $18
    ];
    
    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error("Erro no DemandasRepository.create:", error);
        throw error;
    }
  },

  // [MODIFICADO] Buscar por ID e Organização (Segurança)
  async findById(id: number, organizationId: number): Promise<any | null> {
    const result = await pool.query(
        "SELECT * FROM demandas WHERE id = $1 AND organization_id = $2", 
        [id, organizationId]
    );
    return result.rows[0] || null;
  },

  // [MODIFICADO] Atualizar com verificação de Organização
  async update(id: number, organizationId: number, data: UpdateDemandaDTO): Promise<any | null> {
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
              THEN ST_SetSRID(ST_MakePoint($16, $15), 4326) 
              ELSE geom 
            END
        WHERE id = $14 AND organization_id = $17 -- [SEGURANÇA]
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
        organizationId // $17
      ];

      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Erro no DemandasRepository.update:", error);
      throw new Error("Falha ao atualizar demanda.");
    }
  },

  // [MODIFICADO] Update Status em lote por nome (apenas da organização)
  async updateStatusByName(ids: number[], statusName: string, organizationId: number): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Busca status da organização
        const statusRes = await client.query(
            "SELECT id FROM demandas_status WHERE nome = $1 AND organization_id = $2", 
            [statusName, organizationId]
        );

        if (statusRes.rows.length === 0) {
            throw new Error(`Status "${statusName}" não encontrado para esta organização.`);
        }
        const idStatus = statusRes.rows[0].id;

        // 2. Atualiza as demandas
        const query = `
            UPDATE demandas 
            SET id_status = $1, updated_at = NOW()
            WHERE id = ANY($2::int[]) AND organization_id = $3
        `;
        await client.query(query, [idStatus, ids, organizationId]);

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erro no DemandasRepository.updateStatusByName:", error);
        throw error;
    } finally {
        client.release();
    }
  },

  // [MODIFICADO] Deletar (Segurança por Org)
  async delete(id: number, organizationId: number): Promise<boolean> {
    try {
      const query = "DELETE FROM demandas WHERE id = $1 AND organization_id = $2 RETURNING id";
      const result = await pool.query(query, [id, organizationId]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Erro no DemandasRepository.delete:", error);
      throw new Error("Falha ao deletar demanda.");
    }
  },

  // [MODIFICADO] Atualizar Status (Segurança por Org)
  async updateStatus(id: number, idStatus: number, organizationId: number): Promise<boolean> {
    try {
      // Verifica se o status pertence à organização (opcional, mas recomendado)
      // O JOIN abaixo garante que a demanda e o status sejam da mesma org ou compatíveis
      const query = `
        UPDATE demandas 
        SET id_status = $1, updated_at = NOW() 
        WHERE id = $2 AND organization_id = $3
        RETURNING id
      `;
      const result = await pool.query(query, [idStatus, id, organizationId]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Erro no DemandasRepository.updateStatus:", error);
      throw new Error("Falha ao atualizar status da demanda.");
    }
  },

  // [MODIFICADO] Deletar em Lote (Segurança por Org)
  async deleteMany(ids: number[], organizationId: number): Promise<void> {
    try {
      const query = `DELETE FROM demandas WHERE id = ANY($1) AND organization_id = $2`;
      await pool.query(query, [ids, organizationId]);
    } catch (error: any) {
      if (error.code === "23503") {
        throw new Error(
          "Não é possível excluir uma ou mais demandas pois elas estão vinculadas a rotas ativas. Remova-as das rotas antes de excluir."
        );
      }
      console.error("Erro no DemandasRepository.deleteMany:", error);
      throw new Error("Falha ao deletar demandas no banco de dados.");
    }
  },

  // [MODIFICADO] Buscar Não Distribuídas (Apenas da Org)
  async findUndistributed(organizationId: number): Promise<any[]> {
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
                WHERE rd.demanda_id IS NULL 
                  AND d.organization_id = $1 -- [NOVO] Filtro
                ORDER BY d.created_at DESC;
            `;
            const result = await pool.query(query, [organizationId]);
            return result.rows;
        } catch (error) {
            console.error("Erro no DemandasRepository.findUndistributed:", error);
            throw new Error("Falha ao buscar demandas não distribuídas.");
        }
    },
};