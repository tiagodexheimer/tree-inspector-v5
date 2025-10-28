// src/app/api/demandas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db'; // Ajuste o caminho se necessário

// Defina um tipo que corresponda ao que o erro espera
type ExpectedContext = { params: Promise<{ id: string }> };

export async function DELETE(
    request: NextRequest,
    // Use o tipo esperado pelo erro
    context: ExpectedContext
) {
    // Como params é uma Promise, precisamos usar await
    const params = await context.params;
    const id = params.id;
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
            return NextResponse.json({ message: `Demanda com ID ${numericId} não encontrada.` }, { status: 404 });
        }

        console.log(`[API] Demanda com ID ${numericId} deletada com sucesso.`);
        return NextResponse.json({ message: `Demanda ${numericId} deletada com sucesso.` }, { status: 200 });

    } catch (error) {
        console.error(`[API] Erro ao deletar demanda ${numericId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ message: `Erro interno ao deletar demanda ${numericId}.`, error: errorMessage }, { status: 500 });
    }
}