import { useState, useCallback, useEffect, useMemo } from 'react';
// CORREÇÃO: Importar a interface do serviço, não da página
import { RotaDetalhesClient, DemandaComOrdem } from '@/services/client/rota-detalhes-client';
import { decode } from '@googlemaps/polyline-codec';

const START_END_POINT: [number, number] = [-29.8608, -51.1789];

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

  // Lógica de cálculo do mapa
  const hasChanges = useMemo(() => {
     if (demandas.length !== originalDemandas.length) return true;
     return demandas.some((d, i) => d.id !== originalDemandas[i]?.id);
  }, [demandas, originalDemandas]);

  const routePath = useMemo(() => {
      if (apiPolyline && !hasChanges) {
          try { return decode(apiPolyline); } catch (e) { console.error(e); }
      }
      if (demandas.length === 0) return [];
      
      return [
          START_END_POINT,
          ...demandas
             .filter(d => d.lat !== null && d.lng !== null)
             .map(d => [d.lat!, d.lng!] as [number, number]),
          START_END_POINT
      ];
  }, [demandas, apiPolyline, hasChanges]);

  return {
    rota, demandas, setDemandas,
    originalDemandas, originalApiPolyline, setApiPolyline,
    isLoading, error, hasChanges, routePath,
    refresh: fetchDetalhes
  };
}