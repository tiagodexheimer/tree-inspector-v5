// src/app/api/rotas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { DemandaType } from '@/types/demanda';

// Interface para os dados vindos do modal (do POST)
interface RotaRequestBody {
    nome: string;
    responsavel: string;
    demandas: DemandaType[]; // Espera a lista de demandas ordenadas
}


// +++ INÍCIO DA NOVA FUNÇÃO GET +++
export async function GET() {
    console.log("[API /rotas] Recebido GET para listar rotas.");
    
    try {
        const query = `
            SELECT
                r.id,
                r.nome,
                r.responsavel,
                r.status,
                r.data_rota,
                r.created_at,
                -- Contar o número de demandas associadas a cada rota
                COUNT(rd.demanda_id) AS total_demandas
            FROM
                rotas r
            LEFT JOIN
                rotas_demandas rd ON r.id = rd.rota_id
            GROUP BY
                r.id
            ORDER BY
                r.created_at DESC;
        `;

        const result = await pool.query(query);

        // Converte o total_demandas de string (do count) para número
        const rotas = result.rows.map(rota => ({
            ...rota,
            total_demandas: parseInt(rota.total_demandas, 10) || 0
        }));

        return NextResponse.json(rotas, { status: 200 });

    } catch (error) {
        console.error('[API /rotas] Erro ao buscar rotas (GET):', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no servidor.';
        return NextResponse.json({ message: 'Erro interno ao buscar rotas.', error: errorMessage }, { status: 500 });
    }
}
// +++ FIM DA NOVA FUNÇÃO GET +++


// --- Função POST (Criar Rota - Sem Alteração) ---
export async function POST(request: NextRequest) {
    console.log('[API /rotas] Recebido POST para criar nova rota.');
    
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
        const demandaValues: any[] = [];
        const queryParams: any[] = [rotaId]; 
        
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

        // 3. Executar a inserção das demandas
        await client.query(demandaInsertQuery, queryParams);
        
        // --- Fim da Transação ---
        await client.query('COMMIT');
        
        console.log(`[API /rotas] Rota ${rotaId} ("${nome}") criada com ${demandas.length} demandas.`);
        
        return NextResponse.json({
            message: 'Rota criada com sucesso!',
            rota: { id: rotaId, nome: nome, responsavel: responsavel, status: 'Pendente' }
        }, { status: 201 });

    } catch (error) {
        await client.query('ROLLBACK');
        
        console.error('[API /rotas] Erro ao criar rota:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no servidor.';
        
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return NextResponse.json({ message: 'Erro: Uma ou mais demandas já pertencem a outra rota.', error: errorMessage }, { status: 409 });
        }

        return NextResponse.json({ message: 'Erro interno ao salvar a rota.', error: errorMessage }, { status: 500 });
    } finally {
        client.release();
    }
}