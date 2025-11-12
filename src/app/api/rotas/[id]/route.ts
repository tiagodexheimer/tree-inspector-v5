// src/app/api/rotas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'; 
import db from '@/lib/db';
import { PoolClient } from 'pg';
// Removida a importação de GeoJsonPoint (já que não vamos usá-la)
import { DemandaType } from '@/types/demanda'; 
import { decode } from '@googlemaps/polyline-codec';

// --- NOVOS ADICIONAIS ---
// Ponto de partida/chegada (igual ao optimize/route.ts)
const START_END_POINT_COORDS = { latitude: -29.8608, longitude: -51.1789 };

// Interface da API do Google (igual ao optimize/route.ts)
interface RoutesApiResponse {
    routes: Array<{
        // Não vamos pedir 'optimizedIntermediateWaypointIndex' aqui
        polyline: {
            encodedPolyline: string;
        };
    }>;
    error?: {
        code: number;
        message: string;
        status: string;
    };
}
// --- FIM DOS NOVOS ADICIONAIS ---


interface DemandaRow extends DemandaType {
  // [MODIFICADO]: Remoção de GeoJsonPoint | null. Agora esperamos lat/lng
  lat?: number;
  lng?: number;
  ordem: number;
  status_nome: string;
  status_cor: string;
  // geom: unknown; // <-- LINHA REMOVIDA PARA RESOLVER O ERRO DE TIPAGEM
}

type ExpectedContext = {
    params: Promise<{ id: string }>;
};


// --- FUNÇÃO GET (Atualizada) ---
export async function GET(
  req: NextRequest, 
  context: ExpectedContext 
) {
  try {
    const params = await context.params; 
    const id = params.id;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY; // <-- Precisamos da Chave

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

    // 2. Busca as Demandas da Rota (e já extrai lat/lng)
    const demandas = await db.query(
      `SELECT 
         d.id, d.logradouro, d.numero, d.bairro, d.tipo_demanda, d.id_status,
         d.descricao, 
         s.nome as status_nome, s.cor as status_cor,
         ST_Y(d.geom) as lat, 
         ST_X(d.geom) as lng, -- [MODIFICADO] Apenas lat/lng como números
         dr.ordem
       FROM rotas_demandas dr 
       JOIN demandas d ON dr.demanda_id = d.id
       LEFT JOIN demandas_status s ON d.id_status = s.id
       WHERE dr.rota_id = $1
       ORDER BY dr.ordem ASC`, // <-- A ORDEM JÁ VEM CORRETA
      [id]
    );

    // [MODIFICADO]: Não há mais JSON.parse aqui
    const demandasFormatadas: DemandaRow[] = demandas.rows as DemandaRow[];


    // 3. Lógica do Google Maps (Substituindo OSRM)
    let encodedPolyline: string | null = null;
    const demandasComGeom = demandasFormatadas.filter(
      (d: DemandaRow) => d.lat && d.lng
    );

    if (demandasComGeom.length > 0 && apiKey) {
      try {
        const newDirectionsUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
        const headers = {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            // Pedimos apenas a polilinha
            'X-Goog-FieldMask': 'routes.polyline' 
        };

        const requestBody = {
            origin: { location: { latLng: START_END_POINT_COORDS } },
            destination: { location: { latLng: START_END_POINT_COORDS } },
            intermediates: demandasComGeom.map(d => ({
                location: {
                    latLng: { 
                        latitude: d.lat,
                        longitude: d.lng 
                    }
                }
            })),
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
            optimizeWaypointOrder: false // <-- IMPORTANTE: Não otimizar, usar a ordem fornecida
        };

        console.log(`[Rota ID: ${id}] Chamando Google Routes API (sem otimização)...`);
        const directionsResponse = await fetch(newDirectionsUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        const data: RoutesApiResponse = await directionsResponse.json();

        if (!directionsResponse.ok || data.error) {
           console.error(`[Rota ID: ${id}] Erro do Google Routes API:`, data.error);
        } else if (data.routes && data.routes.length > 0 && data.routes[0].polyline) {
           encodedPolyline = data.routes[0].polyline.encodedPolyline;
           console.log(`[Rota ID: ${id}] Polilinha da rota obtida com sucesso.`);
        } else {
           console.warn(`[Rota ID: ${id}] Google API OK, mas sem polilinha.`, data);
        }
      
      } catch (googleError) {
        console.error(`[Rota ID: ${id}] Erro interno ao chamar Google API:`, googleError);
      }
    } else if (!apiKey) {
         console.warn(`[Rota ID: ${id}] GOOGLE_MAPS_API_KEY não configurada. Pulando busca de rota.`);
    }
    
    // 4. Retorna a resposta (agora com encodedPolyline)
    return NextResponse.json({
      rota: rota.rows[0],
      demandas: demandasFormatadas, // Envia as demandas já formatadas
      encodedPolyline: encodedPolyline, // <-- Envia a polilinha
    });

  } catch (error) {
    console.error('[GET ROTA ID]', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// --- FUNÇÃO PUT (Corrigida) ---
export async function PUT(
  req: NextRequest, 
  context: ExpectedContext 
) {
  try {
    const params = await context.params; 
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
  req: NextRequest, 
  context: ExpectedContext 
) {
  let client: PoolClient | null = null;
  try {
    const params = await context.params; 
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