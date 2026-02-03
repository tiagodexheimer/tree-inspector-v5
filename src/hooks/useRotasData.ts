import { useState, useCallback, useEffect, useRef } from 'react';
import { RotasClient, RotaComContagem, DemandaComOrdem } from '@/services/client/rotas-client';
import { decode } from '@googlemaps/polyline-codec';

interface SelectedRouteState {
    rota: RotaComContagem;
    demandas: DemandaComOrdem[];
    path: [number, number][];
    startPoint?: { latitude: number; longitude: number } | null;
    endPoint?: { latitude: number; longitude: number } | null;
}

export function useRotasData() {
    const [rotas, setRotas] = useState<RotaComContagem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedRouteMap, setSelectedRouteMap] = useState<SelectedRouteState | null>(null);
    const [isLoadingRouteMap, setIsLoadingRouteMap] = useState(false);

    // [NOVO] Estado para configuração global (Padrão)
    const [globalConfig, setGlobalConfig] = useState<{ inicio: { lat: number, lng: number }, fim: { lat: number, lng: number } } | null>(null);

    // Ref para evitar buscas duplicadas no mount (Strict Mode)
    const isInitialFetched = useRef(false);

    const fetchRotas = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // 1. Busca Rotas e Configuração Global em Paralelo
            const [rotasData, configRes] = await Promise.all([
                RotasClient.getAll(),
                fetch('/api/gerenciar/configuracoes')
            ]);

            setRotas(rotasData);

            if (configRes.ok) {
                const configData = await configRes.json();
                // ✅ CORREÇÃO: O campo correto é configuracaoRota
                if (configData && configData.configuracaoRota) {
                    setGlobalConfig(configData.configuracaoRota);
                }
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro desconhecido.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isInitialFetched.current) return;
        isInitialFetched.current = true;

        fetchRotas();
    }, [fetchRotas]);

    const fetchRouteDetailsForMap = useCallback(async (id: number) => {
        setIsLoadingRouteMap(true);
        try {
            const data = await RotasClient.getRouteDetails(id);


            let path: [number, number][] = [];
            if (data.encodedPolyline) {
                try {
                    path = decode(data.encodedPolyline);
                } catch (e) {
                    console.error("Erro decode polyline", e);
                }
            }

            setSelectedRouteMap({
                rota: data.rota,
                demandas: data.demandas,
                path,
                startPoint: data.startPoint,
                endPoint: data.endPoint
            });

        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingRouteMap(false);
        }
    }, []);

    return {
        rotas,
        isLoading,
        error,
        refresh: fetchRotas,
        selectedRouteMap,
        isLoadingRouteMap,
        fetchRouteDetailsForMap,
        // [NOVO] Exporta a config global
        globalConfig
    };
}