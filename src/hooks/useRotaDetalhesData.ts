import { useState, useCallback, useEffect, useMemo } from 'react';
import { RotaDetalhesClient, DemandaComOrdem } from '@/services/client/rota-detalhes-client';
import { decode } from '@googlemaps/polyline-codec';

const START_END_POINT: [number, number] = [-29.8533191, -51.1789191];

export function useRotaDetalhesData(id: string) {
  const [rota, setRota] = useState<any | null>(null);
  const [demandas, setDemandas] = useState<DemandaComOrdem[]>([]);
  const [originalDemandas, setOriginalDemandas] = useState<DemandaComOrdem[]>([]);
  const [apiPolyline, setApiPolyline] = useState<string | null>(null); 
  const [originalApiPolyline, setOriginalApiPolyline] = useState<string | null>(null);
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
      setApiPolyline(data.encodedPolyline);
      setOriginalApiPolyline(data.encodedPolyline);
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

  // Lógica mais robusta para `routePath`.
  const routePath = useMemo(() => {
      // [FE LOG 5: START USEMEMO]
      console.log(`[FE LOG: USEMEMO START] Processando nova rota. apiPolyline está presente? ${!!apiPolyline}`); 

      // 1. Prioriza a decodificação da polyline se ela for uma string válida
      if (typeof apiPolyline === 'string') { // Verifica se é a string codificada
        try { 
            const decoded = decode(apiPolyline);
            if (decoded.length > 0) {
                 console.log(`[FE LOG: DECODE SUCCESS] Decodificação SUCESSO. Pontos: ${decoded.length}.`); 
                 return decoded; 
            } else {
                 console.warn(`[FE LOG: DECODE WARNING] Polilinha vazia. Prosseguindo para Fallback.`);
            }
        } catch (e) { 
            console.error("Erro ao decodificar polyline. Prosseguindo para Fallback.", e); 
        }
    } else if (Array.isArray(apiPolyline)) {
        // 2. Caso a API tenha retornado o Array Decodificado diretamente (fallback da API)
        // Otimização final resolveu o problema do oceano: a API agora envia o ARRAY DE COORDENADAS no fallback.
        if (apiPolyline.length > 0) {
             console.log(`[FE LOG: DIRECT ARRAY] Usando array decodificado (fallback da API). Pontos: ${apiPolyline.length}.`); 
             return apiPolyline;
        }
    }
    
    // 3. Fallback Manual Final (Linhas Retas)
    if (demandas.length === 0) {
        console.log(`[FE LOG: FALLBACK] Sem demandas. Retornando caminho vazio.`); 
        return [];
    }
    
    const manualPath: [number, number][] = [
        START_END_POINT,
        ...demandas
           .filter(d => d.lat !== null && d.lng !== null)
           .map(d => [d.lat!, d.lng!] as [number, number]),
        START_END_POINT
    ];
    
    console.log(`[FE LOG: FALLBACK SUCCESS] Usando caminho manual. Pontos: ${manualPath.length}.`); 
    return manualPath; 

}, [demandas, apiPolyline]);

  return {
    rota, demandas, setDemandas,
    originalDemandas, originalApiPolyline, setApiPolyline,
    isLoading, error, hasChanges, routePath,
    refresh: fetchDetalhes
  };
}