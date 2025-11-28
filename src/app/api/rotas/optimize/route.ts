// src/app/api/rotas/optimize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { DemandaType } from '@/types/demanda'; 
import { decode, encode } from '@googlemaps/polyline-codec'; // 'encode' necessário para fallback

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

// [MODIFICADO]: Interface para o tipo retornado do banco (agora com STATUS)
interface DemandaWithCoords extends DemandaType {
    lat: number;
    lng: number;
    status_nome?: string;
    status_cor?: string;
    id_status?: number | null;
}

// Função utilitária para calcular a distância (Haversine)
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em quilômetros
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
        console.error('[API /rotas/optimize] Erro: GOOGLE_MAPS_API_KEY não configurada.');
        return NextResponse.json({ message: 'Erro interno: Chave de API não configurada.' }, { status: 500 });
    }

    try {
        const body: OptimizeRequestBody = await request.json();
        const { demandaIds, userLocation } = body;

        if (!demandaIds || demandaIds.length === 0) {
            return NextResponse.json({ message: 'Nenhum ID de demanda fornecido.' }, { status: 400 });
        }

        // 1. Buscar coordenadas e STATUS completos
        const queryResult = await pool.query(
            `SELECT d.id, d.nome_solicitante, d.logradouro, d.numero, d.bairro, d.cidade, d.uf, d.cep, d.tipo_demanda, d.descricao, d.prazo, d.id_status, 
                    s.nome as status_nome, s.cor as status_cor,
                    ST_Y(d.geom) as lat, 
                    ST_X(d.geom) as lng
             FROM demandas d 
             LEFT JOIN demandas_status s ON d.id_status = s.id
             WHERE d.id = ANY($1::int[]) AND geom IS NOT NULL`, 
            [demandaIds]
        );

        const demandas: DemandaWithCoords[] = queryResult.rows as DemandaWithCoords[]; 
        let demandasComGeom = demandas.filter(d => d.lat && d.lng); 

        if (demandasComGeom.length === 0) {
             return NextResponse.json({ message: 'Nenhuma das demandas selecionadas possui coordenadas válidas para roteirizar.' }, { status: 400 });
        }

        let originCoordinates = START_END_POINT_COORDS; 
        if (userLocation && userLocation.latitude && userLocation.longitude) {
            originCoordinates = { latitude: userLocation.latitude, longitude: userLocation.longitude };
        }

        // --- Lógica de Otimização Híbrida (Encontrar o ponto mais próximo para ser a ORIGEM da rota) ---
        let closestDemanda: DemandaWithCoords | null = null;
        let remainingDemandas: DemandaWithCoords[] = [...demandasComGeom]; 
        let newOriginForApi = originCoordinates; 
        
        if (demandasComGeom.length > 0) {
            let minDistance = Infinity;
            let closestDemandaId: number | null | undefined = null;

            demandasComGeom.forEach((demanda) => {
                const distance = haversine(originCoordinates.latitude, originCoordinates.longitude, demanda.lat, demanda.lng);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestDemandaId = demanda.id;
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
        
        // Caso A: Apenas uma demanda (Ou a otimização só tem uma parada)
        if (remainingDemandas.length === 0 && closestDemanda) {
            console.log("[API /rotas/optimize] Apenas uma demanda, retornando caminho manual.");
            const pathPoints: [number, number][] = [
                [originCoordinates.latitude, originCoordinates.longitude],
                [closestDemanda.lat, closestDemanda.lng] as [number, number],
                [originCoordinates.latitude, originCoordinates.longitude]
            ];
            return NextResponse.json({
                optimizedDemands: [closestDemanda],
                routePath: encode(pathPoints), // Retornamos string ENCODED
                startPoint: { lat: originCoordinates.latitude, lng: originCoordinates.longitude } 
            }, { status: 200 });
        }
        
        // Fallback no caso improvável de closestDemanda ser null
        if (!closestDemanda) {
             closestDemanda = demandasComGeom[0];
             remainingDemandas = demandasComGeom.slice(1);
             newOriginForApi = { latitude: closestDemanda.lat, longitude: closestDemanda.lng };
        }
        
        // 3. Montar a requisição para a Google Routes API
        const newDirectionsUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
        
        const headers = {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.optimizedIntermediateWaypointIndex,routes.polyline'
        };

        const intermediatesForApi = remainingDemandas.map(d => ({
            location: {
                latLng: { 
                    latitude: d.lat,
                    longitude: d.lng 
                }
            }
        }));

        const requestBody = {
            origin: { location: { latLng: newOriginForApi } }, 
            destination: { location: { latLng: START_END_POINT_COORDS } }, 
            intermediates: intermediatesForApi, 
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
            optimizeWaypointOrder: true 
        };

        const directionsResponse = await fetch(newDirectionsUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        const data: RoutesApiResponse = await directionsResponse.json();

        // 4. Tratamento de Erro/Fallback (Retornar array decodificado para fallback)
        if (!directionsResponse.ok || data.error || !data.routes || data.routes.length === 0 || !data.routes[0].polyline?.encodedPolyline) {
            console.warn('[API /rotas/optimize] Falha na API de Roteamento ou resposta incompleta. Usando Fallback manual.');
            
            // Fallback: Linhas retas (usando array DECODED)
            const manualPathPoints: [number, number][] = [
                [originCoordinates.latitude, originCoordinates.longitude],
                ...demandasComGeom.map(d => [d.lat, d.lng] as [number, number]),
                [originCoordinates.latitude, originCoordinates.longitude]
            ];
            
            return NextResponse.json({
                optimizedDemands: demandasComGeom, // Retorna a lista original para não perder dados
                routePath: manualPathPoints,      // Retorna ARRAY DE COORDENADAS DECODIFICADAS
                startPoint: { lat: originCoordinates.latitude, lng: originCoordinates.longitude }
            }, { status: 200 });
        }
        
        // 5. Processar a resposta de SUCESSO
        const route = data.routes[0];
        const optimizedOrder: number[] = route.optimizedIntermediateWaypointIndex;
        const encodedPolyline = route.polyline.encodedPolyline;

        // 6. Criar a ordem FINAL (usando o array correto)
        const optimizedRemainingDemandasOrdenadas = optimizedOrder.map(index => remainingDemandas[index]);

        const firstDemand = closestDemanda ? [closestDemanda] : [];
        const optimizedDemandasOrdenadas = firstDemand.concat(optimizedRemainingDemandasOrdenadas)
            .filter((d): d is DemandaWithCoords => !!d)
            .map((d, index) => ({ 
                ...d, 
                ordem: index,
                status_nome: d.status_nome || 'N/A',
                status_cor: d.status_cor || '#808080'
            }));
        
        // 7. Retorna a STRING CODIFICADA (sucesso)
        console.log(`[API /rotas/optimize] Rota otimizada com sucesso.`);

        return NextResponse.json({
            optimizedDemands: optimizedDemandasOrdenadas, 
            routePath: encodedPolyline, // <--- Retorna a STRING ENCODED no sucesso
            startPoint: { lat: originCoordinates.latitude, lng: originCoordinates.longitude } 
        }, { status: 200 });

    } catch (error) {
        console.error('[API /rotas/optimize] Erro inesperado:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no servidor.';
        
        // Falha interna (500)
        return NextResponse.json({ 
            message: `Erro interno ao otimizar rota: ${errorMessage}`
        }, { status: 500 });
    }
}