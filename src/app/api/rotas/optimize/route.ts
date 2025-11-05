// src/app/api/rotas/optimize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { DemandaType, GeoJsonPoint } from '@/types/demanda'; // Importe GeoJsonPoint
import { decode } from '@googlemaps/polyline-codec';

const START_END_POINT_COORDS = { latitude: -29.8608, longitude: -51.1789 };
const START_END_POINT_JSON = { lat: -29.8608, lng: -51.1789 };

interface OptimizeRequestBody {
    demandaIds: number[];
}

interface RoutesApiResponse {
    routes: Array<{
        optimizedIntermediateWaypointIndex: number[]; 
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
interface DemandaWithCoords extends DemandaType {
    lat: number;
    lng: number;
    geom: GeoJsonPoint | null; 
}


export async function POST(request: NextRequest) {
    console.log('[API /rotas/optimize] Recebido POST para otimizar rota.');
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        console.error('[API /rotas/optimize] Erro: GOOGLE_MAPS_API_KEY não configurada.');
        return NextResponse.json({ message: 'Erro interno: Chave de API não configurada.' }, { status: 500 });
    }

    try {
        const body: OptimizeRequestBody = await request.json();
        const { demandaIds } = body;

        if (!demandaIds || demandaIds.length === 0) {
            return NextResponse.json({ message: 'Nenhum ID de demanda fornecido.' }, { status: 400 });
        }

        // 1. Buscar coordenadas E O OBJETO GEOM
        const queryResult = await pool.query(
            `SELECT id, nome_solicitante, logradouro, numero, bairro, cidade, uf, cep, tipo_demanda, descricao, prazo, id_status,
                    ST_Y(geom) as lat, ST_X(geom) as lng,
                    ST_AsGeoJSON(geom) as geom
             FROM demandas 
             WHERE id = ANY($1::int[])`,
            [demandaIds]
        );

        const demandas: DemandaWithCoords[] = queryResult.rows.map(row => ({
            ...row,
            geom: row.geom ? JSON.parse(row.geom) : null 
        }));

        const demandasComGeom = demandas.filter(d => d.lat && d.lng && d.geom);

        if (demandasComGeom.length === 0) {
             return NextResponse.json({ message: 'Nenhuma das demandas selecionadas possui coordenadas para roteirizar.' }, { status: 400 });
        }

        // 2. Montar a requisição
        const newDirectionsUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
        
        // ***** CORREÇÃO AQUI: Ajustar o FieldMask *****
        // Pedimos o objeto 'polyline' inteiro, e não seu sub-campo.
        const headers = {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.optimizedIntermediateWaypointIndex,routes.polyline'
        };
        // ***** FIM DA CORREÇÃO *****

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
            optimizeWaypointOrder: true
        };

        console.log(`[API /rotas/optimize] Chamando NOVA Google Routes API (com FieldMask corrigido)...`);
        
        const directionsResponse = await fetch(newDirectionsUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        const data: RoutesApiResponse = await directionsResponse.json();

        if (!directionsResponse.ok || data.error) {
            console.error('[API /rotas/optimize] Erro do Google Routes API:', data.error);
            const errorMsg = data.error?.message || `Erro HTTP: ${directionsResponse.status}`;
            throw new Error(`Erro da API de Roteamento: ${errorMsg}`);
        }
        
        if (!data.routes || data.routes.length === 0) {
             throw new Error(`Erro da API de Roteamento: Nenhuma rota retornada.`);
        }
        
        // 3. Processar a resposta
        const route = data.routes[0];
        
        // A verificação permanece a mesma, pois 'polyline' conterá 'encodedPolyline'
        if (!route.optimizedIntermediateWaypointIndex || !route.polyline?.encodedPolyline) {
             console.error('[API /rotas/optimize] Resposta da API não contém os campos esperados (polyline/index).', route);
             throw new Error('Resposta da API de Roteamento está incompleta.');
        }

        const optimizedOrder: number[] = route.optimizedIntermediateWaypointIndex;
        const encodedPolyline = route.polyline.encodedPolyline;

        // 4. Reordenar nosso array de demandas
        const optimizedDemands = optimizedOrder.map(index => demandasComGeom[index]);

        // 5. Decodificar a polilinha
        const routePath = decode(encodedPolyline);

        console.log(`[API /rotas/optimize] Rota otimizada com sucesso. Ordem:`, optimizedOrder.join(', '));

        return NextResponse.json({
            optimizedDemands: optimizedDemands, 
            routePath: routePath,             
            startPoint: START_END_POINT_JSON 
        }, { status: 200 });

    } catch (error) {
        console.error('[API /rotas/optimize] Erro inesperado:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no servidor.';
        
        return NextResponse.json({ 
            message: `Erro interno ao otimizar rota: ${errorMessage}`,
            error: errorMessage 
        }, { status: 500 });
    }
}