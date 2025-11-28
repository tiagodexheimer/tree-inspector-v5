// src/hooks/useRotaDetalhesOperations.ts
import { useState } from 'react';
import { RotaDetalhesClient, DemandaComOrdem } from '@/services/client/rota-detalhes-client'; 
import { DemandasClient } from '@/services/client/demandas-client'; 
import { OptimizedRouteData } from '@/types/demanda'; 

// Usamos refreshData (ou refresh) do hook de dados para atualizar a tela principal
export function useRotaDetalhesOperations(rotaId: string, refreshData: () => void) {
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false); // NOVO ESTADO
  const [opError, setOpError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const saveOrder = async (demandas: { id: number }[]) => {
    setIsSaving(true);
    setOpError(null);
    setSaveSuccess(false);
    try {
      await RotaDetalhesClient.reorder(rotaId, demandas);
      setSaveSuccess(true);
      refreshData();
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    setOpError(null);
    try {
      const blob = await RotaDetalhesClient.exportXls(rotaId);
      
      // Lógica de download no navegador
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rota_${rotaId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setOpError(err instanceof Error ? err.message : "Erro ao exportar.");
    } finally {
      setIsExporting(false);
    }
  };
  
  // [ADICIONADO] Adicionar demandas
  const addDemandas = async (demandaIds: number[]): Promise<DemandaComOrdem[]> => {
      setIsSaving(true);
      setOpError(null);
      setSaveSuccess(false);
      try {
          const newDemandas = await RotaDetalhesClient.addDemandas(rotaId, demandaIds);
          setSaveSuccess(true);
          return newDemandas; 
      } catch (err) {
          setOpError(err instanceof Error ? err.message : "Erro ao adicionar demandas à rota.");
          throw err; 
      } finally {
          setIsSaving(false);
      }
  };

  // [CORREÇÃO CRÍTICA] Função de otimização
  const optimizeOrder = async (demandaIds: number[]): Promise<OptimizedRouteData> => {
    setIsOptimizing(true);
    setOpError(null);
    try {
        const result = await DemandasClient.optimizeRoute(demandaIds);
        return result; // <--- RETURN no sucesso
    } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao otimizar rota.";
        setOpError(message);
        throw new Error(message); // <--- THROW CRÍTICO para o TypeScript
    } finally {
        setIsOptimizing(false);
    }
  };

  return {
    saveOrder, exportToExcel, addDemandas, optimizeOrder,
    isSaving, isExporting, isOptimizing, 
    opError, saveSuccess, setSaveSuccess, setOpError
  };
}