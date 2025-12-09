// src/services/configuracoes-service.ts
import { ConfiguracoesRepository, RotaConfig } from "@/repositories/configuracoes-repository";

export const ConfiguracoesService = {
    // ✅ CORREÇÃO 1: Recebe organizationId e passa para o repositório
    async obterConfiguracaoRota(organizationId: number) {
        return await ConfiguracoesRepository.getRotaConfig(organizationId);
    },

    // ✅ CORREÇÃO 2: Recebe organizationId e passa para o repositório
    async salvarConfiguracaoRota(organizationId: number, input: RotaConfig) {
        if (!input.inicio.lat || !input.inicio.lng || !input.fim.lat || !input.fim.lng) {
            throw new Error("Todas as coordenadas são obrigatórias.");
        }
        await ConfiguracoesRepository.updateRotaConfig(organizationId, input);
    }
};