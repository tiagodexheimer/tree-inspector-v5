import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { DemandaType } from '@/types/demanda'; 
import { decode, encode } from '@googlemaps/polyline-codec'; 

const START_END_POINT_COORDS = { latitude: -29.8533191, longitude: -51.1789191};

interface OptimizeRequestBody {
    demandaIds: number[];
    userLocation?: {
        latitude: number;
        longitude: number;
    };
}

interface RoutesApiResponse {
    routes: Array<{
        optimizedIntermediateWaypointIndex?: number[];
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
    lat: number | null;
    lng: number | null;
    status_nome?: string;
    status_cor?: string;
    id_status?: number | null;
}

// Função utilitária para calcular a distância (Haversine)
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export async function POST(request: NextRequest) {
    console.log('[API /rotas/optimize] Recebido POST para otimizar rota.');
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ message: 'Erro interno: Chave de API não configurada.' }, { status: 500 });
    }

    try {
        const body: OptimizeRequestBody = await request.json();
        const { demandaIds, userLocation } = body;

        if (!demandaIds || demandaIds.length === 0) {
            return NextResponse.json({ message: 'Nenhum ID de demanda fornecido.' }, { status: 400 });
        }

        // 1. Buscar TODAS as demandas (com ou sem coordenadas)
        const queryResult = await pool.query(
            `SELECT d.id, d.nome_solicitante, d.logradouro, d.numero, d.bairro, d.cidade, d.uf, d.cep, d.tipo_demanda, d.descricao, d.prazo, d.id_status, 
                    s.nome as status_nome, s.cor as status_cor,
                    ST_Y(d.geom::geometry) as lat, 
                    ST_X(d.geom::geometry) as lng
             FROM demandas d 
             LEFT JOIN demandas_status s ON d.id_status = s.id
             WHERE d.id = ANY($1::int[])`, 
            [demandaIds]
        );

        const todasDemandas: DemandaWithCoords[] = queryResult.rows;

        // Separa com e sem geometria
        const demandasComGeom = todasDemandas.filter(d => d.lat !== null && d.lng !== null) as (DemandaWithCoords & { lat: number, lng: number })[];
        const demandasSemGeom = todasDemandas.filter(d => d.lat === null || d.lng === null);

        // Se não houver demandas com coordenadas, retorna sem otimizar
        if (demandasComGeom.length === 0) {
             return NextResponse.json({
                optimizedDemands: todasDemandas.map((d, index) => ({ ...d, ordem: index })),
                routePath: null,
                startPoint: START_END_POINT_COORDS
            }, { status: 200 });
        }

        let originCoordinates = START_END_POINT_COORDS; 
        if (userLocation && userLocation.latitude && userLocation.longitude) {
            originCoordinates = { latitude: userLocation.latitude, longitude: userLocation.longitude };
        }

        // 2. Lógica de Otimização Híbrida (Define quem é a primeira parada)
        let closestDemanda: (DemandaWithCoords & { lat: number, lng: number }) | null = null;
        let remainingDemandas: (DemandaWithCoords & { lat: number, lng: number })[] = [...demandasComGeom]; 
        let newOriginForApi = originCoordinates; 
        
        if (demandasComGeom.length > 0) {
            let minDistance = Infinity;
            let closestDemandaId: number | null = null;

            demandasComGeom.forEach((demanda) => {
                const distance = haversine(originCoordinates.latitude, originCoordinates.longitude, demanda.lat, demanda.lng);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestDemandaId = demanda.id!;
                }
            });

            if (closestDemandaId !== null) {
                closestDemanda = demandasComGeom.find(d => d.id === closestDemandaId) || null;
                if (closestDemanda) {
                    remainingDemandas = demandasComGeom.filter(d => d.id !== closestDemandaId);
                    newOriginForApi = { latitude: closestDemanda.lat, longitude: closestDemanda.lng };
                }
            }
        }
        
        // Helper para resposta final
        const buildResponse = (orderedGeom: DemandaWithCoords[], polyline: string | null) => {
            const final = [...orderedGeom, ...demandasSemGeom].map((d, index) => ({
                ...d,
                ordem: index,
                status_nome: d.status_nome || 'N/A',
                status_cor: d.status_cor || '#808080'
            }));

            return NextResponse.json({
                optimizedDemands: final,
                routePath: polyline,
                startPoint: { lat: originCoordinates.latitude, lng: originCoordinates.longitude } 
            }, { status: 200 });
        };

        // CASO A: Apenas 1 demanda com geometria (Retorno imediato + Linha reta)
        if (remainingDemandas.length === 0 && closestDemanda) {
             console.log("[API /rotas/optimize] Caso: 1 Demanda. Retornando direto.");
             const pathPoints: [number, number][] = [
                [originCoordinates.latitude, originCoordinates.longitude],
                [closestDemanda.lat, closestDemanda.lng],
                [originCoordinates.latitude, originCoordinates.longitude]
            ];
            return buildResponse([closestDemanda], encode(pathPoints));
        }

        // CASO B: Exatamente 2 demandas (1 Closest + 1 Remaining) - CORREÇÃO DO BUG
        if (remainingDemandas.length === 1 && closestDemanda) {
            console.log("[API /rotas/optimize] Caso: 2 Demandas. Usando lógica sequencial (sem otimização).");
            const otherDemanda = remainingDemandas[0];
            const orderedGeom = [closestDemanda, otherDemanda];

            // Chama Google APENAS para desenhar o trajeto na ordem que definimos
            const requestBody = {
                origin: { location: { latLng: { latitude: closestDemanda.lat, longitude: closestDemanda.lng } } }, 
                destination: { location: { latLng: START_END_POINT_COORDS } }, 
                intermediates: [
                    { location: { latLng: { latitude: otherDemanda.lat, longitude: otherDemanda.lng } } }
                ], 
                travelMode: 'DRIVE',
                routingPreference: 'TRAFFIC_AWARE',
                optimizeWaypointOrder: false // <--- IMPORTANTE: Desliga reordenação automática
            };

            const directionsResponse = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'routes.polyline'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await directionsResponse.json();
            const polyline = (directionsResponse.ok && data.routes?.[0]?.polyline?.encodedPolyline) || null;
            
            // Se falhar a API, fallback para linhas retas
            if (!polyline) {
                const manualPath = [
                    [originCoordinates.latitude, originCoordinates.longitude],
                    [closestDemanda.lat, closestDemanda.lng],
                    [otherDemanda.lat, otherDemanda.lng],
                    [originCoordinates.latitude, originCoordinates.longitude]
                ] as [number, number][];
                return buildResponse(orderedGeom, encode(manualPath));
            }

            return buildResponse(orderedGeom, polyline);
        }

        // CASO C: 3 ou mais demandas (Usa o algoritmo de otimização do Google)
        console.log("[API /rotas/optimize] Caso: 3+ Demandas. Usando otimização do Google.");
        const requestBody = {
            origin: { location: { latLng: newOriginForApi } }, 
            destination: { location: { latLng: START_END_POINT_COORDS } }, 
            intermediates: remainingDemandas.map(d => ({
                location: { latLng: { latitude: d.lat, longitude: d.lng } }
            })), 
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
            optimizeWaypointOrder: true // Otimização Ligada
        };

        const directionsResponse = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'routes.optimizedIntermediateWaypointIndex,routes.polyline'
            },
            body: JSON.stringify(requestBody)
        });

        const data: RoutesApiResponse = await directionsResponse.json();

        // Fallback genérico
        if (!directionsResponse.ok || data.error || !data.routes || data.routes.length === 0) {
            console.warn('[API /rotas/optimize] Falha na API. Usando ordem padrão.');
            const manualPath = [
                 [originCoordinates.latitude, originCoordinates.longitude],
                 ...demandasComGeom.map(d => [d.lat, d.lng] as [number, number]),
                 [originCoordinates.latitude, originCoordinates.longitude]
            ];
            return buildResponse(demandasComGeom, encode(manualPath));
        }

        const route = data.routes[0];
        const encodedPolyline = route.polyline?.encodedPolyline || null;
        
        let optimizedRemaining: DemandaWithCoords[];

        if (route.optimizedIntermediateWaypointIndex && route.optimizedIntermediateWaypointIndex.length > 0) {
            optimizedRemaining = route.optimizedIntermediateWaypointIndex.map(index => remainingDemandas[index]);
        } else {
            optimizedRemaining = remainingDemandas;
        }

        const orderedGeom = [closestDemanda!, ...optimizedRemaining];
        
        return buildResponse(orderedGeom, encodedPolyline);

    } catch (error) {
        console.error('[API /rotas/optimize] Erro:', error);
        return NextResponse.json({ message: 'Erro interno ao otimizar.' }, { status: 500 });
    }
}