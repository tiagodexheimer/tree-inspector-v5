// src/app/api/rotas/[id]/reorder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../../lib/db';

// Interface para os parâmetros da URL (Removida - não é mais necessária)
// interface Params {
//     id: string;
// }

// ***** INÍCIO DA CORREÇÃO 1: Definir o tipo para o Contexto *****
type ExpectedContext = {
    params: Promise<{ id: string }>;
};
// ***** FIM DA CORREÇÃO 1 *****


// Interface para o corpo da requisição (só precisamos dos IDs na ordem)
interface ReorderRequestBody {
    demandas: { id: number }[]; 
}

// ***** INÍCIO DA CORREÇÃO 2: Atualizar a assinatura da função PUT *****
export async function PUT(request: NextRequest, context: ExpectedContext) {
    // Obter os parâmetros usando 'await'
    const params = await context.params;
    const { id } = params;
// ***** FIM DA CORREÇÃO 2 *****

    const rotaId = Number(id);
    console.log(`[API /rotas/${id}/reorder] Recebido PUT para ATUALIZAR rota.`);

    if (isNaN(rotaId)) {
        return NextResponse.json({ message: 'ID da rota inválido.' }, { status: 400 });
    }

    const client = await pool.connect();
    
    try {
        const body: ReorderRequestBody = await request.json();
        // O frontend envia a lista completa de demandas na nova ordem
        const { demandas } = body; 

        // --- Início da Transação ---
        await client.query('BEGIN');

        // 1. Apagar TODAS as associações antigas desta rota
        // Isso lida automaticamente com demandas que foram removidas
        await client.query('DELETE FROM rotas_demandas WHERE rota_id = $1', [rotaId]);

        // 2. Se a nova lista de demandas não estiver vazia, insere a nova ordem
        if (demandas && demandas.length > 0) {
            
            // Preparar a query de inserção múltipla
            const demandaValues: string[] = []; // Corrigido de 'any[]'
            const queryParams: number[] = [rotaId]; // Corrigido de 'any[]'. $1 é sempre o rotaId
            
            demandas.forEach((demanda, index) => {
                const ordem = index; // A nova ordem é o índice do array
                const demandaId = demanda.id;
                
                if (demandaId === undefined) {
                    throw new Error('Uma das demandas na lista está sem ID.');
                }

                const placeholderIndex = queryParams.length; 
                // Ex: ($1, $2, $3), ($1, $4, $5), ...
                demandaValues.push(`($1, $${placeholderIndex + 1}, $${placeholderIndex + 2})`);
                queryParams.push(demandaId, ordem);
            });

            const demandaInsertQuery = `
                INSERT INTO rotas_demandas (rota_id, demanda_id, ordem)
                VALUES ${demandaValues.join(', ')};
            `;
            
            // 3. Executar a inserção da nova ordem
            await client.query(demandaInsertQuery, queryParams);
        }
        // Se 'demandas' estiver vazio, a rota ficará sem nenhuma demanda (o que é correto)

        // --- Fim da Transação ---
        await client.query('COMMIT');
        
        console.log(`[API /rotas/${id}/reorder] Rota atualizada com sucesso.`);
        
        return NextResponse.json({
            message: 'Ordem da rota atualizada com sucesso!'
        }, { status: 200 });

    } catch (error) {
        // Se qualquer query falhar, reverte a transação
        await client.query('ROLLBACK');
        
        console.error(`[API /rotas/${id}/reorder] Erro ao reordenar rota:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no servidor.';
        
        return NextResponse.json({ message: 'Erro interno ao salvar a nova ordem.', error: errorMessage }, { status: 500 });
    } finally {
        // Libera o client de volta para o pool
        client.release();
    }
}