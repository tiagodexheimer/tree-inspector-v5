// src/services/status-service.ts

import { StatusRepository, StatusPersistence, CreateStatusDTO, UpdateStatusDTO } from '@/repositories/status-repository';
import { UserRole, getLimitsByRole } from '@/types/auth-types'; 

export class StatusService {

    async listStatus(organizationId: number, organizationPlanType: UserRole): Promise<StatusPersistence[]> {
        const limits = getLimitsByRole(organizationPlanType);
        
        if (!limits.ALLOW_CUSTOM_STATUS) {
            // Free/Basic: Vê apenas Globais/Padrão
            return await StatusRepository.findGlobalAndDefault(organizationId);
        }
        // Pro/Premium: Vê Globais/Padrão E Customizados
        return await StatusRepository.findGlobalAndCustom(organizationId);
    }


    /**
     * Cria um novo status, checando se o plano da organização permite.
     */
    async createStatus(
        input: CreateStatusDTO,
        organizationId: number,
        organizationPlanType: UserRole // O Plano é a única fonte de permissão
    ): Promise<StatusPersistence> {
        
        if (!input.nome || !input.cor) {
            throw new Error("Nome e cor do Status são obrigatórios.");
        }
        
        const limits = getLimitsByRole(organizationPlanType);
        
        // 1. REGRA DE NEGÓCIO: Checa se o Plano da Organização permite customização
        if (!limits.ALLOW_CUSTOM_STATUS) {
            throw new Error("O Plano atual da organização não permite criar Status personalizados.");
        }
        
        // 2. Criação: Status criado via API é sempre customizado e pertence à ORG
        const payload = {
            ...input,
            organization_id: organizationId,
            is_custom: true, 
            is_default_global: false, 
        };
        
        // ... (Verificação de duplicidade por nome - esta lógica precisa ser implementada no repositório com o organizationId)
        
        return await StatusRepository.create(payload);
    }

    /**
     * Atualiza um status existente, restringindo a ação a Status Customizados
     * da própria organização, se o plano permitir.
     */
    async updateStatus(
        id: number,
        input: UpdateStatusDTO,
        organizationId: number,
        organizationPlanType: UserRole // O Plano é a única fonte de permissão
    ): Promise<StatusPersistence> {
        
        if (!input.nome && !input.cor) {
            const existing = await StatusRepository.findById(id);
            if (!existing) throw new Error("Status não encontrado.");
            return existing;
        }

        const existingStatus = await StatusRepository.findById(id);

        if (!existingStatus) {
            throw new Error("Status não encontrado.");
        }

        const limits = getLimitsByRole(organizationPlanType);

        // 1. REGRA DE NEGÓCIO: Checagem de Edição (Hierarquia)
        
        // A) Status Padrão Global NUNCA pode ser editado
        if (existingStatus.is_default_global) {
             throw new Error("Status padrão global do sistema não podem ser editados.");
        }
        
        // B) Status Customizado: Requer Plano Pro/Premium
        if (existingStatus.is_custom) {
            if (!limits.ALLOW_CUSTOM_STATUS) {
                throw new Error("O Plano atual não permite editar Status personalizados.");
            }
        }
        
        // 2. Checagem de propriedade: Permite editar APENAS o que pertence à ORG
        if (existingStatus.organization_id !== organizationId) {
             // Esta checagem é fundamental para a segurança multi-tenant em customizados
             throw new Error("Você não tem permissão para editar este status (Não pertence à sua organização).");
        }
        
        // 3. Atualização (o repositório finaliza a operação)
        const updated = await StatusRepository.update(id, organizationId, input); 
        
        if (!updated) throw new Error("Erro ao atualizar o status. Status não encontrado ou não pertence à organização.");
        return updated;
    }

    /**
     * Deleta um status existente, restringindo a ação a Status Customizados
     * da própria organização, se o plano permitir.
     */
    async deleteStatus(
        id: number,
        organizationId: number,
        organizationPlanType: UserRole // O Plano é a única fonte de permissão
    ): Promise<void> {
        
        const existingStatus = await StatusRepository.findById(id);
        if (!existingStatus) {
            throw new Error("Status não encontrado.");
        }
        
        const limits = getLimitsByRole(organizationPlanType);

        // 1. REGRA DE NEGÓCIO: Permissão para Exclusão

        // A) Status Padrão Global NUNCA pode ser excluído
        if (existingStatus.is_default_global) {
             throw new Error("Status padrão global do sistema não podem ser excluídos.");
        }
        
        // B) Status Customizado: Requer Plano Pro/Premium
        if (existingStatus.is_custom) {
             if (!limits.ALLOW_CUSTOM_STATUS) {
                 throw new Error("O Plano atual não permite excluir Status personalizados.");
             }
        }
        
        // 2. Checagem de propriedade: Permite deletar APENAS o que pertence à ORG
        if (existingStatus.organization_id !== organizationId) {
             throw new Error("Você não tem permissão para excluir este status (Não pertence à sua organização).");
        }
        
        // 3. Checagem de uso
        await StatusRepository.countUsageById(id); 
        
        // 4. Deleção (o Repositório finaliza a operação)
        await StatusRepository.delete(id, organizationId);
    }
}

export const statusService = new StatusService();