// src/repositories/relatorios-repository.ts
import pool from "@/lib/db";

export const RelatoriosRepository = {
  async findAll() {
    const query = `
      SELECT 
        v.id,
        v.demanda_id,
        d.protocolo,
        d.tipo_demanda,
        d.logradouro || ', ' || d.numero || ' - ' || COALESCE(d.bairro, '') AS endereco,
        v.data_realizacao,
        u.name as responsavel_tecnico
      FROM vistorias_realizadas v
      JOIN demandas d ON v.demanda_id = d.id
      -- Tenta pegar o responsável da rota, se houver (opcional, depende da sua regra de negócio)
      LEFT JOIN rotas_demandas rd ON d.id = rd.demanda_id
      LEFT JOIN rotas r ON rd.rota_id = r.id
      LEFT JOIN users u ON r.responsavel = u.name -- ou outra lógica de vinculo de usuário
      ORDER BY v.data_realizacao DESC
    `;
    const result = await pool.query(query);
    return result.rows;
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