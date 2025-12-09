import pool from "@/lib/db";

// --- INTERFACES ---

export interface CreateDemandaDTO {
  protocolo: string;
  organization_id: number;
  created_by_user_id?: string;
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

export interface DemandaPersistence {
    id: number;
    protocolo: string;
    organization_id: number;
    nome_solicitante: string;
    telefone_solicitante: string | null;
    email_solicitante: string | null;
    cep: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    tipo_demanda: string;
    descricao: string;
    lat: number | null; 
    lng: number | null;
    id_status: number | null;
    status_nome: string | null;
    status_cor: string | null;
    created_at: Date;
    updated_at: Date;
    prazo: Date | null;
    geom: any;
}

export interface FindDemandasParams {
  page: number;
  limit: number;
  filtro?: string;
  statusIds?: number[];
  tipoNomes?: string[];
  organizationId: number;
}

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

// --- REPOSITÓRIO ---

export const DemandasRepository = {
  
  // 1. Obter Próximo Protocolo
  async getNextProtocoloSequence(): Promise<number> {
      try {
          const result = await pool.query("SELECT nextval('protocolo_seq') as next_val");
          return parseInt(result.rows[0].next_val, 10);
      } catch (error) {
          console.error("Erro ao obter sequência de protocolo:", error);
          // Fallback seguro: pegar timestamp se a sequence falhar
          return Date.now(); 
      }
  },

  // 2. Listar Demandas (Com Filtros e Paginação)
  async findAll(params: FindDemandasParams): Promise<{ demandas: any[]; totalCount: number }> {
    const { page, limit, filtro, statusIds, tipoNomes, organizationId } = params;
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const values: any[] = [];
    let counter = 1;

    // Filtro de Organização (Obrigatório)
    whereClauses.push(`d.organization_id = $${counter}`);
    values.push(organizationId);
    counter++;

    // Filtro de Texto
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
    
    // Filtro de Status
    if (statusIds && statusIds.length > 0) {
      whereClauses.push(`d.id_status = ANY($${counter}::int[])`);
      values.push(statusIds);
      counter++;
    }
    
    // Filtro de Tipo
    if (tipoNomes && tipoNomes.length > 0) {
      whereClauses.push(`d.tipo_demanda = ANY($${counter}::text[])`);
      values.push(tipoNomes);
      counter++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    
    // Contagem Total
    const countQuery = `SELECT COUNT(d.id) AS count FROM demandas d ${whereSql}`;
    const countResult = await pool.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Consulta Principal
    const query = `
      SELECT
        d.id, d.protocolo, d.organization_id, 
        d.nome_solicitante, d.telefone_solicitante, d.email_solicitante,
        d.cep, d.logradouro, d.numero, d.complemento, d.bairro, d.cidade, d.uf,
        d.tipo_demanda, d.descricao, d.prazo, d.created_at, d.updated_at,
        d.id_status,
        s.nome as status_nome, 
        s.cor as status_cor,   
        ST_AsGeoJSON(d.geom) as geom,
        ST_Y(d.geom::geometry) as lat, 
        ST_X(d.geom::geometry) as lng
      FROM demandas d
      LEFT JOIN demandas_status s ON d.id_status = s.id
      ${whereSql}
      ORDER BY d.created_at DESC
      LIMIT $${counter} OFFSET $${counter + 1}
    `;

    const result = await pool.query(query, [...values, limit, offset]);
    return { demandas: result.rows, totalCount };
  },

  // 3. Criar Demanda (CORRIGIDO SEM RETICÊNCIAS)
  async create(data: CreateDemandaDTO): Promise<any> {
    const query = `
        INSERT INTO demandas (
            protocolo, organization_id, nome_solicitante, telefone_solicitante, email_solicitante,
            cep, logradouro, numero, complemento, bairro, cidade, uf,
            tipo_demanda, descricao, id_status, geom, prazo, created_by_user_id
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
            CASE 
              WHEN $16::float IS NOT NULL AND $17::float IS NOT NULL 
              THEN ST_SetSRID(ST_MakePoint($17, $16), 4326) 
              ELSE NULL 
            END, 
            $18, $19
        )
        RETURNING *, ST_AsGeoJSON(geom) as geom, ST_Y(geom::geometry) as lat, ST_X(geom::geometry) as lng;
      `;
      
    const values = [
      data.protocolo,
      data.organization_id, 
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
      data.lat, // Latitude
      data.lng, // Longitude
      data.prazo,
      data.created_by_user_id
    ];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error("Erro no DemandasRepository.create:", error);
        throw error;
    }
  },

  // 4. Buscar por ID
  async findById(id: number): Promise<any | null> {
    const query = `
        SELECT 
            d.*, 
            ST_AsGeoJSON(d.geom) as geom, 
            ST_Y(d.geom::geometry) as lat, 
            ST_X(d.geom::geometry) as lng,
            s.nome as status_nome,
            s.cor as status_cor
        FROM demandas d
        LEFT JOIN demandas_status s ON d.id_status = s.id
        WHERE d.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  // 5. Atualizar Demanda
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
              THEN ST_SetSRID(ST_MakePoint($16, $15), 4326)
              ELSE geom 
            END,
            updated_at = NOW()
        WHERE id = $14
        RETURNING *, ST_Y(geom::geometry) as lat, ST_X(geom::geometry) as lng;
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
        id, 
        data.lat, 
        data.lng
      ];

      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Erro no DemandasRepository.update:", error);
      throw new Error("Falha ao atualizar demanda.");
    }
  },

  // 6. Deletar (Individual)
  async delete(id: number): Promise<boolean> {
    const query = "DELETE FROM demandas WHERE id = $1 RETURNING id";
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  },

  // 7. Atualizar Status (Individual)
  async updateStatus(id: number, idStatus: number): Promise<boolean> {
    const query = `UPDATE demandas SET id_status = $1, updated_at = NOW() WHERE id = $2 RETURNING id`;
    const result = await pool.query(query, [idStatus, id]);
    return (result.rowCount ?? 0) > 0;
  },

  // 8. Atualizar Status por Nome (Em Lote)
  async updateStatusByName(ids: number[], statusName: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Atenção: Em ambiente multi-tenant, statusName pode ser ambíguo se organizações diferentes tiverem status com mesmo nome.
        // O ideal é filtrar por organization_id aqui também, se disponível. 
        // Assumindo status globais ou padrão por enquanto.
        const statusRes = await client.query("SELECT id FROM demandas_status WHERE nome = $1 LIMIT 1", [statusName]);
        
        if (statusRes.rows.length === 0) throw new Error(`Status "${statusName}" não encontrado.`);
        const idStatus = statusRes.rows[0].id;

        await client.query(`UPDATE demandas SET id_status = $1, updated_at = NOW() WHERE id = ANY($2::int[])`, [idStatus, ids]);
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
  },

  // 9. Deletar em Lote (Com proteção de FK)
  async deleteMany(ids: number[]): Promise<void> {
    try {
      await pool.query(`DELETE FROM demandas WHERE id = ANY($1)`, [ids]);
    } catch (error: any) {
      if (error.code === "23503") throw new Error("Não é possível excluir demandas vinculadas a rotas.");
      throw error;
    }
  },

  // 10. Listar Demandas Sem Rota (Para o modal de Criar Rota)
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
            WHERE rd.demanda_id IS NULL -- Filtra onde não há associação com rotas
            AND d.organization_id = $1  -- [NOVO] Filtra pela organização
            ORDER BY d.created_at DESC;
        `;
        // Passamos o organizationId como parâmetro para a query
        const result = await pool.query(query, [organizationId]);
        return result.rows;
    } catch (error) {
        console.error("Erro no DemandasRepository.findUndistributed:", error);
        throw new Error("Falha ao buscar demandas não distribuídas.");
    }
  },
};