import { useState, useCallback, useEffect } from 'react';
import { RotasClient } from '@/services/client/rotas-client';
import { RotaComContagem } from '@/app/rotas/page'; // Ajuste o import conforme necessário

export function useRotasData() {
  const [rotas, setRotas] = useState<RotaComContagem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRotas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await RotasClient.getAll();
      setRotas(data);
    } catch (err) {
      console.error("[Hook useRotasData] Erro:", err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar rotas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRotas();
  }, [fetchRotas]);

  return {
    rotas,
    isLoading,
    error,
    refresh: fetchRotas,
    setRotas // Exposto para atualizações otimistas ou manuais
  };
}