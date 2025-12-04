// src/services/status-service.ts
import { StatusRepository } from "@/repositories/status-repository";

// Interfaces DTOs (Data Transfer Objects)
export interface CreateStatusDTO {
  nome: string;
  cor: string;
}

export interface UpdateStatusDTO {
  nome?: string;
  cor?: string;
}

// O Plano Free só pode usar as configurações, não alterá-las.
type PlanType = 'free' | 'pro';

export class StatusService {
    
    // --- LEITURA (PERMITIDO A TODOS) ---
    /**
     * Lista todos os status de uma organização específica.
     * Permissão: Todos os usuários (Free e Pro) logados.
     */
    async listAll(organizationId: number): Promise<any[]> {
        // A filtragem por organização já está no repositório
        return StatusRepository.findAll(organizationId);
    }
    
    // --- ESCRITA/ALTERAÇÃO (RESTRITO AO PLANO PRO) ---

    /**
     * Cria um novo status para a organização.
     * Permissão: Apenas Plano Pro.
     */
    async createStatus(data: CreateStatusDTO, organizationId: number, planType: PlanType): Promise<any> {
        if (planType === 'free') {
            throw new Error("A criação de Status é exclusiva para o Plano Pro.");
        }
        
        // Assumindo que o repositório verifica duplicidade (UNIQUE(organization_id, nome))
        const newStatus = await StatusRepository.create(data, organizationId);
        return newStatus;
    }

    /**
     * Atualiza um status existente.
     * Permissão: Apenas Plano Pro.
     */
    async updateStatus(id: number, data: UpdateStatusDTO, organizationId: number, planType: PlanType): Promise<any> {
        if (planType === 'free') {
            throw new Error("A edição de Status é exclusiva para o Plano Pro.");
        }
        
        // A atualização deve falhar se o ID não for encontrado ou não pertencer à organização (repositório cuida disso)
        const updatedStatus = await StatusRepository.update(id, data, organizationId);
        
        if (!updatedStatus) {
            throw new Error("Status não encontrado ou você não tem permissão para editá-lo.");
        }
        return updatedStatus;
    }

    /**
     * Exclui um status.
     * Permissão: Apenas Plano Pro.
     */
    async deleteStatus(id: number, organizationId: number, planType: PlanType): Promise<boolean> {
        if (planType === 'free') {
            throw new Error("A exclusão de Status é exclusiva para o Plano Pro.");
        }
        
        // A exclusão deve falhar se o ID não for encontrado ou estiver em uso
        const success = await StatusRepository.delete(id, organizationId);
        
        if (!success) {
             throw new Error("Status não encontrado ou você não tem permissão para excluí-lo (verifique se não está em uso).");
        }
        return success;
    }
}

export const statusService = new StatusService();