// src/app/api/rotas/optimize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
// Removendo a importação desnecessária de GeoJsonPoint do types/demanda
import { DemandaType } from '@/types/demanda'; 
import { decode } from '@googlemaps/polyline-codec';

const START_END_POINT_COORDS = { latitude: -29.8608, longitude: -51.1789 };

interface OptimizeRequestBody {
    demandaIds: number[];
    userLocation?: {
        latitude: number;
        longitude: number;
    };
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

// [MODIFICADO]: Interface mais simples para o tipo retornado do banco
interface DemandaWithCoords extends DemandaType {
    lat: number;
    lng: number;
    // O campo 'geom' não precisa ser explicitamente redefinido aqui
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
        const { demandaIds, userLocation } = body;

        if (!demandaIds || demandaIds.length === 0) {
            return NextResponse.json({ message: 'Nenhum ID de demanda fornecido.' }, { status: 400 });
        }

        // 1. Buscar coordenadas
        const queryResult = await pool.query(
            `SELECT id, nome_solicitante, logradouro, numero, bairro, cidade, uf, cep, tipo_demanda, descricao, prazo, id_status,
                   ST_Y(geom) as lat, 
                   ST_X(geom) as lng -- [MODIFICADO] Apenas lat/lng (mais rápido)
             FROM demandas 
             WHERE id = ANY($1::int[]) AND geom IS NOT NULL`, // Adiciona filtro para ter geom
            [demandaIds]
        );

        // [MODIFICADO]: Removido o map que continha JSON.parse(geom)
        const demandas: DemandaWithCoords[] = queryResult.rows as DemandaWithCoords[]; 

        const demandasComGeom = demandas.filter(d => d.lat && d.lng); // Filtra por lat/lng válidos

        if (demandasComGeom.length === 0) {
             return NextResponse.json({ message: 'Nenhuma das demandas selecionadas possui coordenadas válidas para roteirizar.' }, { status: 400 });
        }

        // 2. Montar a requisição - Lógica do Ponto de Partida
        let originCoordinates = START_END_POINT_COORDS; // Padrão
        
        if (userLocation && userLocation.latitude && userLocation.longitude) {
            console.log("[API /rotas/optimize] Usando localização do usuário como origem:", userLocation);
            originCoordinates = { latitude: userLocation.latitude, longitude: userLocation.longitude };
        } else {
            console.log("[API /rotas/optimize] Localização do usuário não recebida. Usando PONTO PADRÃO como origem.");
        }

        // 3. Montar a requisição para a Google Routes API
        const newDirectionsUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
        
        const headers = {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.optimizedIntermediateWaypointIndex,routes.polyline'
        };

        const requestBody = {
            origin: { location: { latLng: originCoordinates } }, 
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

        console.log(`[API /rotas/optimize] Chamando Google Routes API...`);
        
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
        
        // 4. Processar a resposta
        const route = data.routes[0];
        
        if (!route.optimizedIntermediateWaypointIndex || !route.polyline?.encodedPolyline) {
            console.error('[API /rotas/optimize] Resposta da API não contém os campos esperados (polyline/index).', route);
            throw new Error('Resposta da API de Roteamento está incompleta.');
        }

        const optimizedOrder: number[] = route.optimizedIntermediateWaypointIndex;
        const encodedPolyline = route.polyline.encodedPolyline;

        // 5. Reordenar nosso array de demandas
        const optimizedDemandasOrdenadas = optimizedOrder.map(index => demandasComGeom[index]);

        // 6. Decodificar a polilinha
        const routePath = decode(encodedPolyline);

        console.log(`[API /rotas/optimize] Rota otimizada com sucesso. Ordem:`, optimizedOrder.join(', '));

        return NextResponse.json({
            // [MODIFICADO]: Renomeado para maior clareza
            optimizedDemands: optimizedDemandasOrdenadas, 
            routePath: routePath,             
            startPoint: { lat: originCoordinates.latitude, lng: originCoordinates.longitude } 
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