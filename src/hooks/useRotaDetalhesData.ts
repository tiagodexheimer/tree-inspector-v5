import { useState, useCallback, useEffect, useMemo } from 'react';
import { RotaDetalhesClient, DemandaComOrdem } from '@/services/client/rota-detalhes-client';
import { decode } from '@googlemaps/polyline-codec';

// Fallback visual (Esteio/RS) - só usado se a API não mandar nada
const FALLBACK_POINT: [number, number] = [-29.8533191, -51.1789191];

type PolylineState = string | [number, number][] | null;

export function useRotaDetalhesData(id: string) {
  const [rota, setRota] = useState<any | null>(null);
  const [demandas, setDemandas] = useState<DemandaComOrdem[]>([]);
  const [originalDemandas, setOriginalDemandas] = useState<DemandaComOrdem[]>([]);
  
  const [apiPolyline, setApiPolyline] = useState<PolylineState>(null); 
  const [originalApiPolyline, setOriginalApiPolyline] = useState<PolylineState>(null);
  
  // [NOVO] Estados para guardar os pontos de início e fim vindos da API
  const [startPoint, setStartPoint] = useState<{latitude: number, longitude: number} | null>(null);
  const [endPoint, setEndPoint] = useState<{latitude: number, longitude: number} | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetalhes = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await RotaDetalhesClient.getById(id);
      
      setRota(data.rota);
      setDemandas(data.demandas);
      setOriginalDemandas(data.demandas);
      
      setApiPolyline(data.encodedPolyline || null); 
      setOriginalApiPolyline(data.encodedPolyline || null);

      // [CORREÇÃO] Captura os pontos retornados pelo Backend
      if (data.startPoint) setStartPoint(data.startPoint);
      if (data.endPoint) setEndPoint(data.endPoint);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetalhes(); }, [fetchDetalhes]);

  const hasChanges = useMemo(() => {
     if (demandas.length !== originalDemandas.length) return true;
     return demandas.some((d, i) => d.id !== originalDemandas[i]?.id);
  }, [demandas, originalDemandas]);

  // Calcula o caminho para o mapa (usando os pontos corretos)
  const routePath = useMemo(() => {
      // 1. Se tem polyline pronta da API, usa ela
      if (Array.isArray(apiPolyline) && apiPolyline.length > 0) {
          return apiPolyline;
      }
      
      if (typeof apiPolyline === 'string' && apiPolyline.length > 0 && !hasChanges) {
          try { 
              const decoded = decode(apiPolyline);
              if (decoded.length > 0) return decoded;
          } catch (e) { console.error("Erro decode:", e); }
      }
      
      // 2. Fallback: Constrói linha reta usando os pontos DINÂMICOS
      const start: [number, number] = startPoint 
          ? [startPoint.latitude, startPoint.longitude] 
          : FALLBACK_POINT;
          
      const end: [number, number] = endPoint 
          ? [endPoint.latitude, endPoint.longitude] 
          : FALLBACK_POINT;

      if (demandas.length === 0) return [];
      
      return [
          start,
          ...demandas
             .filter(d => d.lat !== null && d.lng !== null)
             .map(d => [d.lat!, d.lng!] as [number, number]),
          end
      ].filter(Boolean) as [number, number][];

  }, [demandas, apiPolyline, hasChanges, startPoint, endPoint]);

  return {
    rota, demandas, setDemandas,
    originalDemandas, originalApiPolyline, setApiPolyline,
    isLoading, error, hasChanges, routePath,
    refresh: fetchDetalhes,
    // [IMPORTANTE] Exporta os pontos para a página usar no mapa
    startPoint, 
    endPoint
  };
}