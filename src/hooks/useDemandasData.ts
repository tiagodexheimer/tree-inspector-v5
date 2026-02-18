import { useState, useCallback, useEffect, useRef } from 'react';
import { DemandasClient } from '@/services/client/demandas-client';
import { DemandaComIdStatus } from '@/types/demanda';

export function useDemandasData() {
  const [demandas, setDemandas] = useState<DemandaComIdStatus[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Metadados
  const [availableStatus, setAvailableStatus] = useState<any[]>([]);
  const [availableTipos, setAvailableTipos] = useState<any[]>([]);
  const [availableBairros, setAvailableBairros] = useState<string[]>([]);

  // Filtros e Paginação
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<number[]>([]);
  const [filtroTipos, setFiltroTipos] = useState<string[]>([]);
  const [filtroBairros, setFiltroBairros] = useState<string[]>([]);
  const [debouncedFiltro, setDebouncedFiltro] = useState('');

  // Ref para evitar buscas duplicadas com os mesmos parâmetros
  const lastFetchParams = useRef<string>("");
  const isMetadataFetched = useRef<boolean>(false);

  // Debounce do texto - Só altera debouncedFiltro se houver mudança real
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFiltro(filtroTexto);
      setPage(1); // Reseta página ao filtrar
    }, 300);
    return () => clearTimeout(handler);
  }, [filtroTexto]);

  const fetchDemandas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await DemandasClient.getAll({
        page,
        limit,
        filtro: debouncedFiltro,
        statusIds: filtroStatus,
        tipoNomes: filtroTipos,
        bairros: filtroBairros
      });

      const formatted = data.demandas.map(d => ({
        ...d,
        prazo: d.prazo ? new Date(d.prazo) : null
      }));
      setDemandas(formatted);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedFiltro, filtroStatus, filtroTipos, filtroBairros]);

  // Efeito para carregar metadados APENAS UMA VEZ no mount
  useEffect(() => {
    if (isMetadataFetched.current) return;
    isMetadataFetched.current = true;

    const loadMetadata = async () => {
      try {
        const [statusData, tiposData, bairrosData] = await Promise.all([
          fetch('/api/demandas-status').then(r => r.json()),
          fetch('/api/demandas-tipos').then(r => r.json()),
          fetch('/api/demandas-bairros').then(r => r.json())
        ]);
        setAvailableStatus(statusData);
        setAvailableTipos(tiposData);
        setAvailableBairros(bairrosData);
      } catch (e) {
        console.error("Erro ao carregar metadados:", e);
      }
    };
    loadMetadata();
  }, []);

  // Efeito principal para carregar dados - Monitora mudanças nos filtros e paginação
  useEffect(() => {
    const currentParams = JSON.stringify({ page, limit, debouncedFiltro, filtroStatus, filtroTipos, filtroBairros });

    // Se os parâmetros forem idênticos ao da última busca, não faz nada
    if (lastFetchParams.current === currentParams) return;

    lastFetchParams.current = currentParams;
    fetchDemandas();
  }, [page, limit, debouncedFiltro, filtroStatus, filtroTipos, filtroBairros, fetchDemandas]);

  return {
    demandas,
    totalCount,
    isLoading,
    error,
    page,
    limit,
    setPage,
    availableStatus,
    availableTipos,
    availableBairros,
    filters: {
      texto: filtroTexto,
      setTexto: setFiltroTexto,
      status: filtroStatus,
      setStatus: setFiltroStatus,
      tipos: filtroTipos,
      setTipos: setFiltroTipos,
      bairros: filtroBairros,
      setBairros: setFiltroBairros
    },
    refresh: () => {
      // Força a limpeza do cache de parâmetros para permitir a atualização manual
      lastFetchParams.current = "";
      fetchDemandas();
    },
    setDemandas // Exposto para atualizações otimistas
  };
}
