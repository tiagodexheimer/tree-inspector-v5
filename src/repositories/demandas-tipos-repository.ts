// src/repositories/demandas-tipos-repository.ts
import pool from "@/lib/db";

// Interface do dado persistido (AGORA COMPLETA)
export interface TipoDemandaPersistence {
  id: number;
  nome: string;
  id_formulario?: number | null;
  nome_formulario?: string | null;
  // NOVAS COLUNAS
  organization_id: number | null;
  is_custom: boolean;
  is_default_global: boolean;
}

// DTOs
export interface CreateTipoDemandaDTO {
  nome: string;
  id_formulario?: number | null;
  // NOVAS COLUNAS
  organization_id: number; // ID da ORG
  is_custom: boolean;
  is_default_global: boolean;
}

export interface UpdateTipoDemandaDTO {
  nome: string;
  id_formulario?: number | null;
}

// Campos base a serem selecionados em todas as consultas
const BASE_FIELDS = `dt.id, dt.nome, dtf.id_formulario, f.nome AS nome_formulario, dt.organization_id, dt.is_custom, dt.is_default_global`;
const JOIN_FORMULARIO = `
    LEFT JOIN demandas_tipos_formularios dtf ON dt.id = dtf.id_tipo_demanda
    LEFT JOIN formularios f ON dtf.id_formulario = f.id
`;

