import { useState, useCallback, useEffect, useRef } from 'react';

export function useRelatoriosData() {
    const [relatorios, setRelatorios] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtros
    const [filtroRua, setFiltroRua] = useState('');
    const [filtroBairro, setFiltroBairro] = useState('');
    const [filtroNumero, setFiltroNumero] = useState('');
    const [debouncedFiltro, setDebouncedFiltro] = useState({ rua: '', numero: '' });

    // Metadados
    const [availableBairros, setAvailableBairros] = useState<string[]>([]);

    // Ref para evitar buscas duplicadas no mount (Strict Mode)
    const isInitialFetched = useRef(false);
    const isMetadataFetched = useRef(false);

    // Debounce
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedFiltro({ rua: filtroRua, numero: filtroNumero });
        }, 500);
        return () => clearTimeout(handler);
    }, [filtroRua, filtroNumero]);

    // Carregar metadados (Bairros)
    useEffect(() => {
        if (isMetadataFetched.current) return;
        isMetadataFetched.current = true;

        const loadMetadata = async () => {
            try {
                const res = await fetch('/api/demandas-bairros');
                if (res.ok) {
                    const data = await res.json();
                    setAvailableBairros(data);
                }
            } catch (e) {
                console.error("Erro ao carregar bairros:", e);
            }
        };
        loadMetadata();
    }, []);

    const fetchRelatorios = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (debouncedFiltro.rua) params.append('rua', debouncedFiltro.rua);
            if (filtroBairro) params.append('bairro', filtroBairro);
            if (debouncedFiltro.numero) params.append('numero', debouncedFiltro.numero);

            const queryString = params.toString();
            const res = await fetch(`/api/relatorios${queryString ? `?${queryString}` : ''}`);
            if (!res.ok) throw new Error('Erro ao buscar relatórios');
            const data = await res.json();
            setRelatorios(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro desconhecido');
        } finally {
            setIsLoading(false);
        }
    }, [debouncedFiltro, filtroBairro]);

    useEffect(() => {
        fetchRelatorios();
    }, [fetchRelatorios]);

    const deleteRelatorio = useCallback(async (id: number) => {
        try {
            const res = await fetch(`/api/relatorios/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Erro ao deletar");
            setRelatorios(prev => prev.filter((r: any) => r.id !== id));
            return true;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }, []);

    return {
        relatorios,
        isLoading,
        error,
        refresh: fetchRelatorios,
        deleteRelatorio,
        availableBairros,
        filters: {
            rua: filtroRua,
            setRua: setFiltroRua,
            bairro: filtroBairro,
            setBairro: setFiltroBairro,
            numero: filtroNumero,
            setNumero: setFiltroNumero
        }
    };
}
