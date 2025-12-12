// src/services/formularios-service.ts
import { FormulariosRepository } from "@/repositories/formularios-repository";
import { UserRole, getLimitsByRole } from "@/types/auth-types";
// [FIX CRÍTICO] Importa CampoDef em vez de CampoFormulario
import { FormulariosPersistence, CreateFormularioDTO, UpdateFormularioDTO, CampoDef } from "@/types/formularios";

export class FormulariosService {

    /**
     * Define a estrutura do formulário padrão fixo (Observações + 1 Foto).
     */
    private getFixedFormDefinition(): CreateFormularioDTO {
        // [FIX] Usar o tipo CampoDef
        const campos: CampoDef[] = [
            {
                id: "obs",
                name: "observacoes",
                type: "textarea",
                label: "Observações/Relatório Detalhado",
                required: true,
                placeholder: "Relatório detalhado da visita...",
                rows: 3
            } as CampoDef, // Assegura compatibilidade com a união discriminada CampoDef
        ];
        
        return {
            organization_id: 0, // Placeholder
            nome: "Relatório Simples (Padrão)",
            descricao: "Formulário fixo e obrigatório para Planos Free e Basic, contendo apenas um campo de observações.",
            definicao_campos: JSON.stringify(campos)
        };
    }

    /**
     * Cria um novo formulário, aplicando as regras de limite baseadas no plano.
     */
    async createFormulario(
        input: Omit<CreateFormularioDTO, 'organization_id'>,
        organizationId: number,
        userRole: UserRole
    ): Promise<FormulariosPersistence> {
        
        if (!input.nome || !input.definicao_campos) {
            throw new Error("Nome e definição dos campos são obrigatórios.");
        }

        const limits = getLimitsByRole(userRole);
        
        // 1. Checagem de Limite
        const currentCount = await FormulariosRepository.countByOrganization(organizationId);
        
        if (currentCount >= limits.MAX_FORMULARIOS) {
            const planName = userRole.toUpperCase();
            throw new Error(`Limite de ${limits.MAX_FORMULARIOS} formulário(s) atingido para o Plano ${planName}.`);
        }

        // 2. Validação Específica para Plano Free (Apenas pode ter o template fixo)
        if (userRole === 'free') {
             // O plano Free só pode ter o formulário padrão. Se for a segunda tentativa, bloqueia.
             if (currentCount > 0) {
                 throw new Error("O Plano Free não permite a criação de formulários personalizados.");
             }
             
             // Aplica o template fixo
             const fixedForm = this.getFixedFormDefinition();
             
             const payload: CreateFormularioDTO = {
                organization_id: organizationId,
                nome: fixedForm.nome,
                descricao: fixedForm.descricao,
                // Garantimos que o formulário do Free seja o template fixo
                definicao_campos: fixedForm.definicao_campos, 
             };
             
             return await FormulariosRepository.create(payload);
        }

        // 3. Criação para Planos Basic, Pro e Premium (payload customizado)
        const payload: CreateFormularioDTO = {
            ...input,
            organization_id: organizationId,
        } as CreateFormularioDTO;

        return await FormulariosRepository.create(payload);
    }
    
    /**
     * Atualiza um formulário existente.
     */
    async updateFormulario(
        formId: number,
        input: UpdateFormularioDTO,
        organizationId: number,
        userRole: UserRole
    ): Promise<FormulariosPersistence> {
        
        // 1. Checagem de Permissão do Plano
        const limits = getLimitsByRole(userRole);
        if (limits.MAX_FORMULARIOS <= 1) { 
             throw new Error("Seu plano atual não permite editar formulários customizados.");
        }
        
        // 2. Busca e Checagem Multi-tenant
        const currentForm = await FormulariosRepository.findById(formId);
        
        if (!currentForm) {
            throw new Error("Formulário não encontrado.");
        }
        
        // Bloqueia a edição do formulário Padrão Global (NULL)
        if (currentForm.organization_id === null) {
            throw new Error("Não é possível editar o Formulário Padrão Global.");
        }
        
        // Checa posse: Deve pertencer à ORG
        if (currentForm.organization_id !== organizationId) {
            throw new Error("Acesso negado. Você só pode editar formulários da sua organização.");
        }

        // 3. Validação de Dados
        if (input.nome !== undefined && input.nome.trim() === '') {
            throw new Error("O nome do formulário é obrigatório.");
        }
        
        // 4. Atualiza no Repositório (que checa organizationId novamente)
        const updated = await FormulariosRepository.update(
            formId, 
            organizationId, 
            input
        );

        if (!updated) {
            throw new Error("Falha ao atualizar. Formulário não encontrado ou não pertence à organização.");
        }

        return updated;
    }

    /**
     * Deleta um formulário existente.
     */
    async deleteFormulario(
        formId: number,
        organizationId: number,
        userRole: UserRole
    ): Promise<void> {
        // 1. Checagem de Permissão do Plano
        const limits = getLimitsByRole(userRole);
        if (limits.MAX_FORMULARIOS <= 1) { 
             throw new Error("Seu plano atual não permite gerenciar formulários customizados.");
        }
        
        // 2. Busca e Checagem Multi-tenant
        const currentForm = await FormulariosRepository.findById(formId);
        
        if (!currentForm) {
            throw new Error("Formulário não encontrado.");
        }
        
        // Bloqueia a edição do formulário Padrão Global (NULL)
        if (currentForm.organization_id === null) {
            throw new Error("Não é possível deletar o Formulário Padrão Global.");
        }
        
        // Checa posse: Deve pertencer à ORG
        if (currentForm.organization_id !== organizationId) {
            throw new Error("Acesso negado. Você só pode deletar formulários da sua organização.");
        }

        // 3. Checagem de uso (para evitar FK violation) - Assume-se que o repositório verifica se há demandas associadas.

        // 4. Deleção
        const success = await FormulariosRepository.delete(formId, organizationId);

        if (!success) {
            throw new Error("Falha ao deletar formulário.");
        }
    }
}

export const formulariosService = new FormulariosService();