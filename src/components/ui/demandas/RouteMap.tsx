// src/components/ui/demandas/RouteMap.tsx
'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
// Importamos os tipos necessários do Leaflet
import L, { LatLngExpression, LatLngBoundsExpression, DivIcon } from 'leaflet';
import { DemandaType } from '@/types/demanda';

// Define o ponto de início/fim
const START_END_POINT: LatLngExpression = [-29.8533191, -51.1789191]; // [lat, lng]

// [CRÍTICO: CORRIGIDO] Componente para forçar o Leaflet a recalcular o tamanho (Com Cleanup)
const InvalidateSize: React.FC<{ trigger: boolean }> = ({ trigger }) => {
    const map = useMap();
    useEffect(() => {
        let timeoutId: NodeJS.Timeout | undefined; // Variável para armazenar o ID do timeout

        if (trigger) {
            // Força o ajuste imediato
            if (map) {
                map.invalidateSize();
            }

            // Força o reajuste após a transição do modal terminar (evita bug de tamanho)
            timeoutId = setTimeout(() => map.invalidateSize(), 300);
        }

        // Função de limpeza (cleanup): cancela o timeout se o componente desmontar
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };

    }, [map, trigger]); // Depende apenas do mapa e do trigger
    return null;
};

// Corrige o problema do ícone padrão do Leaflet não aparecer
const _icon = L.icon({
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});


// Ícone para o Ponto de Partida (mantido)
const iconStart = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});


// Interface para garantir a presença de lat/lng
interface DemandaComCoordenadas extends DemandaType {
    lat: number | null;
    lng: number | null;
}

// Componente interno para ajustar o zoom do mapa
const FitBounds: React.FC<{ bounds: LatLngBoundsExpression }> = ({ bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (Array.isArray(bounds) && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [map, bounds]);
    return null;
};

// Props do componente principal
interface RouteMapProps {
    demandas: DemandaComCoordenadas[];
    path: [number, number][];
    modalIsOpen?: boolean;
    isMobile?: boolean;     
}

// CORREÇÃO: path recebe valor padrão []
const RouteMap: React.FC<RouteMapProps> = ({ demandas, path = [], modalIsOpen = true, isMobile = false }) => {


    if (!demandas) {
        console.error("RouteMap recebeu demandas como undefined. Retornando null.");
        return null;
    }

    // Cria os marcadores para as demandas (paradas)
    const demandMarkers = demandas.map((demanda, index) => {
        const lat = demanda.lat;
        const lng = demanda.lng;

        // Verifica se a coordenada é válida
        if (typeof lat !== 'number' || typeof lng !== 'number' || lat === null || lng === null) return null;

        const position: LatLngExpression = [lat, lng];

        const numberedIcon = new DivIcon({
            className: 'numbered-marker-icon', // Classe CSS do globals.css
            html: `<b>${index + 1}</b>`,       // O número da parada
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        return (
            <Marker key={demanda.id} position={position} icon={numberedIcon}>
                <Popup>
                    <b>{`Parada ${index + 1}: Demanda #${demanda.id}`}</b><br />
                    {demanda.logradouro}, {demanda.numero}<br />
                    {demanda.bairro}
                </Popup>
            </Marker>
        );
    }).filter(Boolean); // Remove nulos

    // [FILTRO CRÍTICO]: Cria o array filtrado, removendo qualquer elemento nulo/undefined
    const polylinePositions = path.filter(p => p !== null && p !== undefined);

    // Calcula os limites do mapa para o zoom (USANDO O ARRAY FILTRADO)
    const bounds: LatLngBoundsExpression = polylinePositions.length > 0 ? polylinePositions : [START_END_POINT];

    return (
        <MapContainer center={START_END_POINT} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%', borderRadius: '8px' }} attributionControl={false}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* Marcador de Início/Fim (mantido) */}
            <Marker position={START_END_POINT} icon={iconStart}>
                <Popup><b>Ponto de Partida/Chegada</b><br />Rua Eng. Hener de Souza Nunes, 150</Popup>
            </Marker>

            {/* Marcadores das Demandas (agora numerados) */}
            {demandMarkers}

            {/* Linha da Rota (USANDO O ARRAY FILTRADO) */}
            {polylinePositions.length > 0 && <Polyline positions={polylinePositions as LatLngExpression[]} color="blue" />}

            {/* Componentes de Controle do Mapa */}
            <InvalidateSize trigger={modalIsOpen || isMobile} />
            <FitBounds bounds={bounds} />
        </MapContainer>
    );
}

export default RouteMap;