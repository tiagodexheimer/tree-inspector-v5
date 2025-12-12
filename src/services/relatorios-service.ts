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
  async listarRelatorios() {
    return await RelatoriosRepository.findAll();
  },

  async obterDetalhesRelatorio(id: number) {
    // Assumindo que findById retorna organization_id
    const relatorio = await RelatoriosRepository.findById(id) as (RelatorioDetalhesPersistence | null);
    if (!relatorio) throw new Error("Relatório não encontrado.");

    
    let definicaoCampos = [];
    
    // 1. [FIX CRÍTICO] Busca o tipo de demanda usando o contexto da organização
    // Isso garante que ele encontre o tipo customizado da ORG ou o global.
    const tipo = await DemandasTiposRepository.findByNameAndOrg(
        relatorio.tipo_demanda, 
        relatorio.organization_id // Usa o ID da organização do relatório
    );
    
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
            // [Nota: O driver de DB deve estar retornando isso como um objeto JS, não string]
            definicaoCampos = resForm.rows[0].definicao_campos;
        }
    }

    return { ...relatorio, definicaoCampos };
  }
};