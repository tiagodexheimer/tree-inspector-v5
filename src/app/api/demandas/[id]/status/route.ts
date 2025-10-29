// src/app/api/demandas/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../../lib/db';
// Remova a importação de Status daqui se não for mais necessária
// import { Status } from '../../../../../types/demanda';

type ExpectedContext = { params: Promise<{ id: string }> };

// Interface para o corpo da requisição PATCH (agora espera id_status)
interface UpdateStatusBody {
    id_status?: number; // Espera o ID do novo status
}

export async function PATCH(request: NextRequest, context: ExpectedContext) {
    const params = await context.params;
    const id = params.id;
    console.log(`[API] Recebido PATCH em /api/demandas/${id}/status`);

    const numericDemandaId = parseInt(id, 10);
    if (isNaN(numericDemandaId)) {
        return NextResponse.json({ message: 'ID da demanda inválido.' }, { status: 400 });
    }

    try {
        const body = await request.json() as UpdateStatusBody;
        const newStatusId = body.id_status; // Pega o ID do status
        console.log('[API] Novo id_status recebido:', newStatusId);

        // Validação do ID do Status recebido
        if (newStatusId === undefined || typeof newStatusId !== 'number') {
            return NextResponse.json({ message: 'ID do status inválido ou ausente.' }, { status: 400 });
        }

        // Opcional: Validar se o newStatusId existe na tabela demandas_status
        const checkStatusExists = await pool.query('SELECT 1 FROM demandas_status WHERE id = $1', [newStatusId]);
        if (checkStatusExists.rowCount === 0) {
            return NextResponse.json({ message: `Status com ID ${newStatusId} não existe.` }, { status: 400 });
        }

        // Monta a Query SQL UPDATE para atualizar id_status
        const queryText = `
            UPDATE demandas
            SET id_status = $1, -- Atualiza id_status
                updated_at = NOW()
            WHERE id = $2
            RETURNING id, id_status, updated_at; -- Retorna campos atualizados
        `;
        const queryParams = [newStatusId, numericDemandaId];

        console.log('[API] Executando query UPDATE status (id_status):', queryText, queryParams);
        const result = await pool.query(queryText, queryParams);

        if (result.rowCount === 0) {
            return NextResponse.json({ message: `Demanda com ID ${numericDemandaId} não encontrada.` }, { status: 404 });
        }

        const updatedFields = result.rows[0];
        console.log('[API] Status da demanda atualizado com sucesso (id_status):', updatedFields);

        return NextResponse.json({
            message: 'Status da demanda atualizado com sucesso!',
            demanda: updatedFields // Retorna os campos atualizados (id, id_status, updated_at)
        }, { status: 200 });

    } catch (error) {
        console.error(`[API] Erro ao atualizar status da demanda ${id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ message: `Erro interno ao atualizar status da demanda ${id}.`, error: errorMessage }, { status: 500 });
    }
}