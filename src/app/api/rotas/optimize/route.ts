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

// [NOVO] Função utilitária para calcular a distância (Haversine) entre dois pontos
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

        // 1. Buscar coordenadas
        const queryResult = await pool.query(
            `SELECT id, nome_solicitante, logradouro, numero, bairro, cidade, uf, cep, tipo_demanda, descricao, prazo, id_status,
                   ST_Y(geom) as lat, 
                   ST_X(geom) as lng -- [MODIFICADO] Apenas lat/lng (mais rápido)
             FROM demandas 
             WHERE id = ANY($1::int[]) AND geom IS NOT NULL`, // Adiciona filtro para ter geom
            [demandaIds]
        );

        const demandas: DemandaWithCoords[] = queryResult.rows as DemandaWithCoords[]; 

        let demandasComGeom = demandas.filter(d => d.lat && d.lng); // Filtra por lat/lng válidos

        if (demandasComGeom.length === 0) {
             return NextResponse.json({ message: 'Nenhuma das demandas selecionadas possui coordenadas válidas para roteirizar.' }, { status: 400 });
        }

        // 2. Lógica do Ponto de Partida do Usuário
        let originCoordinates = START_END_POINT_COORDS; // Padrão
        
        if (userLocation && userLocation.latitude && userLocation.longitude) {
            console.log("[API /rotas/optimize] Usando localização do usuário como origem:", userLocation);
            originCoordinates = { latitude: userLocation.latitude, longitude: userLocation.longitude };
        } else {
            console.log("[API /rotas/optimize] Localização do usuário não recebida. Usando PONTO PADRÃO como origem.");
        }

        // --- INÍCIO DA NOVA LÓGICA DE OTIMIZAÇÃO HÍBRIDA (Forçar o mais próximo a ser o primeiro) ---
        
        let closestDemanda: DemandaWithCoords | null = null;
        let remainingDemandas: DemandaWithCoords[] = [...demandasComGeom]; 
        let newOriginForApi = originCoordinates; 
        
        if (demandasComGeom.length > 0) {
            let minDistance = Infinity;
            let closestDemandaId: number | null | undefined = null;

            // Encontra a demanda mais próxima da localização do usuário (originCoordinates)
            demandasComGeom.forEach((demanda) => {
                const distance = haversine(
                    originCoordinates.latitude, 
                    originCoordinates.longitude, 
                    demanda.lat, 
                    demanda.lng
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestDemandaId = demanda.id;
                }
            });

            if (closestDemandaId !== null) {
                // 1. Identifica o ponto mais próximo
                closestDemanda = demandasComGeom.find(d => d.id === closestDemandaId) || null;

                if (closestDemanda) {
                    // 2. Remove o ponto mais próximo da lista de intermediários a serem otimizados.
                    // [MODIFICADO]: Usando filter para evitar problemas de índice com splice
                    remainingDemandas = demandasComGeom.filter(d => d.id !== closestDemandaId);
                    
                    // 3. Define a localização do ponto mais próximo como a nova ORIGEM para o Google Routes.
                    newOriginForApi = { latitude: closestDemanda.lat, longitude: closestDemanda.lng };
                    console.log(`[API /rotas/optimize] Demanda mais próxima (ID: ${closestDemanda.id}) definida como NOVO PONTO DE ORIGEM para a otimização subsequente.`);
                }
            }
        }
        
        // Caso A: Apenas uma demanda (closestDemanda foi encontrado, mas remainingDemandas está vazio)
        if (remainingDemandas.length === 0 && closestDemanda) {
            console.log("[API /rotas/optimize] Apenas uma demanda, retornando-a.");
             // Nenhuma rota real para calcular. Retorna a demanda única.
            return NextResponse.json({
                optimizedDemands: [closestDemanda],
                routePath: '', 
                startPoint: { lat: originCoordinates.latitude, lng: originCoordinates.longitude } 
            }, { status: 200 });
        }
        
        // Fallback no caso improvável de closestDemanda ser null
        if (!closestDemanda) {
             closestDemanda = demandasComGeom[0];
             remainingDemandas = demandasComGeom.slice(1);
             newOriginForApi = { latitude: closestDemanda.lat, longitude: closestDemanda.lng };
             console.warn("[API /rotas/optimize] Fallback ativado: closestDemanda não definida. Usando a primeira demanda como início.");
        }
        
        // 3. Montar a requisição para a Google Routes API
        const newDirectionsUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
        
        const headers = {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.optimizedIntermediateWaypointIndex,routes.polyline'
        };

        // As demandas restantes serão os INTERMEDIÁRIOS a serem otimizados
        const intermediatesForApi = remainingDemandas.map(d => ({
            location: {
                latLng: { 
                    latitude: d.lat,
                    longitude: d.lng 
                }
            }
        }));

        const requestBody = {
            // ORIGEM: A demanda mais próxima (forçando a primeira parada)
            origin: { location: { latLng: newOriginForApi } }, 
            // DESTINO: A base (ponto final)
            destination: { location: { latLng: START_END_POINT_COORDS } }, 
            // INTERMEDIÁRIOS: As demandas restantes a serem otimizadas
            intermediates: intermediatesForApi, 
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
            optimizeWaypointOrder: true // Otimiza a ordem dos INTERMEDIÁRIOS
        };

        console.log(`[API /rotas/optimize] Chamando Google Routes API para otimizar ${remainingDemandas.length} paradas...`);
        
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

        // 5. Reordenar nosso array de demandas restantes (remainingDemandas) com os índices otimizados
        const optimizedRemainingDemandasOrdenadas = optimizedOrder.map(index => remainingDemandas[index]);

        // 6. Criar a ordem FINAL: [Demanda Mais Próxima] + [Demandas Otimizadas Restantes]
        const optimizedDemandasOrdenadas = [closestDemanda, ...optimizedRemainingDemandasOrdenadas]; 
        
        // 7. Decodificar a polilinha
        const routePath = decode(encodedPolyline);

        console.log(`[API /rotas/optimize] Rota otimizada com sucesso. A primeira parada é a mais próxima, e o restante está otimizado.`);

        return NextResponse.json({
            // A ordem agora é: [Mais Próxima] + [Restante Otimizado]
            optimizedDemands: optimizedDemandasOrdenadas, 
            routePath: routePath,             
            // O ponto de partida é a localização do usuário (real)
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