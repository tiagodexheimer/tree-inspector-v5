import { useState, useEffect } from 'react';

interface LocationState {
    latitude: number;
    longitude: number;
    loading: boolean;
    error: string | null;
}

// Coordenadas de São Paulo como fallback padrão
const DEFAULT_COORDS = {
    latitude: -23.550520,
    longitude: -46.633308
};

export const useGeolocation = () => {
    const [location, setLocation] = useState<LocationState>({
        latitude: DEFAULT_COORDS.latitude,
        longitude: DEFAULT_COORDS.longitude,
        loading: true,
        error: null
    });

    useEffect(() => {
        if (!navigator.geolocation) {
            setLocation(prev => ({
                ...prev,
                loading: false,
                error: "Geolocalização não suportada pelo navegador."
            }));
            return;
        }

        const success = (position: GeolocationPosition) => {
            setLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                loading: false,
                error: null
            });
        };

        const error = (err: GeolocationPositionError) => {
            console.warn("Erro ao obter localização, usando padrão (SP):", err.message);
            setLocation({
                latitude: DEFAULT_COORDS.latitude,
                longitude: DEFAULT_COORDS.longitude,
                loading: false,
                error: err.message
            });
        };

        navigator.geolocation.getCurrentPosition(success, error, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });
    }, []);

    return location;
};
