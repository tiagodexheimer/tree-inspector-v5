import { useState, useCallback, useEffect, useRef } from 'react';

export function useRelatoriosData() {
    const [relatorios, setRelatorios] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Ref para evitar buscas duplicadas no mount (Strict Mode)
    const isInitialFetched = useRef(false);

    const fetchRelatorios = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/relatorios');
            if (!res.ok) throw new Error('Erro ao buscar relatórios');
            const data = await res.json();
            setRelatorios(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro desconhecido');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isInitialFetched.current) return;
        isInitialFetched.current = true;

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
        deleteRelatorio
    };
}
