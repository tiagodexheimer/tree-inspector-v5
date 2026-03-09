import { NotificacoesRepository, CreateNotificacaoDTO } from "@/repositories/notificacoes-repository";
import { demandasService } from "./demandas-service";
import { UserRole } from "@/types/auth-types";

export const notificacoesService = {
    async listByDemanda(demandaId: number) {
        return await NotificacoesRepository.findByDemanda(demandaId);
    },

    async listExpired(organizationId: number) {
        return await NotificacoesRepository.findExpired(organizationId);
    },

    async createNotificacao(data: CreateNotificacaoDTO, organizationId: number, userRole: UserRole = "admin") {
        // Garante que a organização é a correta da sessão
        let finalData = { ...data, organization_id: organizationId };

        // [NOVO] Se for uma notificação avulsa (sem demanda vinculada), cria uma demanda de Fiscalização primeiro
        if (!finalData.demanda_id) {
            console.log("[NotificacoesService] Verificando se já existe demanda para o processo:", finalData.numero_processo);
            const demandaExistente = await demandasService.findByProtocolo(finalData.numero_processo, organizationId);

            if (demandaExistente) {
                console.log("[NotificacoesService] Reutilizando demanda existente ID:", demandaExistente.id);
                finalData.demanda_id = demandaExistente.id;
            } else {
                console.log("[NotificacoesService] Criando nova demanda de fiscalização...");
                const novaDemanda = await demandasService.createDemanda({
                    protocolo: finalData.numero_processo,
                    nome_solicitante: "Fiscalização (Sistema)",
                    cep: finalData.cep || "00000000",
                    logradouro: finalData.logradouro,
                    numero: finalData.numero || "S/N",
                    bairro: finalData.bairro,
                    cidade: finalData.cidade,
                    uf: finalData.uf,
                    tipo_demanda: "Fiscalização",
                    descricao: `Fiscalização vinculada ao processo: ${finalData.numero_processo}. ${finalData.descricao || ""}`,
                    coordinates: (finalData.lat && finalData.lng) ? [finalData.lat, finalData.lng] : undefined
                }, organizationId, userRole);

                finalData.demanda_id = novaDemanda.id;
            }
        }

        // Lógica de vencimento automática se não fornecida
        if (!finalData.vencimento && finalData.data_emissao) {
            const emission = new Date(finalData.data_emissao);
            emission.setDate(emission.getDate() + (finalData.prazo_dias || 15));
            finalData.vencimento = emission;
        }

        return await NotificacoesRepository.create(finalData);
    },

    async deleteNotificacao(id: number, organizationId: number) {
        return await NotificacoesRepository.delete(id, organizationId);
    },

    async updateStatus(id: number, organizationId: number, status: string) {
        return await NotificacoesRepository.updateStatus(id, organizationId, status);
    },

    async updateNotificacao(id: number, organizationId: number, data: Partial<CreateNotificacaoDTO>) {
        // Recalcular vencimento se necessário
        if (data.data_emissao || data.prazo_dias) {
            const emission = new Date(data.data_emissao || new Date());
            emission.setDate(emission.getDate() + (data.prazo_dias || 15));
            data.vencimento = emission;
        }

        return await NotificacoesRepository.update(id, organizationId, data);
    },

    async updateStatusByDemanda(demandaId: number, organizationId: number, status: string) {
        return await NotificacoesRepository.updateStatusByDemanda(demandaId, organizationId, status);
    }
};
