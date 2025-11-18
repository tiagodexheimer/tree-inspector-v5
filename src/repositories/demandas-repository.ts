import pool from "@/lib/db";

// DTO para criação
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

// Parâmetros de busca
export interface FindDemandasParams {
  page: number;
  limit: number;
  filtro?: string;
  statusIds?: number[];
  tipoNomes?: string[];
}

export const DemandasRepository = {
  // --- LEITURA (findAll com Filtros) ---
  async findAll(params: FindDemandasParams): Promise<{ demandas: any[]; totalCount: number }> {
    const { page, limit, filtro, statusIds, tipoNomes } = params;
    const offset = (page - 1) * limit;

    // Construção Dinâmica do WHERE
    const whereClauses: string[] = [];
    const values: any[] = [];
    let counter = 1;

    // Filtro de Texto (Busca em vários campos)
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

    // Filtro de Status (Array de IDs)
    if (statusIds && statusIds.length > 0) {
      whereClauses.push(`d.id_status = ANY($${counter}::int[])`);
      values.push(statusIds);
      counter++;
    }

    // Filtro de Tipos (Array de Nomes)
    if (tipoNomes && tipoNomes.length > 0) {
      whereClauses.push(`d.tipo_demanda = ANY($${counter}::text[])`);
      values.push(tipoNomes);
      counter++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 1. Query de Contagem (Total para paginação)
    const countQuery = `SELECT COUNT(d.id) AS count FROM demandas d ${whereSql}`;
    const countResult = await pool.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // 2. Query de Dados
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

    return { 
      demandas: result.rows, 
      totalCount 
    };
  },

  // --- ESCRITA (Create) ---
  async create(data: CreateDemandaDTO): Promise<any> {
    try {
      const query = `
        INSERT INTO demandas (
            protocolo, nome_solicitante, telefone_solicitante, email_solicitante,
            cep, logradouro, numero, complemento, bairro, cidade, uf,
            tipo_demanda, descricao, id_status, geom, prazo
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
            CASE 
              WHEN $15::float IS NOT NULL AND $16::float IS NOT NULL 
              THEN ST_SetSRID(ST_MakePoint($16, $15), 4326) -- (Lng, Lat)
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
        data.lat, // $15
        data.lng, // $16
        data.prazo
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error("Erro no DemandasRepository.create:", error);
      throw new Error("Falha ao inserir demanda no banco.");
    }
  }
};