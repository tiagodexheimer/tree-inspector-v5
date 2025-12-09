import { StatusRepository, StatusPersistence } from "@/repositories/status-repository";

// Define a interface para o input
interface CreateStatusInput {
  nome?: string;
  cor?: string;
}

export class StatusService {
  
  async listAll(): Promise<StatusPersistence[]> {
    return await StatusRepository.findAll();
  }

  async createStatus(input: CreateStatusInput): Promise<StatusPersistence> {
    this.validateInput(input);

    const nomeLimpo = input.nome!.trim();

    const existing = await StatusRepository.findByName(nomeLimpo);
    if (existing) {
      throw new Error("Já existe um status com este nome.");
    }

    return await StatusRepository.create({
      nome: nomeLimpo,
      cor: input.cor!
    });
  }

  // --- CORREÇÃO AQUI: Certifique-se de que recebe 'input' como objeto ---
  async updateStatus(id: number, input: CreateStatusInput): Promise<StatusPersistence> {
    this.validateInput(input);
    
    const nomeLimpo = input.nome!.trim();

    // 1. Verificar se existe
    const current = await StatusRepository.findById(id);
    if (!current) {
      throw new Error("Status não encontrado.");
    }

    // 2. Verificar duplicidade (se mudou o nome)
    if (current.nome !== nomeLimpo) {
      const existing = await StatusRepository.findByName(nomeLimpo);
      if (existing) {
        throw new Error("Já existe um status com este nome.");
      }
    }

    // 3. Atualizar
    const updated = await StatusRepository.update(id, {
      nome: nomeLimpo,
      cor: input.cor!
    });

    if (!updated) throw new Error("Erro inesperado ao atualizar.");
    return updated;
  }

  async deleteStatus(id: number): Promise<void> {
    const current = await StatusRepository.findById(id);
    if (!current) {
      throw new Error("Status não encontrado.");
    }

    const usageCount = await StatusRepository.countUsageById(id);
    if (usageCount > 0) {
      throw new Error(`Não é possível deletar o status pois ele está associado a ${usageCount} demanda(s).`);
    }

    const success = await StatusRepository.delete(id);
    if (!success) throw new Error("Erro ao deletar status.");
  }

  private validateInput(input: CreateStatusInput) {
    if (!input.nome || input.nome.trim() === '') {
      throw new Error("O nome do status é obrigatório.");
    }
    if (!input.cor || !/^#[0-9A-F]{6}$/i.test(input.cor)) {
      throw new Error("A cor é obrigatória e deve estar no formato #RRGGBB.");
    }
  }
}

export const statusService = new StatusService();