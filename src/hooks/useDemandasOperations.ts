import { useState } from 'react';
import { DemandasClient } from '@/services/client/demandas-client';

export function useDemandasOperations(refreshData: () => void) {
  // Seus estados originais (NÃO MUDE OS NOMES)
  const [isProcessing, setIsProcessing] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const handleStatusChange = async (demandaId: number, newStatusId: number) => {
    setOpError(null);
    try {
      await DemandasClient.updateStatus(demandaId, newStatusId);
      refreshData(); 
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Erro ao atualizar status");
      throw err; 
    }
  };

  // --- FUNÇÃO CORRIGIDA ---
  const deleteDemandas = async (ids: number[]) => {
    if (ids.length === 0) return;
    
    // 1. Usa o nome correto da sua variável de estado
    setIsProcessing(true);
    setOpError(null); 

    try {
      // Fazemos o fetch manual aqui para poder ler o corpo do erro 409
      const response = await fetch('/api/demandas', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
      });

      const data = await response.json();

      if (!response.ok) {
          // Tratamento do 409 (Conflito de Rota)
          if (response.status === 409) {
              throw new Error(data.message || "Não é possível excluir demandas em uso.");
          }
          throw new Error(data.message || "Erro ao deletar demandas.");
      }

      refreshData(); // Sucesso!

    } catch (err) {
      // 2. Usa o nome correto da sua variável de erro
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setOpError(msg); 
    } finally {
      // 3. Usa o nome correto para parar o loading
      setIsProcessing(false);
    }
  };

  return {
    handleStatusChange,
    deleteDemandas,
    isProcessing, // Retorna isProcessing
    opError,      // Retorna opError
    clearError: () => setOpError(null)
  };
}