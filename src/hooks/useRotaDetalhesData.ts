// src/hooks/useRotaDetalhesData.ts
import { useState, useCallback, useEffect, useMemo } from 'react';
import { RotaDetalhesClient, DemandaComOrdem } from '@/services/client/rota-detalhes-client';
import { decode } from '@googlemaps/polyline-codec';

const START_END_POINT: [number, number] = [-29.8533191, -51.1789191];

// Tipo que o estado pode assumir (string para codificado, array para decodificado/fallback)
type PolylineState = string | [number, number][] | null;

export function useRotaDetalhesData(id: string) {
  const [rota, setRota] = useState<any | null>(null);
  const [demandas, setDemandas] = useState<DemandaComOrdem[]>([]);
  const [originalDemandas, setOriginalDemandas] = useState<DemandaComOrdem[]>([]);
  
  // [CRÍTICO]: Usamos o tipo ambíguo correto
  const [apiPolyline, setApiPolyline] = useState<PolylineState>(null); 
  
  const [originalApiPolyline, setOriginalApiPolyline] = useState<PolylineState>(null);
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
      
      // O encodedPolyline da API pode ser string ou null
      setApiPolyline(data.encodedPolyline || null); 
      setOriginalApiPolyline(data.encodedPolyline || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetalhes(); }, [fetchDetalhes]);

  // Lógica de cálculo de mudanças
  const hasChanges = useMemo(() => {
     if (demandas.length !== originalDemandas.length) return true;
     return demandas.some((d, i) => d.id !== originalDemandas[i]?.id);
  }, [demandas, originalDemandas]);

  // [CORREÇÃO CRÍTICA] Lógica de cálculo do routePath segura
  const routePath = useMemo(() => {
      
      // 1. Prioridade: Se for um ARRAY DE COORDENADAS (decoded/fallback), use-o.
      // O erro anterior (linha 62) é resolvido ao usar Array.isArray()
      if (Array.isArray(apiPolyline) && apiPolyline.length > 0) {
          return apiPolyline;
      }
      
      // 2. Decode: Se for uma STRING (encoded) e não houver mudanças não salvas.
      if (typeof apiPolyline === 'string' && apiPolyline.length > 0 && !hasChanges) {
          try { 
              const decoded = decode(apiPolyline);
              if (decoded.length > 0) return decoded;
          } catch (e) { 
              console.error("Erro ao decodificar Polyline:", e); 
          }
      }
      
      // 3. Fallback: Caminho manual (linhas retas)
      if (demandas.length === 0) return [];
      
      // Cria o array de coordenadas manualmente (Start -> Demandas -> End)
      return [
          START_END_POINT,
          ...demandas
             .filter(d => d.lat !== null && d.lng !== null) // Apenas pontos válidos
             .map(d => [d.lat!, d.lng!] as [number, number]),
          START_END_POINT
      ].filter(p => p !== null && p !== undefined) as [number, number][]; // Filtro defensivo final

  }, [demandas, apiPolyline, hasChanges]);

  return {
    rota, demandas, setDemandas,
    originalDemandas, originalApiPolyline, setApiPolyline,
    isLoading, error, hasChanges, routePath,
    refresh: fetchDetalhes
  };
}