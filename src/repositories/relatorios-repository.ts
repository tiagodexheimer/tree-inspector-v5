// src/repositories/relatorios-repository.ts
import pool from "@/lib/db";

export const RelatoriosRepository = {
  async findAll() {
    // A query antiga duplicava resultados se a demanda estivesse em múltiplas rotas.
    // Usamos DISTINCT ON (v.id) para garantir que cada vistoria apareça uma única vez.
    const query = `
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
      -- Joins para pegar o técnico (pode gerar duplicação sem o DISTINCT)
      LEFT JOIN rotas_demandas rd ON d.id = rd.demanda_id
      LEFT JOIN rotas r ON rd.rota_id = r.id
      LEFT JOIN users u ON r.responsavel = u.name
      -- Ordena pelo ID para o DISTINCT funcionar, depois pela data
      ORDER BY v.id, v.data_realizacao DESC
    `;
    
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error("Erro ao buscar relatórios:", error);
      return []; // Retorna lista vazia em caso de erro para não quebrar o front
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
        d.nome_solicitante
      FROM vistorias_realizadas v
      JOIN demandas d ON v.demanda_id = d.id
      WHERE v.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
};