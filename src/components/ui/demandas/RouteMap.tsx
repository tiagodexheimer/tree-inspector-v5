'use client';

import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { LatLngExpression, LatLngBoundsExpression, DivIcon } from 'leaflet';
import { DemandaType } from '@/types/demanda';

// Fallback visual apenas se tudo falhar (Esteio/RS)
const DEFAULT_FALLBACK: LatLngExpression = [-29.8533191, -51.1789191];

// --- Ícones (Mantidos) ---
const iconStart = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const iconEnd = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// Componentes Auxiliares (Mantidos)
const InvalidateSize: React.FC<{ trigger: boolean }> = ({ trigger }) => {
    const map = useMap();
    useEffect(() => {
        if (trigger && map) {
            map.invalidateSize();
            setTimeout(() => map.invalidateSize(), 300);
        }
    }, [map, trigger]);
    return null;
};

const FitBounds: React.FC<{ bounds: LatLngBoundsExpression }> = ({ bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (Array.isArray(bounds) && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [map, bounds]);
    return null;
};

// Interfaces
interface DemandaComCoordenadas extends DemandaType {
    lat: number | null;
    lng: number | null;
}

interface RouteMapProps {
    demandas: DemandaComCoordenadas[];
    path?: [number, number][]; // Opcional (se vier da API)
    startPoint?: { latitude: number; longitude: number } | null;
    endPoint?: { latitude: number; longitude: number } | null;
    modalIsOpen?: boolean;
}

const RouteMap: React.FC<RouteMapProps> = ({ 
    demandas, path, modalIsOpen = true, startPoint, endPoint 
}) => {

    // 1. Resolve Coordenadas de Início e Fim (Ou usa fallback)
    const startPos: [number, number] = startPoint 
        ? [startPoint.latitude, startPoint.longitude] 
        : (DEFAULT_FALLBACK as [number, number]);

    const endPos: [number, number] = endPoint 
        ? [endPoint.latitude, endPoint.longitude] 
        : (DEFAULT_FALLBACK as [number, number]);

    // 2. Calcula a Linha (Path)
    // Se "path" (da API) foi passado, usa ele. Se não, desenha linhas retas (Start -> Demandas -> End)
    const polylinePositions = useMemo(() => {
        if (path && path.length > 0) return path;

        // Constrói linha reta visual
        const points: [number, number][] = [startPos];
        demandas.forEach(d => {
            if (d.lat !== null && d.lng !== null) {
                points.push([d.lat, d.lng]);
            }
        });
        points.push(endPos);
        return points;
    }, [path, demandas, startPos, endPos]);

    // 3. Marcadores das Demandas
    const demandMarkers = demandas.map((demanda, index) => {
        if (typeof demanda.lat !== 'number' || typeof demanda.lng !== 'number') return null;
        const numberedIcon = new DivIcon({
            className: 'numbered-marker-icon',
            html: `<b>${index + 1}</b>`,
            iconSize: [20, 20], iconAnchor: [10, 10]
        });
        return (
            <Marker key={demanda.id} position={[demanda.lat, demanda.lng]} icon={numberedIcon}>
                <Popup><b>{`Parada ${index + 1}`}</b><br />{demanda.logradouro}</Popup>
            </Marker>
        );
    }).filter(Boolean);

    // 4. Limites para Zoom
    const bounds: LatLngBoundsExpression = [startPos, endPos, ...polylinePositions] as any;

    return (
        <MapContainer center={startPos} zoom={13} style={{ height: '100%', width: '100%', borderRadius: '8px' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />

            {/* Marcadores Início/Fim */}
            <Marker position={startPos} icon={iconStart}>
                <Popup><b>Início</b></Popup>
            </Marker>
            <Marker position={endPos} icon={iconEnd}>
                <Popup><b>Fim</b></Popup>
            </Marker>

            {demandMarkers}
            
            {/* Linha da Rota */}
            <Polyline positions={polylinePositions as LatLngExpression[]} color="blue" />

            <InvalidateSize trigger={!!modalIsOpen} />
            <FitBounds bounds={bounds} />
        </MapContainer>
    );
}

export default RouteMap;