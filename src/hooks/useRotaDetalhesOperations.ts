import { useState } from 'react';
import { RotaDetalhesClient } from '@/services/client/rota-detalhes-client';

export function useRotaDetalhesOperations(rotaId: string, onSuccessSave?: () => void) {
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const saveOrder = async (demandas: { id: number }[]) => {
    setIsSaving(true);
    setOpError(null);
    setSaveSuccess(false);
    try {
      await RotaDetalhesClient.reorder(rotaId, demandas);
      setSaveSuccess(true);
      if (onSuccessSave) onSuccessSave();
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

  return {
    saveOrder, exportToExcel,
    isSaving, isExporting, opError, saveSuccess, setSaveSuccess, setOpError
  };
}