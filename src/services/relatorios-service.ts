// src/services/relatorios-service.ts
import { RelatoriosRepository } from "@/repositories/relatorios-repository";
import { DemandasTiposRepository } from "@/repositories/demandas-tipos-repository";
import db from "@/lib/db";


interface RelatorioDetalhesPersistence {
  id: number;
  // ... outros campos
  tipo_demanda: string;
  organization_id: number; // Essencial para a segurança
  // ...
}

export const RelatoriosService = {
  async listarRelatorios(organizationId: number, filters?: { rua?: string, bairro?: string, numero?: string }) {
    return await RelatoriosRepository.findAll(organizationId, filters);
  },

  async obterDetalhesRelatorio(id: number) {
    // Assumindo que findById retorna organization_id
    const relatorio = await RelatoriosRepository.findById(id) as (RelatorioDetalhesPersistence | null);
    if (!relatorio) throw new Error("Relatório não encontrado.");


    let definicaoCampos: any[] = [];

    // [FIX] Buscar formulário usando a MESMA query que o endpoint mobile usa
    // Isso garante consistência entre o formulário usado na vistoria e o usado no relatório
    console.log(`[RelatoriosService] Buscando form para tipo '${relatorio.tipo_demanda}'`);

    try {
      // Query direta: Tipo -> Link -> Form (sem filtro de organização)
      // Isso funciona porque o mobile também usa essa abordagem
      const queryForm = `
        SELECT f.definicao_campos
        FROM demandas_tipos dt
        JOIN demandas_tipos_formularios dtf ON dt.id = dtf.id_tipo_demanda
        JOIN formularios f ON dtf.id_formulario = f.id
        WHERE dt.nome = $1
        LIMIT 1
      `;
      const resForm = await db.query(queryForm, [relatorio.tipo_demanda]);

      if (resForm.rows.length > 0 && resForm.rows[0].definicao_campos) {
        definicaoCampos = resForm.rows[0].definicao_campos;
        console.log(`[RelatoriosService] Definição encontrada: ${Array.isArray(definicaoCampos) ? definicaoCampos.length : 'N/A'} campos.`);
      } else {
        console.warn(`[RelatoriosService] Nenhum formulário vinculado ao tipo '${relatorio.tipo_demanda}'.`);
      }
    } catch (err) {
      console.error(`[RelatoriosService] Erro ao buscar form:`, err);
    }

    return { ...relatorio, definicaoCampos };
  },

  async deleteRelatorio(id: number, organizationId: number) {
    const deleted = await RelatoriosRepository.delete(id, organizationId);
    if (!deleted) {
      throw new Error("Falha ao deletar relatório. Verifique se ele existe e pertence à sua organização.");
    }
    return true;
  }
};