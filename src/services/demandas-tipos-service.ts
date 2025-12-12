// src/services/demandas-tipos-service.ts

import { DemandasTiposRepository, TipoDemandaPersistence, CreateTipoDemandaDTO, UpdateTipoDemandaDTO } from "@/repositories/demandas-tipos-repository";
import { UserRole, getLimitsByRole } from '@/types/auth-types';

// Agora aceita id_formulario opcional e o nome se torna obrigatório na interface
interface CreateTipoInput {
  nome: string;
  id_formulario?: number | null;
}

interface UpdateTipoInput {
  nome?: string;
  id_formulario?: number | null;
}


export class DemandasTiposService {
  
  /**
   * Lista todos os tipos de demanda para uma organização específica.
   * Assumindo que a listagem já é filtrada por organizationId no repositório.
   */
  async listAll(organizationId: number): Promise<TipoDemandaPersistence[]> {
    return await DemandasTiposRepository.findAll(organizationId);
  }

  /**
   * Cria um novo Tipo de Demanda personalizado. Restrito a planos Pro/Premium.
   */
  async createTipo(
    input: CreateTipoInput,
    organizationId: number,
    userRole: UserRole // Necessário para checar permissão
  ): Promise<TipoDemandaPersistence> {
    
    if (!input.nome || input.nome.trim() === '') {
      throw new Error("O nome do tipo de demanda é obrigatório.");
    }
    const nomeLimpo = input.nome.trim();

    // 1. REGRA DE NEGÓCIO: Permissão para Tipos Personalizados
    const limits = getLimitsByRole(userRole);
    
    if (!limits.ALLOW_CUSTOM_TYPES) {
        throw new Error(
            "Seu plano atual não permite criar Tipos de Demanda personalizados. Esta funcionalidade está disponível nos planos Pro e Premium."
        );
    }

    // 2. Checagem de duplicidade (filtrada pela organização)
    const existing = await DemandasTiposRepository.findByNameAndOrg(nomeLimpo, organizationId);
    if (existing) {
      throw new Error("Já existe um tipo de demanda com este nome para sua organização.");
    }

    // 3. Criação
    const payload: CreateTipoDemandaDTO = {
      nome: nomeLimpo,
      id_formulario: input.id_formulario || null,
      organization_id: organizationId, // Garante multi-tenant
      is_custom: true, // Tipos criados via API são personalizados
    };

    return await DemandasTiposRepository.create(payload);
  }

  /**
   * Atualiza um Tipo de Demanda. Restrito a Tipos Personalizados e planos Pro/Premium.
   */
  async updateTipo(
    id: number, 
    input: UpdateTipoInput,
    organizationId: number,
    userRole: UserRole // Necessário para checar permissão
  ): Promise<TipoDemandaPersistence> {
      
    // 1. Encontra o tipo existente e checa o multi-tenant
    const current = await DemandasTiposRepository.findById(id, organizationId);
    if (!current) {
      throw new Error("Tipo de demanda não encontrado ou você não tem permissão para editá-lo.");
    }
    
    // 2. Validação básica
    const nomeLimpo = input.nome ? input.nome.trim() : current.nome;
    if (!nomeLimpo || nomeLimpo.trim() === '') {
        throw new Error("O nome do tipo de demanda é obrigatório.");
    }

    // 3. REGRA DE NEGÓCIO: Permissão para Edição
    const limits = getLimitsByRole(userRole);
    
    if (current.is_custom && !limits.ALLOW_CUSTOM_TYPES) {
        // Se for customizado e o plano não permitir, lança erro
        throw new Error("Seu plano atual não permite editar Tipos de Demanda personalizados.");
    }
    // Tipos padrão (is_custom: false) podem ser editados (nome/formulário) em qualquer plano.
    
    // 4. Checagem de duplicidade (se o nome mudou)
    if (current.nome !== nomeLimpo) {
      const existing = await DemandasTiposRepository.findByNameAndOrg(nomeLimpo, organizationId);
      if (existing) {
        throw new Error("Já existe um tipo de demanda com este nome para sua organização.");
      }
    }

    // 5. Atualização
    const payload: UpdateTipoDemandaDTO = {
        nome: nomeLimpo,
        id_formulario: input.id_formulario !== undefined ? input.id_formulario : current.id_formulario 
    };

    const updated = await DemandasTiposRepository.update(id, payload);

    if (!updated) throw new Error("Erro inesperado ao atualizar.");
    
    return updated;
  }

  /**
   * Deleta um Tipo de Demanda. Restrito a Tipos Personalizados e planos Pro/Premium.
   */
  async deleteTipo(
    id: number, 
    organizationId: number,
    userRole: UserRole // Necessário para checar permissão
  ): Promise<void> {
      
    const current = await DemandasTiposRepository.findById(id, organizationId);
    if (!current) {
      throw new Error("Tipo de demanda não encontrado ou você não tem permissão para excluí-lo.");
    }

    // 1. REGRA DE NEGÓCIO: Permissão para Exclusão
    const limits = getLimitsByRole(userRole);

    if (!current.is_custom) {
        throw new Error(`O tipo de demanda padrão "${current.nome}" não pode ser excluído.`);
    }

    if (current.is_custom && !limits.ALLOW_CUSTOM_TYPES) {
        throw new Error("Seu plano atual não permite excluir Tipos de Demanda personalizados.");
    }

    // 2. Checagem de uso (para evitar Foreign Key Violations)
    // Assumimos que o DemandasTiposRepository.countUsageById já filtra por organizationId
    const usageCount = await DemandasTiposRepository.countUsageById(id);
    if (usageCount > 0) {
      throw new Error(`Não é possível deletar o tipo "${current.nome}" pois ele está associado a ${usageCount} demanda(s).`);
    }

    // 3. Deleção
    const success = await DemandasTiposRepository.delete(id);
    if (!success) throw new Error("Erro ao deletar tipo.");
  }
}

export const demandasTiposService = new DemandasTiposService();