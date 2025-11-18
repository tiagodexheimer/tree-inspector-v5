import { useState, useCallback, useEffect } from 'react';
import { DemandasClient } from '@/services/client/demandas-client';
import { DemandaComIdStatus } from '@/types/demanda';

export function useDemandasData() {
  const [demandas, setDemandas] = useState<DemandaComIdStatus[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros e Paginação
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<number[]>([]);
  const [filtroTipos, setFiltroTipos] = useState<string[]>([]);
  const [debouncedFiltro, setDebouncedFiltro] = useState('');

  // Debounce do texto
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
        tipoNomes: filtroTipos
      });
      
      // Tratamento de datas (pode ser movido para um utilitário)
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
  }, [page, limit, debouncedFiltro, filtroStatus, filtroTipos]);

  // Carrega inicial e quando filtros mudam
  useEffect(() => {
    fetchDemandas();
  }, [fetchDemandas]);

  return {
    demandas,
    totalCount,
    isLoading,
    error,
    page,
    limit,
    setPage,
    filters: {
        texto: filtroTexto,
        setTexto: setFiltroTexto,
        status: filtroStatus,
        setStatus: setFiltroStatus,
        tipos: filtroTipos,
        setTipos: setFiltroTipos
    },
    refresh: fetchDemandas,
    setDemandas // Exposto para atualizações otimistas
  };
}