import { useState, useCallback } from 'react';
import { DemandasClient } from '@/services/client/demandas-client';
import { DemandaType } from '@/types/demanda';

export function useDemandasMapData() {
    const [demandasMap, setDemandasMap] = useState<DemandaType[]>([]);
    const [isLoadingMap, setIsLoadingMap] = useState(false);
    const [loaded, setLoaded] = useState(false); // Para evitar recarregar se já buscou

    const fetchAllDemandas = useCallback(async () => {
        if (loaded || isLoadingMap) return;

        setIsLoadingMap(true);
        try {
            // Busca com limite alto para o mapa geral
            // O endpoint list aceita params. Vamos passar limit=1000
            const response = await fetch('/api/demandas?limit=1000&page=1');
            const data = await response.json();
            
            if (data && data.demandas) {
                setDemandasMap(data.demandas);
                setLoaded(true);
            }
        } catch (error) {
            console.error("Erro ao carregar mapa:", error);
        } finally {
            setIsLoadingMap(false);
        }
    }, [loaded, isLoadingMap]);

    return {
        demandasMap,
        isLoadingMap,
        fetchMapData: fetchAllDemandas
    };
}