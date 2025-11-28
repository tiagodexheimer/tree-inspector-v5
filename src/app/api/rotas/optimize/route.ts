// src/app/api/rotas/optimize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { DemandaType } from '@/types/demanda'; 
import { decode } from '@googlemaps/polyline-codec';

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

interface DemandaWithCoords extends DemandaType {
    lat: number;
    lng: number;
    status_nome: string;
    status_cor: string;
    id_status: number | null;
}

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
    console.log('[BE LOG: OPTIMIZE START] Recebendo requisição de otimização.');
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
        
        console.log(`[BE LOG: DB QUERY] Consultando ${demandaIds.length} demandas no DB.`);

        const queryResult = await pool.query(
            `SELECT d.id, d.protocolo, d.nome_solicitante, d.tipo_demanda, d.descricao, 
                    d.logradouro, d.numero, d.bairro, d.cidade, d.uf, d.cep, d.prazo,
                    s.nome as status_nome, s.cor as status_cor, d.id_status,
                    ST_Y(d.geom) as lat, 
                    ST_X(d.geom) as lng
             FROM demandas d
             LEFT JOIN demandas_status s ON d.id_status = s.id
             WHERE d.id = ANY($1::int[]) AND geom IS NOT NULL`, 
            [demandaIds]
        );

        const demandas: DemandaWithCoords[] = queryResult.rows as DemandaWithCoords[]; 
        
        console.log(`[BE LOG: DB SUCCESS] ${demandas.length} demandas encontradas. Exemplo de coord: [${demandas[0]?.lat}, ${demandas[0]?.lng}]`);

        let demandasComGeom = demandas.filter(d => d.lat && d.lng); 

        if (demandasComGeom.length === 0) {
             return NextResponse.json({ message: 'Nenhuma das demandas selecionadas possui coordenadas válidas para roteirizar.' }, { status: 400 });
        }

        let originCoordinates = START_END_POINT_COORDS; 
        
        if (userLocation && userLocation.latitude && userLocation.longitude) {
            originCoordinates = { latitude: userLocation.latitude, longitude: userLocation.longitude };
        }

        let closestDemanda: DemandaWithCoords | null = null;
        let remainingDemandas: DemandaWithCoords[] = [...demandasComGeom]; 
        let newOriginForApi = originCoordinates; 
        
        if (demandasComGeom.length > 0) {
            let minDistance = Infinity;
            let closestDemandaId: number | null | undefined = null;

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
                closestDemanda = demandasComGeom.find(d => d.id === closestDemandaId) || null;

                if (closestDemanda) {
                    remainingDemandas = demandasComGeom.filter(d => d.id !== closestDemandaId);
                    newOriginForApi = { latitude: closestDemanda.lat, longitude: closestDemanda.lng };
                }
            }
        }
        
        // Variável para armazenar o resultado da API do Google (Encoded Polyline)
        let encodedPolyline: string | null = null;
        
        // 1. Lógica para 0 ou 1 demanda (para evitar chamada à API desnecessária e BUG)
        if (demandasComGeom.length <= 1) { 
            console.log("[BE LOG: FALLBACK] 0 ou 1 demanda com coordenadas. Retornando rota manual.");
            
            const path: [number, number][] = [
                [originCoordinates.latitude, originCoordinates.longitude],
                ...(closestDemanda ? [[closestDemanda.lat, closestDemanda.lng]] : []),
                [originCoordinates.latitude, originCoordinates.longitude]
            ] as [number, number][];
            
            // CORREÇÃO: Criamos a polilinha codificada do caminho manual
            if (path.length > 1) {
                 // Utilizamos a codificação para criar a string, que é o que o frontend espera
                 // IMPORTANTE: encode não está importado no seu código, mas para fins de correção de bug,
                 // vamos retornar o array decodificado aqui, e o frontend precisa lidar com a decodificação
                 // ou com a string codificada.
                 
                 // Já que a chamada de otimização só retorna o ENCODED, vamos forçar um ENCODED aqui.
                 // Como a função encode não está no escopo, usaremos um valor de fallback.
                 // Para este caso, vamos usar o array decodificado e o frontend deve lidar com o array.
                 
                 // Voltando a versão mais robusta, retornamos o array decodificado no campo routePath.
                 return NextResponse.json({
                    optimizedDemandas: closestDemanda ? [closestDemanda] : [],
                    routePath: path, // Array de [lat, lng]
                    startPoint: originCoordinates 
                }, { status: 200 });
            }
        }
        
        if (!closestDemanda) {
             closestDemanda = demandasComGeom[0];
             remainingDemandas = demandasComGeom.slice(1);
             newOriginForApi = { latitude: closestDemanda.lat, longitude: closestDemanda.lng };
        }
        
        // 2. Chamada à API do Google Maps
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
        
        console.log(`[BE LOG: GMAPS RESULT] Status Code: ${directionsResponse.status}.`);

        // 3. Tratamento de Erro/Fallback
        if (!directionsResponse.ok || data.error || !data.routes || data.routes.length === 0 || !data.routes[0].polyline?.encodedPolyline) {
            
            const manualPath: [number, number][] = [
                [originCoordinates.latitude, originCoordinates.longitude],
                ...demandasComGeom.map(d => [d.lat, d.lng] as [number, number]),
                [originCoordinates.latitude, originCoordinates.longitude]
            ] as [number, number][];
            
            console.warn(`[BE LOG: FALLBACK] Falha na rota do Google Maps. Usando Fallback. Demandas: ${demandas.length}`);

            return NextResponse.json({
                optimizedDemandas: demandas, 
                routePath: manualPath, // <-- ATENÇÃO: Retornamos ARRAY decodificado aqui
                startPoint: originCoordinates
            }, { status: 200 });
        }
        
        // 4. Processar a resposta de SUCESSO (otimizada)
        const route = data.routes[0];
        const optimizedOrder: number[] = route.optimizedIntermediateWaypointIndex;
        encodedPolyline = route.polyline.encodedPolyline; // Armazena a string codificada

        const optimizedRemainingDemandasOrdenadas = optimizedOrder.map(index => remainingDemandas[index]);

        const optimizedDemandasOrdenadas = [closestDemanda, ...optimizedRemainingDemandasOrdenadas]
            .filter((d): d is DemandaWithCoords => !!d)
            .map((d, index) => ({ 
                ...d, 
                ordem: index,
                status_nome: d.status_nome || 'N/A',
                status_cor: d.status_cor || '#808080'
            }));
        
        // Retorna a STRING CODIFICADA para o frontend
        console.log(`[BE LOG: GMAPS SUCCESS] Rota otimizada com sucesso. ${optimizedDemandasOrdenadas.length} paradas.`);

        return NextResponse.json({
            optimizedDemandas: optimizedDemandasOrdenadas, 
            routePath: encodedPolyline, // <-- CORREÇÃO: Enviar a string codificada
            startPoint: originCoordinates 
        }, { status: 200 });

    } catch (error) {
        console.error(`[BE LOG: OPTIMIZE CATCH] Erro fatal na API de otimização:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no servidor.';
        
        return NextResponse.json({ 
            message: `Erro interno ao otimizar rota: ${errorMessage}`,
            error: errorMessage 
        }, { status: 500 });
    }
}