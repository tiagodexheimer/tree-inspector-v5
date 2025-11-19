// src/app/api/gerenciar/formularios/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import db from '@/lib/db';

type ExpectedContext = { params: Promise<{ id: string }> };

async function checkAdmin() {
    const session = await auth();
    if (!session || session.user?.role !== 'admin') return false;
    return true;
}

// GET: Buscar detalhes do formulário
export async function GET(req: NextRequest, context: ExpectedContext) {
    if (!await checkAdmin()) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    try {
        const params = await context.params;
        const id = parseInt(params.id);
        if (isNaN(id)) return NextResponse.json({ message: 'ID inválido' }, { status: 400 });

        const query = `
            SELECT 
                f.id, f.nome, f.descricao, f.definicao_campos,
                dtf.id_tipo_demanda
            FROM formularios f
            LEFT JOIN demandas_tipos_formularios dtf ON f.id = dtf.id_formulario
            WHERE f.id = $1
        `;
        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ message: 'Formulário não encontrado' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0], { status: 200 });
    } catch (error) {
        console.error('[API GET Form]', error);
        return NextResponse.json({ message: 'Erro interno' }, { status: 500 });
    }
}

// PUT: Atualizar formulário
export async function PUT(req: NextRequest, context: ExpectedContext) {
    if (!await checkAdmin()) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    let dbClient;
    try {
        const params = await context.params;
        const id = parseInt(params.id);
        const body = await req.json();
        const { nome, descricao, definicao_campos, id_tipo_demanda } = body;

        dbClient = await db.connect();
        await dbClient.query('BEGIN');

        // 1. Atualiza Tabela Formularios
        await dbClient.query(
            `UPDATE formularios SET nome = $1, descricao = $2, definicao_campos = $3, updated_at = NOW() WHERE id = $4`,
            [nome, descricao, JSON.stringify(definicao_campos), id]
        );

        // 2. Atualiza Vínculo
        await dbClient.query(`DELETE FROM demandas_tipos_formularios WHERE id_formulario = $1`, [id]);
        
        if (id_tipo_demanda) {
            const linkQuery = `
                INSERT INTO demandas_tipos_formularios (id_tipo_demanda, id_formulario)
                VALUES ($1, $2)
                ON CONFLICT (id_tipo_demanda) DO UPDATE SET id_formulario = $2
            `;
            await dbClient.query(linkQuery, [id_tipo_demanda, id]);
        }

        await dbClient.query('COMMIT');
        return NextResponse.json({ message: 'Atualizado com sucesso' }, { status: 200 });

    } catch (error) {
        if (dbClient) await dbClient.query('ROLLBACK');
        console.error('[API PUT Form]', error);
        return NextResponse.json({ message: 'Erro ao atualizar' }, { status: 500 });
    } finally {
        if (dbClient) dbClient.release();
    }
}

// DELETE: Apagar formulário
export async function DELETE(req: NextRequest, context: ExpectedContext) {
    if (!await checkAdmin()) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    try {
        const params = await context.params;
        const id = parseInt(params.id);
        if (isNaN(id)) return NextResponse.json({ message: 'ID inválido' }, { status: 400 });

        // Tenta deletar
        const result = await db.query('DELETE FROM formularios WHERE id = $1', [id]);

        if ((result.rowCount ?? 0) === 0) {
            return NextResponse.json({ message: 'Formulário não encontrado' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Deletado com sucesso' }, { status: 200 });

    } catch (error: any) {
        console.error('[API DELETE Form]', error);
        
        // Tratamento de erro de chave estrangeira (Postgres error 23503)
        if (error?.code === '23503') {
            return NextResponse.json({ 
                message: 'Não é possível excluir: Este formulário está vinculado a um Tipo de Demanda. Desvincule-o primeiro.' 
            }, { status: 409 });
        }

        return NextResponse.json({ message: 'Erro interno ao deletar' }, { status: 500 });
    }
}