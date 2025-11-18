import { DemandasTiposRepository, TipoDemandaPersistence } from "@/repositories/demandas-tipos-repository";

interface CreateTipoInput {
  nome?: string;
}

export class DemandasTiposService {
  
  // --- MÉTODOS DE LISTAGEM E CRIAÇÃO ---

  async listAll(): Promise<TipoDemandaPersistence[]> {
    return await DemandasTiposRepository.findAll();
  }

  async createTipo(input: CreateTipoInput): Promise<TipoDemandaPersistence> {
    // Validação de Campos Obrigatórios
    if (!input.nome || input.nome.trim() === '') {
      throw new Error("O nome do tipo de demanda é obrigatório.");
    }

    const nomeLimpo = input.nome.trim();

    // Regra de Negócio: Verificar duplicidade antes de inserir
    const existing = await DemandasTiposRepository.findByName(nomeLimpo);
    if (existing) {
      throw new Error("Já existe um tipo de demanda com este nome.");
    }

    // Persistência
    return await DemandasTiposRepository.create({
      nome: nomeLimpo
    });
  }

  // --- MÉTODOS DE ATUALIZAÇÃO E DELEÇÃO ---

  async updateTipo(id: number, nome?: string): Promise<TipoDemandaPersistence> {
    if (!nome || nome.trim() === '') {
      throw new Error("O nome do tipo de demanda é obrigatório.");
    }
    const nomeLimpo = nome.trim();

    // 1. Verificar se existe
    const current = await DemandasTiposRepository.findById(id);
    if (!current) {
      throw new Error("Tipo de demanda não encontrado.");
    }

    // 2. Verificar duplicidade (apenas se o nome mudou)
    if (current.nome !== nomeLimpo) {
      const existing = await DemandasTiposRepository.findByName(nomeLimpo);
      if (existing) {
        throw new Error("Já existe um tipo de demanda com este nome.");
      }
    }

    // 3. Atualizar
    const updated = await DemandasTiposRepository.update(id, nomeLimpo);
    if (!updated) throw new Error("Erro inesperado ao atualizar.");
    
    return updated;
  }

  async deleteTipo(id: number): Promise<void> {
    // 1. Buscar o tipo para obter o nome (necessário para verificar uso)
    const current = await DemandasTiposRepository.findById(id);
    if (!current) {
      throw new Error("Tipo de demanda não encontrado.");
    }

    // 2. Regra de Negócio: Integridade Referencial (Manual)
    const usageCount = await DemandasTiposRepository.countUsageByName(current.nome);
    if (usageCount > 0) {
      throw new Error(`Não é possível deletar o tipo "${current.nome}" pois ele está associado a ${usageCount} demanda(s).`);
    }

    // 3. Deletar
    const success = await DemandasTiposRepository.delete(id);
    if (!success) throw new Error("Erro ao deletar tipo.");
  }
}

// ESTA É A LINHA QUE O ERRO DIZ QUE ESTÁ FALTANDO:
export const demandasTiposService = new DemandasTiposService();