
import pool from "../lib/db";
import { demandasService } from "../services/demandas-service";
import { notificacoesService } from "../services/notificacoes-service";
import { StatusRepository } from "../repositories/status-repository";

async function testCascade() {
    console.log("--- Iniciando teste de cascata ---");

    const orgId = 1; // Ajuste conforme necessário
    const userId = "test-user";

    try {
        // 1. Criar uma demanda
        console.log("1. Criando demanda de teste...");
        const demanda = await demandasService.createDemanda({
            nome_solicitante: "Teste Cascata",
            cep: "01001000",
            numero: "123",
            tipo_demanda: "Fiscalização",
            descricao: "Demanda para testar cascata de status"
        }, orgId, "admin");
        console.log(`Demand criada ID: ${demanda.id}`);

        // 2. Criar uma notificação vencida para essa demanda
        console.log("2. Criando notificação vencida...");
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 10);

        const notificacao = await notificacoesService.createNotificacao({
            demanda_id: demanda.id,
            numero_processo: demanda.protocolo,
            prazo_dias: 15,
            data_emissao: pastDate,
            vencimento: pastDate, // Forçadamente vencida
            organization_id: orgId
        }, orgId);
        console.log(`Notificação criada ID: ${notificacao.id}`);

        // 3. Verificar se aparece em findExpired
        console.log("3. Verificando se aparece em findExpired...");
        const expiredBefore = await notificacoesService.listExpired(orgId);
        const existsBefore = expiredBefore.some(n => n.id === notificacao.id);
        console.log(`Aparece antes da conclusão? ${existsBefore}`);

        // 4. Concluir a demanda
        console.log("4. Concluindo a demanda...");
        const statusConcluido = await StatusRepository.findByName("Concluída", orgId);
        if (!statusConcluido) throw new Error("Status 'Concluída' não encontrado");

        await demandasService.updateDemandaStatus(demanda.id, statusConcluido.id, orgId);
        console.log("Status da demanda atualizado para 'Concluída'");

        // 5. Verificar status da notificação
        console.log("5. Verificando status da notificação após cascata...");
        const notificacoes = await notificacoesService.listByDemanda(demanda.id);
        const nAtualizada = notificacoes.find(n => n.id === notificacao.id);
        console.log(`Status da notificação: ${nAtualizada?.status}`);

        // 6. Verificar se ainda aparece em findExpired
        console.log("6. Verificando findExpired novamente...");
        const expiredAfter = await notificacoesService.listExpired(orgId);
        const existsAfter = expiredAfter.some(n => n.id === notificacao.id);
        console.log(`Aparece após a conclusão? ${existsAfter}`);

        if (existsBefore && !existsAfter && nAtualizada?.status === 'Concluída') {
            console.log("\n✅ TESTE BEM SUCEDIDO: A cascata funcionou e os alertas foram encerrados.");
        } else {
            console.error("\n❌ TESTE FALHOU: O comportamento esperado não foi observado.");
        }

    } catch (error) {
        console.error("Erro durante o teste:", error);
    } finally {
        // Limpeza (opcional, mas bom para não poluir o banco)
        // await pool.query("DELETE FROM notificacoes WHERE demanda_id IN (SELECT id FROM demandas WHERE nome_solicitante = 'Teste Cascata')");
        // await pool.query("DELETE FROM demandas WHERE nome_solicitante = 'Teste Cascata'");
        // process.exit();
    }
}

// testCascade();
