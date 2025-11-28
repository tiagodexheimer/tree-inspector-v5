// src/hooks/useRotasData.ts
import { useState, useCallback, useEffect } from 'react';
// CORREÇÃO: Importar RotaComContagem e a nova interface DemandaComOrdem do serviço
import { RotasClient, RotaComContagem, DemandaComOrdem } from '@/services/client/rotas-client';
import { decode } from '@googlemaps/polyline-codec';

// [NOVO] Interface para o estado da Rota/Mapa
interface RouteMapState {
  rota: RotaComContagem;
  demandas: DemandaComOrdem[];
  path: [number, number][];
}

const START_END_POINT: [number, number] = [-29.8533191, -51.1789191];

export function useRotasData() {
  const [rotas, setRotas] = useState<RotaComContagem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // [NOVOS ESTADOS]
  const [selectedRouteMap, setSelectedRouteMap] = useState<RouteMapState | null>(null);
  const [isLoadingRouteMap, setIsLoadingRouteMap] = useState(false);

  // [NOVO] Função para buscar detalhes de uma rota e atualizar o estado do mapa
  const fetchRouteDetailsForMap = useCallback(async (rotaId: number) => {
    setIsLoadingRouteMap(true);
    try {
        const data = await RotasClient.getRouteDetails(rotaId);
        
        // 1. Decodificar a polyline
        let routePath: [number, number][] = [];
        if (data.encodedPolyline) {
             try { 
                routePath = decode(data.encodedPolyline); 
             } catch (e) {
                 console.error("Erro ao decodificar polyline:", e);
             }
        }
        
        // 2. Se não houver polyline (erro ou API Key), gera o caminho direto.
        if (routePath.length === 0) {
            routePath = [
                START_END_POINT,
                ...data.demandas
                   .filter(d => d.lat !== null && d.lng !== null)
                   .map(d => [d.lat!, d.lng!] as [number, number]),
                START_END_POINT
            ];
        }

        setSelectedRouteMap({
            rota: data.rota,
            demandas: data.demandas,
            path: routePath
        });

    } catch (err) {
        console.error("[Hook useRotasData] Erro ao buscar detalhes da rota para o mapa:", err);
        // Não jogamos erro para não bloquear a lista, apenas o mapa fica indisponível
    } finally {
        setIsLoadingRouteMap(false);
    }
  }, []); // Sem dependências internas

  const fetchRotas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await RotasClient.getAll();
      setRotas(data);

      // [MODIFICADO] Carrega a primeira rota por padrão no mapa
      if (data.length > 0) {
         // Não esperamos o resultado aqui, deixamos ele rodar em paralelo.
         fetchRouteDetailsForMap(data[0].id);
      } else {
         setSelectedRouteMap(null); // Limpa se não houver rotas
      }

    } catch (err) {
      console.error("[Hook useRotasData] Erro:", err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar rotas.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchRouteDetailsForMap]);

  useEffect(() => {
    fetchRotas();
  }, [fetchRotas]);

  return {
    rotas,
    isLoading,
    error,
    refresh: fetchRotas,
    setRotas,
    
    // [NOVOS RETORNOS]
    selectedRouteMap,
    isLoadingRouteMap,
    fetchRouteDetailsForMap // Expondo a função para ser chamada ao clicar na lista
  };
}