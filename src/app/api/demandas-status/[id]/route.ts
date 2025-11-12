// src/app/api/demandas-status/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
// Importações de Autenticação
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

type ExpectedContext = { params: Promise<{ id: string }> };

interface StatusBody {
    nome?: string;
    cor?: string;
}

// --- Handler para PUT (Atualizar Status) ---
export async function PUT(request: NextRequest, context: ExpectedContext) {
    // Verificação de Admin
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
    }

    const params = await context.params;
    const id = params.id;
    console.log(`[API] Recebido PUT em /api/demandas-status/${id}`);

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
        return NextResponse.json({ message: 'ID do status inválido.' }, { status: 400 });
    }

    try {
        const body = await request.json() as StatusBody;
        const { nome, cor } = body;

        // Validação
        if (!nome || nome.trim() === '') {
             return NextResponse.json({ message: 'O nome do status é obrigatório.' }, { status: 400 });
        }
        if (!cor || !/^#[0-9A-F]{6}$/i.test(cor)) {
             return NextResponse.json({ message: 'A cor é obrigatória e deve estar no formato #RRGGBB.' }, { status: 400 });
        }

        const queryText = 'UPDATE demandas_status SET nome = $1, cor = $2 WHERE id = $3 RETURNING id, nome, cor';
        const queryParams = [nome.trim(), cor, numericId];

        const result = await pool.query(queryText, queryParams);

        if (result.rowCount === 0) {
            return NextResponse.json({ message: `Status com ID ${numericId} não encontrado.` }, { status: 404 });
        }

        console.log('[API] Status atualizado com sucesso:', result.rows[0]);
        return NextResponse.json(result.rows[0], { status: 200 });

    } catch (error) { // <-- INÍCIO DO BLOCO CORRIGIDO
        console.error(`[API] Erro ao atualizar status ${id}:`, error);
        let errorMessage = 'Erro desconhecido';
        let status = 500;

        // Primeiro, checa se é o erro específico do Postgre (duplicado)
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            
            // Agora, checamos se 'message' existe e é string antes de usá-la
            if ('message' in error && typeof error.message === 'string' && error.message.includes('demandas_status_nome_key')) {
                status = 409; // Conflict
                errorMessage = 'Erro: Já existe um status com este nome.';
            } else {
                // É um erro de constraint duplicada, mas não o que esperávamos
                status = 409;
                errorMessage = 'Erro: Valor duplicado.';
            }
        } 
        // Se não for o erro de código 23505, checa se é um Erro padrão
        else if (error instanceof Error) {
            errorMessage = error.message;
        }

        return NextResponse.json({ message: `Erro interno ao atualizar status ${id}.`, error: errorMessage }, { status });
    } // <-- FIM DO BLOCO CORRIGIDO
}

// --- Handler para DELETE (Deletar Status) ---
export async function DELETE(request: NextRequest, context: ExpectedContext) {
    // Verificação de Admin
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
    }
    
    const params = await context.params;
    const id = params.id;
    console.log(`[API] Recebido DELETE em /api/demandas-status/${id}`);

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
        return NextResponse.json({ message: 'ID do status inválido.' }, { status: 400 });
    }

    try {
        // IMPORTANTE: Verificar se o status está sendo usado antes de deletar
        const checkUsageQuery = 'SELECT COUNT(*) FROM demandas WHERE id_status = $1';
        const usageResult = await pool.query(checkUsageQuery, [numericId]);
        if (usageResult.rows[0].count > 0) {
             return NextResponse.json({ message: `Não é possível deletar o status pois ele está associado a ${usageResult.rows[0].count} demanda(s).` }, { status: 409 }); // Conflict
        }

        // Se não estiver em uso, pode deletar
        const deleteQueryText = 'DELETE FROM demandas_status WHERE id = $1 RETURNING id';
        const result = await pool.query(deleteQueryText, [numericId]);

        if (result.rowCount === 0) {
            return NextResponse.json({ message: `Status com ID ${numericId} não encontrado.` }, { status: 404 });
        }

        console.log(`[API] Status com ID ${numericId} deletado com sucesso.`);
        return NextResponse.json({ message: `Status ${numericId} deletado com sucesso.` }, { status: 200 }); // Ou 204 No Content

    } catch (error) {
        console.error(`[API] Erro ao deletar status ${numericId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        // Tratar erro de FK se houver, embora a verificação acima deva prevenir
        return NextResponse.json({ message: `Erro interno ao deletar status ${numericId}.`, error: errorMessage }, { status: 500 });
    }
}