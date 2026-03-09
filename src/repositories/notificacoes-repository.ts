import pool from "@/lib/db";

export interface CreateNotificacaoDTO {
  organization_id: number;
  demanda_id?: number | null;
  numero_processo: string;
  numero_notificacao?: string | null;
  descricao?: string | null;
  data_emissao?: Date | string;
  prazo_dias: number;
  vencimento: Date | string;
  status?: string;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  lat?: number | null;
  lng?: number | null;
  fotos?: any[];
}

export const NotificacoesRepository = {
  async create(data: CreateNotificacaoDTO) {
    const query = `
      INSERT INTO notificacoes (
        organization_id, demanda_id, numero_processo, numero_notificacao, descricao,
        data_emissao, prazo_dias, vencimento, status,
        logradouro, numero, bairro, cidade, uf, cep, geom, fotos
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        CASE 
          WHEN $16::float IS NOT NULL AND $17::float IS NOT NULL 
          THEN ST_SetSRID(ST_MakePoint($17, $16), 4326) 
          ELSE NULL 
        END,
        $18::jsonb
      )
      RETURNING *, ST_AsGeoJSON(geom) as geom, ST_Y(geom::geometry) as lat, ST_X(geom::geometry) as lng;
    `;

    const values = [
      data.organization_id,
      data.demanda_id || null,
      data.numero_processo,
      data.numero_notificacao || null,
      data.descricao || null,
      data.data_emissao || new Date(),
      data.prazo_dias,
      data.vencimento,
      data.status || 'Pendente',
      data.logradouro || null,
      data.numero || null,
      data.bairro || null,
      data.cidade || null,
      data.uf || null,
      data.cep || null,
      data.lat || null,
      data.lng || null,
      JSON.stringify(data.fotos || [])
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async findByDemanda(demandaId: number) {
    const query = `
      SELECT *, ST_AsGeoJSON(geom) as geom, ST_Y(geom::geometry) as lat, ST_X(geom::geometry) as lng
      FROM notificacoes
      WHERE demanda_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [demandaId]);
    return result.rows;
  },

  async findExpired(organizationId: number) {
    const query = `
      SELECT 
        n.*, 
        ST_AsGeoJSON(n.geom) as geom, 
        ST_Y(n.geom::geometry) as lat, 
        ST_X(n.geom::geometry) as lng,
        d.protocolo as demanda_protocolo
      FROM notificacoes n
      LEFT JOIN demandas d ON n.demanda_id = d.id
      LEFT JOIN demandas_status s ON d.id_status = s.id
      WHERE n.organization_id = $1 
      AND n.vencimento < CURRENT_DATE 
      AND n.status = 'Pendente'
      AND (
        s.id IS NULL OR 
        (s.nome NOT ILIKE 'Concluído' AND s.nome NOT ILIKE 'Concluída' AND s.nome NOT ILIKE 'Concluídas' AND s.nome NOT ILIKE 'Concluido' AND s.nome NOT ILIKE 'Finalizado')
      )
      ORDER BY n.vencimento ASC
    `;
    const result = await pool.query(query, [organizationId]);
    return result.rows;
  },

  async delete(id: number, organizationId: number) {
    const query = `DELETE FROM notificacoes WHERE id = $1 AND organization_id = $2 RETURNING id`;
    const result = await pool.query(query, [id, organizationId]);
    return (result.rowCount ?? 0) > 0;
  },

  async update(id: number, organizationId: number, data: Partial<CreateNotificacaoDTO>) {
    const query = `
      UPDATE notificacoes 
      SET 
        numero_processo = $1,
        numero_notificacao = $2,
        descricao = $3,
        data_emissao = $4,
        prazo_dias = $5,
        vencimento = $6,
        fotos = $7::jsonb,
        updated_at = NOW()
      WHERE id = $8 AND organization_id = $9
      RETURNING *
    `;
    const values = [
      data.numero_processo,
      data.numero_notificacao || null,
      data.descricao || null,
      data.data_emissao || new Date(),
      data.prazo_dias,
      data.vencimento,
      JSON.stringify(data.fotos || []),
      id,
      organizationId
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async updateStatus(id: number, organizationId: number, status: string) {
    const query = `
      UPDATE notificacoes 
      SET status = $1, updated_at = NOW() 
      WHERE id = $2 AND organization_id = $3 
      RETURNING id
    `;
    const result = await pool.query(query, [status, id, organizationId]);
    return (result.rowCount ?? 0) > 0;
  },

  async updateStatusByDemanda(demandaId: number, organizationId: number, status: string) {
    const query = `
      UPDATE notificacoes 
      SET status = $1, updated_at = NOW() 
      WHERE demanda_id = $2 AND organization_id = $3 AND status = 'Pendente'
      RETURNING id
    `;
    const result = await pool.query(query, [status, demandaId, organizationId]);
    return (result.rowCount ?? 0) > 0;
  }
};
