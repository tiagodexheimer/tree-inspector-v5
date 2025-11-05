// src/app/api/rotas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { DemandaType } from '@/types/demanda';

// Interface para os dados vindos do modal
interface RotaRequestBody {
    nome: string;
    responsavel: string;
    demandas: DemandaType[]; // Espera a lista de demandas ordenadas
}

export async function POST(request: NextRequest) {
    console.log('[API /rotas] Recebido POST para criar nova rota.');
    
    // Obter um 'client' do pool para usar em uma transação
    const client = await pool.connect();
    
    try {
        const body: RotaRequestBody = await request.json();
        const { nome, responsavel, demandas } = body;

        // Validação básica
        if (!nome || nome.trim() === '') {
            return NextResponse.json({ message: 'O nome da rota é obrigatório.' }, { status: 400 });
        }
        if (!responsavel || responsavel.trim() === '') {
            return NextResponse.json({ message: 'O responsável é obrigatório.' }, { status: 400 });
        }
        if (!demandas || demandas.length === 0) {
            return NextResponse.json({ message: 'A rota deve conter pelo menos uma demanda.' }, { status: 400 });
        }

        // --- Início da Transação ---
        await client.query('BEGIN');

        // 1. Inserir na tabela 'rotas'
        const rotaInsertQuery = `
            INSERT INTO rotas (nome, responsavel, status)
            VALUES ($1, $2, $3)
            RETURNING id;
        `;
        const rotaInsertResult = await client.query(rotaInsertQuery, [
            nome.trim(), 
            responsavel.trim(),
            'Pendente' // Status inicial
        ]);
        
        const rotaId = rotaInsertResult.rows[0].id;

        // 2. Preparar as inserções na tabela 'rotas_demandas'
        // Criamos uma query de inserção múltipla
        const demandaValues: any[] = [];
        const queryParams: any[] = [rotaId]; // Começa com $1 = rotaId
        
        demandas.forEach((demanda, index) => {
            const ordem = index; // A ordem é o índice do array
            const demandaId = demanda.id;
            
            if (demandaId === undefined) {
                 // Se alguma demanda não tiver ID, cancela a transação
                throw new Error('Uma das demandas na lista está sem ID.');
            }
            
            // Ex: ($1, $2, $3), ($1, $4, $5), ...
            const placeholderIndex = queryParams.length; // Posição inicial dos novos params
            demandaValues.push(`($1, $${placeholderIndex + 1}, $${placeholderIndex + 2})`);
            queryParams.push(demandaId, ordem);
        });

        const demandaInsertQuery = `
            INSERT INTO rotas_demandas (rota_id, demanda_id, ordem)
            VALUES ${demandaValues.join(', ')};
        `;

        // 3. Executar a inserção das demandas
        await client.query(demandaInsertQuery, queryParams);
        
        // 4. (Opcional) Atualizar o status das demandas para "Em rota"
        // TODO: Implementar se necessário (ex: UPDATE demandas SET id_status = ... WHERE id = ANY(...))

        // --- Fim da Transação ---
        await client.query('COMMIT');
        
        console.log(`[API /rotas] Rota ${rotaId} ("${nome}") criada com ${demandas.length} demandas.`);
        
        return NextResponse.json({
            message: 'Rota criada com sucesso!',
            rota: { id: rotaId, nome: nome, responsavel: responsavel, status: 'Pendente' }
        }, { status: 201 });

    } catch (error) {
        // Se qualquer query falhar, reverte a transação
        await client.query('ROLLBACK');
        
        console.error('[API /rotas] Erro ao criar rota:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no servidor.';
        
        // Tratar erro de violação de chave (ex: demanda já em outra rota)
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return NextResponse.json({ message: 'Erro: Uma ou mais demandas já pertencem a outra rota.', error: errorMessage }, { status: 409 });
        }

        return NextResponse.json({ message: 'Erro interno ao salvar a rota.', error: errorMessage }, { status: 500 });
    } finally {
        // Libera o client de volta para o pool, independente de sucesso ou falha
        client.release();
    }
}