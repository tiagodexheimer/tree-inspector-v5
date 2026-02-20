import { useState, useCallback } from 'react';
import { DemandaType } from '@/types/demanda';

export function useDemandasMapData() {
    const [demandasMap, setDemandasMap] = useState<DemandaType[]>([]);
    const [isLoadingMap, setIsLoadingMap] = useState(false);

    const fetchAllDemandas = useCallback(async (filters?: any) => {
        setIsLoadingMap(true);
        try {
            const query = new URLSearchParams();
            query.append('limit', '1000');
            query.append('page', '1');

            if (filters) {
                if (filters.texto) query.append('filtro', filters.texto);
                if (filters.status?.length) query.append('statusIds', filters.status.join(','));
                if (filters.tipos?.length) query.append('tipoNomes', filters.tipos.join(','));
                if (filters.bairros?.length) query.append('bairros', filters.bairros.join(','));
            }

            const response = await fetch(`/api/demandas?${query}`);
            const data = await response.json();

            if (data && data.demandas) {
                setDemandasMap(data.demandas);
            }
        } catch (error) {
            console.error("Erro ao carregar mapa:", error);
        } finally {
            setIsLoadingMap(false);
        }
    }, []);

    return {
        demandasMap,
        isLoadingMap,
        fetchMapData: fetchAllDemandas
    };
}