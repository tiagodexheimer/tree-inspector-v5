import { useState, useCallback, useEffect } from 'react';
// CORREÇÃO: Importar RotaComContagem do serviço, onde ela foi definida
import { RotasClient, RotaComContagem } from '@/services/client/rotas-client';

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