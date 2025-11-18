import { StatusRepository, StatusPersistence } from "@/repositories/status-repository";

interface CreateStatusInput {
  nome?: string;
  cor?: string;
}

export class StatusService {
  
  async listAll(): Promise<StatusPersistence[]> {
    return await StatusRepository.findAll();
  }

  async createStatus(input: CreateStatusInput): Promise<StatusPersistence> {
    // 1. Validação de Campos Obrigatórios e Formato
    if (!input.nome || input.nome.trim() === '') {
      throw new Error("O nome do status é obrigatório.");
    }

    if (!input.cor || !/^#[0-9A-F]{6}$/i.test(input.cor)) {
      throw new Error("A cor é obrigatória e deve estar no formato #RRGGBB.");
    }

    const nomeLimpo = input.nome.trim();

    // 2. Regra de Negócio: Verificar duplicidade antes de inserir
    const existing = await StatusRepository.findByName(nomeLimpo);
    if (existing) {
      throw new Error("Já existe um status com este nome.");
    }

    // 3. Persistência
    return await StatusRepository.create({
      nome: nomeLimpo,
      cor: input.cor
    });
  }
}

export const statusService = new StatusService();