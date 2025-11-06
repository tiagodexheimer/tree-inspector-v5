// src/app/api/rotas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'; // <-- Import NextRequest
import db from '@/lib/db';
import { PoolClient } from 'pg';
import { DemandaType, GeoJsonPoint } from '@/types/demanda'; // Import types

// Interface for the row returned by the 'demandas' query
interface DemandaRow extends DemandaType {
  geom: GeoJsonPoint | null;
  ordem: number;
  status_nome: string;
  status_cor: string;
}

// FIX 1: Define the correct context type
type ExpectedContext = {
    params: Promise<{ id: string }>;
};


// --- FUNÇÃO GET (Corrigida) ---
export async function GET(
  req: NextRequest, // <-- FIX 2: Use NextRequest
  context: ExpectedContext // <-- FIX 3: Use ExpectedContext
) {
  try {
    const params = await context.params; // <-- FIX 4: Await params
    const id = params.id;

    // 1. Busca os detalhes da Rota
    const rota = await db.query(
      `SELECT 
         r.id, r.nome, r.responsavel, r.status, r.data_rota, r.created_at
       FROM rotas r
       WHERE r.id = $1`,
      [id]
    );

    if (rota.rowCount === 0) {
      return NextResponse.json({ error: 'Rota não encontrada' }, { status: 404 });
    }

    // 2. Busca as Demandas da Rota
    const demandas = await db.query(
      `SELECT 
         d.id, d.logradouro, d.numero, d.bairro, d.tipo_demanda, d.id_status,
         s.nome as status_nome, s.cor as status_cor,
         ST_AsGeoJSON(d.geom)::json as geom,
         dr.ordem
       FROM rotas_demandas dr 
       JOIN demandas d ON dr.demanda_id = d.id
       LEFT JOIN demandas_status s ON d.id_status = s.id
       WHERE dr.rota_id = $1
       ORDER BY dr.ordem ASC`,
      [id]
    );

    // 3. Lógica do OSRM
    let geometry: string | null = null;
    if (demandas.rows.length > 1) {
      try {
        // Use the DemandaRow interface
        const demandasComGeom = demandas.rows.filter(
          (d: DemandaRow) => d.geom && d.geom.coordinates
        );
        const coordinates = demandasComGeom
          .map((d: DemandaRow) => d.geom!.coordinates.join(','))
          .join(';');
        
        const osrmUrl = `http://osrm:5000/route/v1/driving/${coordinates}?overview=full`;
        console.log(`[Rota ID: ${id}] Chamando OSRM: ${osrmUrl}`);
        const osrmResponse = await fetch(osrmUrl);

        if (osrmResponse.ok) {
          const osrmData = await osrmResponse.json();
          if (osrmData && osrmData.routes && osrmData.routes.length > 0) {
            geometry = osrmData.routes[0].geometry;
          }
        } else {
          console.error(`[Rota ID: ${id}] Falha na chamada OSRM: ${osrmResponse.statusText}`);
        }
      } catch (osrmError) {
        console.error(`[Rota ID: ${id}] Erro interno ao chamar OSRM:`, osrmError);
      }
    }
    
    // 4. Retorna a resposta
    return NextResponse.json({
      rota: rota.rows[0],
      demandas: demandas.rows,
      geometry: geometry,
    });

  } catch (error) {
    console.error('[GET ROTA ID]', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// --- FUNÇÃO PUT (Corrigida) ---
export async function PUT(
  req: NextRequest, // <-- FIX 2
  context: ExpectedContext // <-- FIX 3
) {
  try {
    const params = await context.params; // <-- FIX 4
    const id = params.id;
    const body = await req.json();
    const { nome, responsavel, status, data_rota } = body;

    const query = `
      UPDATE rotas
      SET nome = $1, responsavel = $2, status = $3, data_rota = $4
      WHERE id = $5
      RETURNING *;
    `;
    const values = [nome, responsavel, status, data_rota || null, id];
    const updatedRota = await db.query(query, values);

    if (updatedRota.rowCount === 0) {
      return NextResponse.json({ error: 'Rota não encontrada' }, { status: 404 });
    }
    return NextResponse.json(updatedRota.rows[0]);
  } catch (error) {
    console.error('[PUT ROTA ID]', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// --- FUNÇÃO DELETE (Corrigida) ---
export async function DELETE(
  req: NextRequest, // <-- FIX 2
  context: ExpectedContext // <-- FIX 3
) {
  let client: PoolClient | null = null;
  try {
    const params = await context.params; // <-- FIX 4
    const id = params.id;
    client = await db.connect();
    await client.query('BEGIN');

    // 1. Deleta as associações em 'rotas_demandas'
    await client.query(
      `DELETE FROM rotas_demandas WHERE rota_id = $1`,
      [id]
    );

    // 2. Deleta a rota principal em 'rotas'
    const deletedRota = await client.query(
      `DELETE FROM rotas WHERE id = $1 RETURNING *`,
      [id]
    );

    if (deletedRota.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Rota não encontrada' }, { status: 404 });
    }

    await client.query('COMMIT');
    return NextResponse.json(deletedRota.rows[0]);
  } catch (error) {
    console.error('[DELETE ROTA ID]', error);
    if (client) {
      await client.query('ROLLBACK');
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}