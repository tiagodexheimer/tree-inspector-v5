// src/services/demandas-tipos-service.ts
import { DemandasTiposRepository, TipoDemandaPersistence } from "@/repositories/demandas-tipos-repository";

// Agora aceita id_formulario opcional
interface CreateTipoInput {
  nome?: string;
  id_formulario?: number | null;
}

export class DemandasTiposService {
  
  async listAll(): Promise<TipoDemandaPersistence[]> {
    return await DemandasTiposRepository.findAll();
  }

  async createTipo(input: CreateTipoInput): Promise<TipoDemandaPersistence> {
    if (!input.nome || input.nome.trim() === '') {
      throw new Error("O nome do tipo de demanda é obrigatório.");
    }

    const nomeLimpo = input.nome.trim();

    const existing = await DemandasTiposRepository.findByName(nomeLimpo);
    if (existing) {
      throw new Error("Já existe um tipo de demanda com este nome.");
    }

    return await DemandasTiposRepository.create({
      nome: nomeLimpo,
      id_formulario: input.id_formulario // Passa o ID
    });
  }

  // Atualizado para receber id_formulario
  async updateTipo(id: number, nome?: string, id_formulario?: number | null): Promise<TipoDemandaPersistence> {
    if (!nome || nome.trim() === '') {
      throw new Error("O nome do tipo de demanda é obrigatório.");
    }
    const nomeLimpo = nome.trim();

    const current = await DemandasTiposRepository.findById(id);
    if (!current) {
      throw new Error("Tipo de demanda não encontrado.");
    }

    if (current.nome !== nomeLimpo) {
      const existing = await DemandasTiposRepository.findByName(nomeLimpo);
      if (existing) {
        throw new Error("Já existe um tipo de demanda com este nome.");
      }
    }

    // Passa o objeto completo para o repositório
    const updated = await DemandasTiposRepository.update(id, {
        nome: nomeLimpo,
        id_formulario: id_formulario
    });

    if (!updated) throw new Error("Erro inesperado ao atualizar.");
    
    return updated;
  }

  async deleteTipo(id: number): Promise<void> {
    const current = await DemandasTiposRepository.findById(id);
    if (!current) {
      throw new Error("Tipo de demanda não encontrado.");
    }

    const usageCount = await DemandasTiposRepository.countUsageByName(current.nome);
    if (usageCount > 0) {
      throw new Error(`Não é possível deletar o tipo "${current.nome}" pois ele está associado a ${usageCount} demanda(s).`);
    }

    const success = await DemandasTiposRepository.delete(id);
    if (!success) throw new Error("Erro ao deletar tipo.");
  }
}

export const demandasTiposService = new DemandasTiposService();