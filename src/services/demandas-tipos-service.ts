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


import { CustomizationService } from "./customization-service";

export class DemandasTiposService {

  /**
   * Lista todos os tipos de demanda para uma organização específica, respeitando o multi-tenant.
   * Contas Free/Basic veem apenas Tipos Globais. Contas Pro/Premium veem Globais + Customizados.
   */
  async listAll(organizationId: number, userRole: UserRole): Promise<TipoDemandaPersistence[]> {
    const limits = getLimitsByRole(userRole);

    const { usesCustomSchema } = await CustomizationService.getCustomizationStatus(organizationId);


    if (usesCustomSchema) {
      return await DemandasTiposRepository.findCustomOnly(organizationId);
    }

    if (!limits.ALLOW_CUSTOM_TYPES) {
      // Free/Basic: Vê apenas Globais/Padrão
      return await DemandasTiposRepository.findGlobalAndDefault(organizationId);
    }

    // Mix (Compatibilidade)
    return await DemandasTiposRepository.findGlobalAndCustom(organizationId);
  }

  /**
   * Cria um novo Tipo de Demanda personalizado. Restrito a planos Pro/Premium (ALLOW_CUSTOM_TYPES).
   */
  async createTipo(
    input: CreateTipoInput,
    organizationId: number,
    userRole: UserRole // [PERMISSÃO] Necessário para checar permissão
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
    // Assume que findByNameAndOrg filtra por organizationId OU NULL
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
      is_default_global: false, // Não é global
    };

    return await DemandasTiposRepository.create(payload);
  }

  /**
   * Atualiza um Tipo de Demanda. Restrito a Tipos Customizados da ORG e planos Pro/Premium.
   */
  async updateTipo(
    id: number,
    input: UpdateTipoInput,
    organizationId: number,
    userRole: UserRole // [PERMISSÃO] Necessário para checar permissão
  ): Promise<TipoDemandaPersistence> {

    // 1. Encontra o tipo existente e checa o multi-tenant
    // Assume que findById verifica a posse do tipo (ou é global)
    const current = await DemandasTiposRepository.findById(id);
    if (!current) {
      throw new Error("Tipo de demanda não encontrado.");
    }

    // 2. Validação básica de nome
    const nomeLimpo = input.nome ? input.nome.trim() : current.nome;
    if (!nomeLimpo || nomeLimpo.trim() === '') {
      throw new Error("O nome do tipo de demanda é obrigatório.");
    }

    // 3. REGRA DE NEGÓCIO: Checagem de Edição (Hierarquia)
    const limits = getLimitsByRole(userRole);

    // A) Bloqueia a edição de Tipos Padrão Global
    if (current.is_default_global) {
      throw new Error(`O tipo padrão global "${current.nome}" não pode ser editado.`);
    }

    // B) Bloqueia a edição de Tipos Customizados para Planos Free/Basic
    if (current.is_custom && !limits.ALLOW_CUSTOM_TYPES) {
      throw new Error("Seu plano atual não permite editar Tipos de Demanda personalizados.");
    }

    // C) Checagem de posse Multi-tenant: Só pode editar o que pertence à ORG
    if (current.organization_id !== organizationId) {
      throw new Error("Você não tem permissão para editar este tipo de demanda.");
    }

    // 4. Checagem de duplicidade (se o nome mudou)
    if (current.nome !== nomeLimpo) {
      // Assume que findByNameAndOrg filtra por organizationId
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

    // Assume que o repositório verifica a posse (organizationId) na cláusula WHERE do update
    const updated = await DemandasTiposRepository.update(id, organizationId, payload);

    if (!updated) throw new Error("Erro inesperado ao atualizar.");

    return updated;
  }

  /**
   * Deleta um Tipo de Demanda. Restrito a Tipos Customizados da ORG e planos Pro/Premium.
   */
  async deleteTipo(
    id: number,
    organizationId: number,
    userRole: UserRole // [PERMISSÃO] Necessário para checar permissão
  ): Promise<void> {

    const current = await DemandasTiposRepository.findById(id);
    if (!current) {
      throw new Error("Tipo de demanda não encontrado.");
    }

    // 1. REGRA DE NEGÓCIO: Permissão para Exclusão
    const limits = getLimitsByRole(userRole);

    // A) Status Padrão Global NUNCA pode ser excluído
    if (current.is_default_global) {
      throw new Error(`O tipo de demanda padrão global "${current.nome}" não pode ser excluído.`);
    }

    // B) Bloqueia a exclusão de Tipos Customizados para Planos Free/Basic
    if (current.is_custom && !limits.ALLOW_CUSTOM_TYPES) {
      throw new Error("Seu plano atual não permite excluir Tipos de Demanda personalizados.");
    }

    // C) Checagem de posse Multi-tenant: Só pode deletar o que pertence à ORG
    if (current.organization_id !== organizationId) {
      throw new Error("Você não tem permissão para excluir este tipo de demanda.");
    }

    // 2. Checagem de uso (para evitar Foreign Key Violations)
    // Assume que countUsageById já está implementado e deve filtrar por organizationId
    const usageCount = await DemandasTiposRepository.countUsageById(id);
    if (usageCount > 0) {
      throw new Error(`Não é possível deletar o tipo "${current.nome}" pois ele está associado a ${usageCount} demanda(s).`);
    }

    // 3. Deleção
    // Assume que o repositório verifica a posse (organizationId) na cláusula WHERE do delete
    const success = await DemandasTiposRepository.delete(id, organizationId);
    if (!success) throw new Error("Erro ao deletar tipo.");
  }
}

export const demandasTiposService = new DemandasTiposService();