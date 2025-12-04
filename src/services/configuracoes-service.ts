import { ConfiguracoesRepository, RotaConfig } from "@/repositories/configuracoes-repository";

export const ConfiguracoesService = {
    async obterConfiguracaoRota() {
        return await ConfiguracoesRepository.getRotaConfig();
    },

    async salvarConfiguracaoRota(input: RotaConfig) {
        if (!input.inicio.lat || !input.inicio.lng || !input.fim.lat || !input.fim.lng) {
            throw new Error("Todas as coordenadas são obrigatórias.");
        }
        await ConfiguracoesRepository.updateRotaConfig(input);
    }
};