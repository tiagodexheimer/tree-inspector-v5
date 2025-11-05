// src/app/api/rotas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
// A importação 'DemandaType' não é usada neste arquivo
// import { DemandaType } from '@/types/demanda';

// Interface para os parâmetros da URL (Não é mais necessária com o 'context')
// interface Params {
//     id: string;
// }

// ***** INÍCIO DA CORREÇÃO 1: Definir o tipo para o Contexto *****
type ExpectedContext = {
    params: Promise<{ id: string }>;
};
// ***** FIM DA CORREÇÃO 1 *****


// Interface para o corpo da requisição (do PUT)
interface ReorderRequestBody {
    demandas: { id: number }[];
}


// --- Handler GET (Buscar Detalhes) - CORRIGIDO ---
export async function GET(request: NextRequest, context: ExpectedContext) {
    // ***** INÍCIO DA CORREÇÃO 2: Obter 'params' do 'context' *****
    const params = await context.params;
    const { id } = params;
    // ***** FIM DA CORREÇÃO 2 *****

    console.log(`[API /rotas/${id}] Recebido GET para buscar rota.`);

    if (isNaN(Number(id))) {
        return NextResponse.json({ message: 'ID da rota inválido.' }, { status: 400 });
    }

    const client = await pool.connect();
    
    try {
        // 1. Buscar os detalhes da Rota
        const rotaQuery = 'SELECT * FROM rotas WHERE id = $1';
        const rotaResult = await client.query(rotaQuery, [id]);

        if (rotaResult.rowCount === 0) {
            return NextResponse.json({ message: 'Rota não encontrada.' }, { status: 404 });
        }
        const rota = rotaResult.rows[0];

        // 2. Buscar as Demandas associadas, na ordem correta
        const demandasQuery = `
            SELECT 
                d.id, d.logradouro, d.numero, d.bairro, d.tipo_demanda,
                d.id_status,
                s.nome as status_nome,
                s.cor as status_cor,
                ST_AsGeoJSON(d.geom) as geom,
                rd.ordem
            FROM 
                demandas d
            JOIN 
                rotas_demandas rd ON d.id = rd.demanda_id
            LEFT JOIN 
                demandas_status s ON d.id_status = s.id
            WHERE 
                rd.rota_id = $1
            ORDER BY 
                rd.ordem ASC; 
        `;
        const demandasResult = await client.query(demandasQuery, [id]);

        const demandas = demandasResult.rows.map(row => ({
            ...row,
            geom: row.geom ? JSON.parse(row.geom) : null
        }));

        // 3. Retornar os dados combinados
        return NextResponse.json({
            rota,
            demandas
        }, { status: 200 });

    } catch (error) {
        console.error(`[API /rotas/${id}] Erro ao buscar rota:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido.';
        return NextResponse.json({ message: 'Erro interno ao buscar detalhes da rota.', error: errorMessage }, { status: 500 });
    } finally {
        client.release();
    }
}

// --- Handler PUT (Reordenar) - CORRIGIDO ---
export async function PUT(request: NextRequest, context: ExpectedContext) {
    // ***** INÍCIO DA CORREÇÃO 3: Obter 'params' do 'context' *****
    const params = await context.params;
    const { id } = params;
    // ***** FIM DA CORREÇÃO 3 *****
    
    const rotaId = Number(id);
    console.log(`[API /rotas/${id}/reorder] Recebido PUT para ATUALIZAR rota.`);

    if (isNaN(rotaId)) {
        return NextResponse.json({ message: 'ID da rota inválido.' }, { status: 400 });
    }

    const client = await pool.connect();
    
    try {
        const body: ReorderRequestBody = await request.json();
        const { demandas } = body; 

        await client.query('BEGIN');

        // 1. Apagar TODAS as associações antigas
        await client.query('DELETE FROM rotas_demandas WHERE rota_id = $1', [rotaId]);

        // 2. Inserir a nova lista
        if (demandas && demandas.length > 0) {
            // (Corrigindo o 'any' implícito que causaria erro no futuro)
            const demandaValues: string[] = [];
            const queryParams: number[] = [rotaId]; 
            
            demandas.forEach((demanda, index) => {
                const ordem = index;
                const demandaId = demanda.id;
                
                if (demandaId === undefined) {
                    throw new Error('Uma das demandas na lista está sem ID.');
                }
                const placeholderIndex = queryParams.length; 
                demandaValues.push(`($1, $${placeholderIndex + 1}, $${placeholderIndex + 2})`);
                queryParams.push(demandaId, ordem);
            });

            const demandaInsertQuery = `
                INSERT INTO rotas_demandas (rota_id, demanda_id, ordem)
                VALUES ${demandaValues.join(', ')};
            `;
            await client.query(demandaInsertQuery, queryParams);
        }

        await client.query('COMMIT');
        
        console.log(`[API /rotas/${id}/reorder] Rota atualizada com sucesso.`);
        
        return NextResponse.json({
            message: 'Ordem da rota atualizada com sucesso!'
        }, { status: 200 });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[API /rotas/${id}/reorder] Erro ao reordenar rota:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no servidor.';
        return NextResponse.json({ message: 'Erro interno ao salvar a nova ordem.', error: errorMessage }, { status: 500 });
    } finally {
        client.release();
    }
}


// --- Handler DELETE (Apagar) - CORRIGIDO ---
export async function DELETE(request: NextRequest, context: ExpectedContext) {
    // ***** INÍCIO DA CORREÇÃO 4: Obter 'params' do 'context' *****
    const params = await context.params;
    const { id } = params;
    // ***** FIM DA CORREÇÃO 4 *****
    
    const rotaId = Number(id);
    console.log(`[API /rotas/${id}] Recebido DELETE para apagar rota.`);

    if (isNaN(rotaId)) {
        return NextResponse.json({ message: 'ID da rota inválido.' }, { status: 400 });
    }

    const client = await pool.connect();
    
    try {
        // Graças ao 'ON DELETE CASCADE' na tabela 'rotas_demandas',
        // só precisamos deletar da tabela 'rotas'.
        
        await client.query('BEGIN');

        const query = 'DELETE FROM rotas WHERE id = $1 RETURNING nome';
        const result = await client.query(query, [rotaId]);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ message: 'Rota não encontrada.' }, { status: 404 });
        }

        await client.query('COMMIT');
        
        const nomeRotaDeletada = result.rows[0].nome;
        console.log(`[API /rotas/${id}] Rota "${nomeRotaDeletada}" deletada com sucesso.`);
        
        return NextResponse.json({
            message: `Rota "${nomeRotaDeletada}" deletada com sucesso!`
        }, { status: 200 });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[API /rotas/${id}] Erro ao deletar rota:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido.';
        
        // Erro 23503 indica violação de foreign key (se não tivéssemos o cascade)
        if (error instanceof Error && 'code' in error && error.code === '23503') {
             return NextResponse.json({ message: 'Erro: Esta rota não pode ser deletada pois está sendo referenciada por outros dados.', error: errorMessage }, { status: 409 });
        }

        return NextResponse.json({ message: 'Erro interno ao deletar a rota.', error: errorMessage }, { status: 500 });
    } finally {
        client.release();
    }
}