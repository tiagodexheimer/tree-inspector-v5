// src/app/api/rotas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

// Interface para os parâmetros da URL (ex: /api/rotas/1)
interface Params {
    id: string;
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
    const { id } = params;
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

        // Parsear o GeoJSON
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