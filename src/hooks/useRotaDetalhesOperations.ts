import { useState } from 'react';
// Importa DemandaComOrdem (para o retorno) e DemandasClient (para otimizar)
import { RotaDetalhesClient, DemandaComOrdem } from '@/services/client/rota-detalhes-client';
import { DemandasClient } from '@/services/client/demandas-client'; 
import { OptimizedRouteData } from '@/types/demanda'; 

export function useRotaDetalhesOperations(rotaId: string, refreshData: () => void) {
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // [NOVO] Estado para otimização
  const [isOptimizing, setIsOptimizing] = useState(false);
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

  // [NOVO] Função de otimização
const optimizeOrder = async (demandaIds: number[]): Promise<OptimizedRouteData> => {
    setIsOptimizing(true);
    setOpError(null);
    try {
        console.log(`[FE LOG: OP START] Chamando otimização para IDs: [${demandaIds.join(', ')}]`);
        
        const result = await DemandasClient.optimizeRoute(demandaIds);
        
        console.log(`[FE LOG: OP SUCCESS] Otimização SUCESSO.`);
        console.log(`[FE LOG: OP RESULT] Demandas retornadas: ${result.optimizedDemandas.length}`);
        
        // CORREÇÃO: Log mais seguro para evitar a quebra "substring is not a function"
        const polylineInfo = typeof result.routePath === 'string'
           ? `${result.routePath.substring(0, 50)}... (Comprimento: ${result.routePath.length})`
           : `[ARRAY de Coords] (Comprimento: ${Array.isArray(result.routePath) ? result.routePath.length : 'N/A'})`;
        
        console.log(`[FE LOG: OP RESULT] Polyline (Início): ${polylineInfo}`);

        return result; 
    } catch (err) {
        // ... (resto do bloco catch)
    } finally {
        setIsOptimizing(false);
    }
};


  return {
    saveOrder, exportToExcel, addDemandas, 
    optimizeOrder, // <-- Novo retorno
    isSaving, isExporting, isOptimizing, // <-- Novo estado
    opError, saveSuccess, setSaveSuccess, setOpError
  };
}