export const DemandasTiposRepository = {
  // --- MÉTODOS DE LEITURA MULTI-TENANT (READ) ---

  /**
   * [NOVO] Lista Tipos Globais e Customizados da Organização. Usado por planos Pro/Premium.
   */
  async findGlobalAndCustom(
    organizationId: number
  ): Promise<TipoDemandaPersistence[]> {
    try {
      const query = `
        SELECT ${BASE_FIELDS}
        FROM demandas_tipos dt
        ${JOIN_FORMULARIO}
        WHERE dt.organization_id IS NULL OR (dt.organization_id = $1 AND dt.is_custom = TRUE)
        ORDER BY dt.nome
      `;
      const result = await pool.query(query, [organizationId]);
      return result.rows as TipoDemandaPersistence[];
    } catch (error) {
      console.error(
        "Erro no DemandasTiposRepository.findGlobalAndCustom:",
        error
      );
      throw new Error("Falha ao buscar tipos de demanda Pro/Premium.");
    }
  },

  /**
   * [NOVO] Lista Tipos Globais (Padrão) e não-customizados da Organização. Usado por planos Free/Basic.
   */
  async findGlobalAndDefault(
    organizationId: number
  ): Promise<TipoDemandaPersistence[]> {
    try {
      const query = `
        SELECT ${BASE_FIELDS}
        FROM demandas_tipos dt
        ${JOIN_FORMULARIO}
        WHERE dt.organization_id IS NULL OR (dt.organization_id = $1 AND dt.is_custom = FALSE)
        ORDER BY dt.nome
      `;
      const result = await pool.query(query, [organizationId]);
      return result.rows as TipoDemandaPersistence[];
    } catch (error) {
      console.error(
        "Erro no DemandasTiposRepository.findGlobalAndDefault:",
        error
      );
      throw new Error("Falha ao buscar tipos de demanda Padrão.");
    }
  },

  /**
   * [MODIFICADO] Busca por nome dentro do escopo da organização (NULL ou ID) para checagem de unicidade.
   */
  async findByNameAndOrg(
    name: string,
    organizationId: number
  ): Promise<TipoDemandaPersistence | null> {
    try {
      const query = `
        SELECT id, nome, organization_id, is_custom, id_formulario
        FROM demandas_tipos
        WHERE nome = $1
        AND (organization_id = $2 OR organization_id IS NULL)
        ORDER BY organization_id DESC
        LIMIT 1
      `;
      // A cláusula ORDER BY DESC garante que, se houver um customizado E um global com o mesmo nome,
      // o customizado da organização ($2) seja preferido (regra de negócio comum).
      const result = await pool.query(query, [name, organizationId]);
      return (result.rows[0] as TipoDemandaPersistence) || null;
    } catch (error) {
      console.error("Erro no DemandasTiposRepository.findByNameAndOrg:", error);
      throw new Error("Falha ao buscar tipo de demanda por nome.");
    }
  },

  /**
   * [MODIFICADO] Busca por ID, incluindo todas as colunas de permissão.
   */
  async findById(id: number): Promise<TipoDemandaPersistence | null> {
    try {
      const query = `
        SELECT ${BASE_FIELDS}
        FROM demandas_tipos dt
        ${JOIN_FORMULARIO}
        WHERE dt.id = $1
      `;
      const result = await pool.query(query, [id]);
      return (result.rows[0] as TipoDemandaPersistence) || null;
    } catch (error) {
      console.error("Erro no DemandasTiposRepository.findById:", error);
      throw new Error("Falha ao buscar tipo por ID.");
    }
  },

  /**
   * [MODIFICADO] Conta o uso por ID (busca o nome e conta).
   */
  async countUsageById(id: number): Promise<number> {
    try {
      // O service espera que a checagem seja feita antes da deleção.
      // Buscar o nome é necessário porque a tabela `demandas` ainda usa `tipo_demanda TEXT`.
      const tipo = await this.findById(id);
      if (!tipo) return 0;

      const result = await pool.query(
        "SELECT COUNT(*) FROM demandas WHERE tipo_demanda = $1",
        [tipo.nome]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error("Erro no DemandasTiposRepository.countUsageById:", error);
      throw new Error("Falha ao verificar uso do tipo.");
    }
  },

  // --- MÉTODOS DE ESCRITA (WRITE) ---

  /**
   * [MODIFICADO] Inclui organization_id, is_custom e is_default_global no INSERT.
   */
  async create(data: CreateTipoDemandaDTO): Promise<TipoDemandaPersistence> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Cria o Tipo
      const queryTipo = `
        INSERT INTO demandas_tipos (nome, organization_id, is_custom, is_default_global) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id, nome, organization_id, is_custom, is_default_global`;

      const resTipo = await client.query(queryTipo, [
        data.nome,
        data.organization_id,
        data.is_custom,
        data.is_default_global,
      ]);
      const newTipo = resTipo.rows[0];

      // 2. Se houver formulário, cria o vínculo
      if (data.id_formulario) {
        await client.query(
          `INSERT INTO demandas_tipos_formularios (id_tipo_demanda, id_formulario) VALUES ($1, $2)`,
          [newTipo.id, data.id_formulario]
        );
      }

      await client.query("COMMIT");
      return { ...newTipo, id_formulario: data.id_formulario || null };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro no DemandasTiposRepository.create:", error);
      throw new Error("Falha ao criar tipo de demanda.");
    } finally {
      client.release();
    }
  },

  /**
   * [MODIFICADO] Update agora exige organizationId para segurança multi-tenant.
   */
  async update(
    id: number,
    organizationId: number,
    data: UpdateTipoDemandaDTO
  ): Promise<TipoDemandaPersistence | null> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Atualiza o Nome (RESTRIÇÃO MULTI-TENANT: SÓ ATUALIZA O QUE PERTENCE À ORG)
      const queryTipo = `
        UPDATE demandas_tipos 
        SET nome = $1 
        WHERE id = $2 AND organization_id = $3 
        RETURNING id, nome, organization_id, is_custom, is_default_global`;

      const resTipo = await client.query(queryTipo, [
        data.nome,
        id,
        organizationId,
      ]);

      if (resTipo.rowCount === 0) {
        await client.query("ROLLBACK");
        return null; // Não encontrado ou não pertence à ORG
      }

      // 2. Atualiza o Vínculo (UPSERT ou DELETE)
      if (data.id_formulario) {
        // Se tem ID, insere ou atualiza (Upsert)
        const queryLink = `
            INSERT INTO demandas_tipos_formularios (id_tipo_demanda, id_formulario)
            VALUES ($1, $2)
            ON CONFLICT (id_tipo_demanda) 
            DO UPDATE SET id_formulario = $2
        `;
        await client.query(queryLink, [id, data.id_formulario]);
      } else {
        // Se não tem ID (veio null/0), remove o vínculo existente
        await client.query(
          `DELETE FROM demandas_tipos_formularios WHERE id_tipo_demanda = $1`,
          [id]
        );
      }

      await client.query("COMMIT");
      return {
        ...resTipo.rows[0],
        id_formulario: data.id_formulario || null,
      } as TipoDemandaPersistence;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Erro no DemandasTiposRepository.update:", error);
      throw new Error("Falha ao atualizar tipo.");
    } finally {
      client.release();
    }
  },

  /**
   * [MODIFICADO] Delete agora exige organizationId para segurança multi-tenant.
   */
  async delete(id: number, organizationId: number): Promise<boolean> {
    try {
      // Deleta o tipo APENAS se pertencer à organização (o service checa is_custom)
      const result = await pool.query(
        "DELETE FROM demandas_tipos WHERE id = $1 AND organization_id = $2 RETURNING id",
        [id, organizationId]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Erro no DemandasTiposRepository.delete:", error);
      throw new Error("Falha ao deletar tipo.");
    }
  },
};
