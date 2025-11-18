import { useState } from 'react';
import { RotasClient } from '@/services/client/rotas-client';

export function useRotasOperations(onSuccess?: () => void) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const deleteRota = async (id: number) => {
    setIsProcessing(true);
    setOpError(null);
    try {
      await RotasClient.delete(id);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("[Hook useRotasOperations] Erro ao deletar:", err);
      setOpError(err instanceof Error ? err.message : 'Erro ao deletar rota.');
      throw err; // Re-lança para tratamento local se necessário
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    deleteRota,
    isProcessing,
    opError,
    clearError: () => setOpError(null)
  };
}