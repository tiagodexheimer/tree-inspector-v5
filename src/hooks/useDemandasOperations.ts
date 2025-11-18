import { useState } from 'react';
import { DemandasClient } from '@/services/client/demandas-client';

export function useDemandasOperations(refreshData: () => void) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const handleStatusChange = async (demandaId: number, newStatusId: number) => {
    setOpError(null);
    try {
      await DemandasClient.updateStatus(demandaId, newStatusId);
      refreshData(); // Recarrega a lista após sucesso
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Erro ao atualizar status");
      throw err; // Re-lança para que o componente de UI possa reverter estado se necessário
    }
  };

  const deleteDemandas = async (ids: number[]) => {
    if (ids.length === 0) return;
    setIsProcessing(true);
    setOpError(null);
    try {
      await DemandasClient.deleteMany(ids);
      refreshData();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Erro ao deletar");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    handleStatusChange,
    deleteDemandas,
    isProcessing,
    opError,
    clearError: () => setOpError(null)
  };
}