// src/services/relatorios-service.ts
import { RelatoriosRepository } from "@/repositories/relatorios-repository";
import { DemandasTiposRepository } from "@/repositories/demandas-tipos-repository";
import db from "@/lib/db"; 

export const RelatoriosService = {
  async listarRelatorios() {
    return await RelatoriosRepository.findAll();
  },

  async obterDetalhesRelatorio(id: number) {
    const relatorio = await RelatoriosRepository.findById(id);
    if (!relatorio) throw new Error("Relatório não encontrado.");

    // Precisamos buscar a definição do formulário para saber os LABELS dos campos
    // (pois no JSON de resposta salvamos apenas { "campo_123": "valor" })
    
    let definicaoCampos = [];
    
    // 1. Busca o tipo de demanda
    const tipo = await DemandasTiposRepository.findByName(relatorio.tipo_demanda);
    
    if (tipo) {
        // 2. Busca o formulário vinculado a este tipo
        // (Poderíamos adicionar um método no repositorio, mas faremos query direta aqui pra agilizar)
        const queryForm = `
            SELECT f.definicao_campos 
            FROM demandas_tipos_formularios dtf
            JOIN formularios f ON dtf.id_formulario = f.id
            WHERE dtf.id_tipo_demanda = $1
        `;
        const resForm = await db.query(queryForm, [tipo.id]);
        if (resForm.rows.length > 0) {
            definicaoCampos = resForm.rows[0].definicao_campos;
        }
    }

    return { ...relatorio, definicaoCampos };
  }
};