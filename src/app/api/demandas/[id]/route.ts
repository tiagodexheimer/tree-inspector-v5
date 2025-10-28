// src/app/api/demandas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
// Ajusta o caminho para apontar corretamente para lib/db.ts
import pool from '../../../../lib/db'; // Exemplo: quatro níveis acima

// Handler para DELETE /api/demandas/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } } // Recebe os parâmetros da rota
) {
    const id = params.id; // Pega o ID da URL
    console.log(`[API] Recebido DELETE em /api/demandas/${id}`);

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
        console.error('[API] Erro 400: ID inválido.');
        return NextResponse.json({ message: 'ID da demanda inválido.' }, { status: 400 });
    }

    try {
        const queryText = 'DELETE FROM demandas WHERE id = $1 RETURNING id';
        const queryParams = [numericId];

        console.log('[API] Executando query:', queryText, queryParams);
        const result = await pool.query(queryText, queryParams);

        if (result.rowCount === 0) {
            console.warn(`[API] Demanda com ID ${numericId} não encontrada para deleção.`);
            // Retorna 404 se a demanda não foi encontrada no banco
            return NextResponse.json({ message: `Demanda com ID ${numericId} não encontrada.` }, { status: 404 });
        }

        console.log(`[API] Demanda com ID ${numericId} deletada com sucesso.`);
        // Retorna 200 OK com mensagem (ou 204 No Content)
        return NextResponse.json({ message: `Demanda ${numericId} deletada com sucesso.` }, { status: 200 });

    } catch (error) {
        console.error(`[API] Erro ao deletar demanda ${numericId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ message: `Erro interno ao deletar demanda ${numericId}.`, error: errorMessage }, { status: 500 });
    }
}

// Poderia adicionar GET por ID aqui também:
// export async function GET(request: NextRequest, { params }: { params: { id: string } }) { ... }