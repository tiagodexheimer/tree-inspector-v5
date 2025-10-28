// src/app/api/demandas/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
// Ajuste o caminho para seus arquivos lib/db e types/demanda
import pool from '../../../../../lib/db';
import { Status } from '../../../../../types/demanda';

// Define o tipo de contexto esperado (params é uma Promise)
// Isso resolve o erro de tipagem que pode ocorrer com `context.params`
type ExpectedContext = { params: Promise<{ id: string }> };

// Interface para o corpo da requisição PATCH
interface UpdateStatusBody {
    status?: Status; // Status é opcional mas esperado pela lógica
}

// --- Handler para PATCH (Atualizar Status da Demanda) ---
export async function PATCH(request: NextRequest, context: ExpectedContext) {
    // Aguarda a resolução da Promise para obter os parâmetros
    const params = await context.params;
    const id = params.id;
    console.log(`[API] Recebido PATCH em /api/demandas/${id}/status`);

    // Valida se o ID é um número
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
        console.error('[API] Erro 400: ID inválido.');
        return NextResponse.json({ message: 'ID da demanda inválido.' }, { status: 400 });
    }

    try {
        // Obtém o corpo da requisição
        const body = await request.json() as UpdateStatusBody;
        const newStatus = body.status;
        console.log('[API] Novo status recebido:', newStatus);

        // Validação do Status recebido
        const validStatuses: Status[] = ['Pendente', 'Em andamento', 'Concluído'];
        if (!newStatus || !validStatuses.includes(newStatus)) {
            console.log('[API] Erro 400: Status inválido ou ausente.');
            return NextResponse.json({ message: 'Status inválido ou ausente. Valores permitidos: Pendente, Em andamento, Concluído.' }, { status: 400 });
        }

        // Monta a Query SQL UPDATE
        // Atualiza o status e o campo updated_at (se existir na sua tabela)
        const queryText = `
            UPDATE demandas
            SET status = $1,
                updated_at = NOW() -- Assume que você tem um campo updated_at
            WHERE id = $2
            RETURNING id, status, updated_at; -- Retorna campos atualizados para confirmação
        `;

        const queryParams = [newStatus, numericId];

        console.log('[API] Executando query UPDATE status:', queryText, queryParams);

        // Executa a Query
        const result = await pool.query(queryText, queryParams);

        // Verifica se alguma linha foi afetada (se a demanda com o ID existe)
        if (result.rowCount === 0) {
            console.warn(`[API] Demanda com ID ${numericId} não encontrada para atualização de status.`);
            return NextResponse.json({ message: `Demanda com ID ${numericId} não encontrada.` }, { status: 404 });
        }

        const updatedFields = result.rows[0];
        console.log('[API] Status da demanda atualizado com sucesso:', updatedFields);

        // Retorna uma resposta de sucesso
        return NextResponse.json({
            message: 'Status da demanda atualizado com sucesso!',
            demanda: updatedFields // Retorna os campos atualizados (id, status, updated_at)
        }, { status: 200 });

    } catch (error) {
        // Tratamento de erro genérico
        console.error(`[API] Erro ao atualizar status da demanda ${id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ message: `Erro interno ao atualizar status da demanda ${id}.`, error: errorMessage }, { status: 500 });
    }
}

// Opcional: Adicionar outros métodos HTTP (GET, POST, etc.) se necessário para esta rota específica
// export async function GET(request: NextRequest, context: ExpectedContext) { ... }