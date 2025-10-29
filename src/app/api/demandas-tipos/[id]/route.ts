// src/app/api/demandas-tipos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db'; // Ajuste o caminho

type ExpectedContext = { params: Promise<{ id: string }> };

interface TipoBody {
    nome?: string;
}

// --- Handler para PUT (Atualizar Tipo) ---
export async function PUT(request: NextRequest, context: ExpectedContext) {
    const params = await context.params;
    const id = params.id;
    console.log(`[API] Recebido PUT em /api/demandas-tipos/${id}`);

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
        return NextResponse.json({ message: 'ID do tipo inválido.' }, { status: 400 });
    }

    try {
        const body = await request.json() as TipoBody;
        const { nome } = body;

        // Validação
        if (!nome || nome.trim() === '') {
             return NextResponse.json({ message: 'O nome do tipo de demanda é obrigatório.' }, { status: 400 });
        }

        // --- ATENÇÃO: Atualizar o nome pode quebrar referências ---
        // Se demandas.tipo_demanda ainda é VARCHAR, atualizar o nome aqui
        // pode dessincronizar com os valores existentes nas demandas.
        // Seria necessário atualizar também todas as demandas que usam o nome antigo.
        // Por segurança, considere DESABILITAR a edição do nome ou implementar
        // a atualização em cascata na tabela 'demandas' (mais complexo).
        // Vamos permitir a edição, mas ciente do risco.
        console.warn(`[API /demandas-tipos] ATENÇÃO: Atualizar o nome do tipo ${id} para "${nome}" pode dessincronizar dados na tabela 'demandas'.`);

        const queryText = 'UPDATE demandas_tipos SET nome = $1 WHERE id = $2 RETURNING id, nome';
        const queryParams = [nome.trim(), numericId];

        const result = await pool.query(queryText, queryParams);

        if (result.rowCount === 0) {
            return NextResponse.json({ message: `Tipo com ID ${numericId} não encontrado.` }, { status: 404 });
        }

        console.log('[API] Tipo atualizado com sucesso:', result.rows[0]);
        return NextResponse.json(result.rows[0], { status: 200 });

    } catch (error) {
        console.error(`[API] Erro ao atualizar tipo ${id}:`, error);
        let errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        let status = 500;
        // Trata erro de nome duplicado (UNIQUE constraint)
        if (error instanceof Error && 'code' in error && error.code === '23505' && error.message.includes('demandas_tipos_nome_key')) {
           status = 409; // Conflict
           errorMessage = 'Erro: Já existe um tipo de demanda com este nome.';
        }
        return NextResponse.json({ message: `Erro interno ao atualizar tipo ${id}.`, error: errorMessage }, { status });
    }
}

// --- Handler para DELETE (Deletar Tipo) ---
export async function DELETE(request: NextRequest, context: ExpectedContext) {
    const params = await context.params;
    const id = params.id;
    console.log(`[API] Recebido DELETE em /api/demandas-tipos/${id}`);

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
        return NextResponse.json({ message: 'ID do tipo inválido.' }, { status: 400 });
    }

    let tipoNome = ''; // Para a mensagem de erro

    try {
        // 1. Buscar o nome do tipo antes de deletar (para verificar o uso)
        const nameResult = await pool.query('SELECT nome FROM demandas_tipos WHERE id = $1', [numericId]);
        if (nameResult.rowCount === 0) {
            return NextResponse.json({ message: `Tipo com ID ${numericId} não encontrado.` }, { status: 404 });
        }
        tipoNome = nameResult.rows[0].nome;

        // 2. Verificar se o tipo (pelo NOME) está sendo usado na tabela 'demandas'
        const checkUsageQuery = 'SELECT COUNT(*) FROM demandas WHERE tipo_demanda = $1';
        const usageResult = await pool.query(checkUsageQuery, [tipoNome]);

        if (usageResult.rows[0].count > 0) {
             return NextResponse.json({ message: `Não é possível deletar o tipo "${tipoNome}" pois ele está associado a ${usageResult.rows[0].count} demanda(s).` }, { status: 409 }); // Conflict
        }

        // 3. Se não estiver em uso, pode deletar
        const deleteQueryText = 'DELETE FROM demandas_tipos WHERE id = $1 RETURNING id';
        const result = await pool.query(deleteQueryText, [numericId]);

        // Verificação redundante, já feita na busca do nome, mas segura
        if (result.rowCount === 0) {
            return NextResponse.json({ message: `Tipo com ID ${numericId} não encontrado.` }, { status: 404 });
        }

        console.log(`[API] Tipo com ID ${numericId} ("${tipoNome}") deletado com sucesso.`);
        return NextResponse.json({ message: `Tipo ${numericId} ("${tipoNome}") deletado com sucesso.` }, { status: 200 }); // Ou 204 No Content

    } catch (error) {
        console.error(`[API] Erro ao deletar tipo ${numericId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ message: `Erro interno ao deletar tipo ${numericId}.`, error: errorMessage }, { status: 500 });
    }
}