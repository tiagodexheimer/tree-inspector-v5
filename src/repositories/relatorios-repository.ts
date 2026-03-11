// src/repositories/relatorios-repository.ts
import pool from "@/lib/db";

export const RelatoriosRepository = {
  // Alteração 1: Receber organizationId e filtros opcionais
  async findAll(organizationId: number, filters?: { rua?: string, bairro?: string, numero?: string }) {
    let query = `
      SELECT DISTINCT ON (v.id)
        v.id,
        v.demanda_id,
        d.protocolo,
        d.tipo_demanda,
        d.logradouro || ', ' || d.numero || ' - ' || COALESCE(d.bairro, '') AS endereco,
        v.data_realizacao,
        u.name as responsavel_tecnico
      FROM vistorias_realizadas v
      JOIN demandas d ON v.demanda_id = d.id
      -- Joins para pegar o técnico
      LEFT JOIN rotas_demandas rd ON d.id = rd.demanda_id
      LEFT JOIN rotas r ON rd.rota_id = r.id
      LEFT JOIN users u ON r.responsavel = u.name
      
      WHERE d.organization_id = $1 
    `;

    const values: any[] = [organizationId];
    let paramCount = 1;

    if (filters?.rua) {
      paramCount++;
      query += ` AND d.logradouro ILIKE $${paramCount}`;
      values.push(`%${filters.rua}%`);
    }

    if (filters?.bairro) {
      paramCount++;
      query += ` AND d.bairro = $${paramCount}`;
      values.push(filters.bairro);
    }

    if (filters?.numero) {
      paramCount++;
      query += ` AND d.numero = $${paramCount}`;
      values.push(filters.numero);
    }
    
    query += ` ORDER BY v.id, v.data_realizacao DESC`;

    try {
      // Alteração 3: Passar o parâmetro na execução da query
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error("Erro ao buscar relatórios:", error);
      return [];
    }
  },

  async findById(id: number) {
    const query = `
      SELECT 
        v.id,
        v.demanda_id,
        v.respostas,
        v.data_realizacao,
        d.protocolo,
        d.tipo_demanda,
        d.logradouro, d.numero, d.bairro, d.cidade, d.uf, d.cep,
        d.descricao as descricao_demanda,
        d.nome_solicitante,
        d.organization_id
      FROM vistorias_realizadas v
      JOIN demandas d ON v.demanda_id = d.id
      WHERE v.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  async delete(id: number, organizationId: number) {
    // Verifica ownership através da demanda associada
    const query = `
      DELETE FROM vistorias_realizadas v
      USING demandas d
      WHERE v.demanda_id = d.id
      AND v.id = $1
      AND d.organization_id = $2
      RETURNING v.id
    `;
    const result = await pool.query(query, [id, organizationId]);
    return (result.rowCount ?? 0) > 0;
  },
};
