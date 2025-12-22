'use client';

import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { LatLngExpression, LatLngBoundsExpression, DivIcon } from 'leaflet';
import { DemandaType } from '@/types/demanda';
import { useGeolocation } from '@/hooks/use-geolocation';

const iconDefault = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

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
            // Força um segundo ajuste rápido para garantir que o Leaflet não "pule"
            const timer = setTimeout(() => {
                map.fitBounds(bounds, { padding: [50, 50] });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [map, bounds]);
    return null;
};

interface DemandaComCoordenadas extends DemandaType {
    lat: number | null;
    lng: number | null;
}

interface RouteMapProps {
    demandas: DemandaComCoordenadas[];
    path?: [number, number][];
    startPoint?: { latitude: number; longitude: number } | null;
    endPoint?: { latitude: number; longitude: number } | null;
    modalIsOpen?: boolean;
    viewMode?: 'route' | 'points';
    onMarkerClick?: (demanda: DemandaComCoordenadas) => void;
}

const RouteMap: React.FC<RouteMapProps> = ({
    demandas, path, modalIsOpen = true, startPoint, endPoint, viewMode = 'route', onMarkerClick
}) => {
    const { latitude, longitude } = useGeolocation();
    const fallbackPos: [number, number] = [latitude, longitude];

    const startPos: [number, number] = startPoint
        ? [startPoint.latitude, startPoint.longitude]
        : fallbackPos;

    const endPos: [number, number] = endPoint
        ? [endPoint.latitude, endPoint.longitude]
        : fallbackPos;

    const polylinePositions = useMemo(() => {
        if (viewMode === 'points') return [];
        if (path && path.length > 0) return path;
        const points: [number, number][] = [startPos];
        demandas.forEach(d => {
            if (d.lat !== null && d.lng !== null) points.push([d.lat, d.lng]);
        });
        points.push(endPos);
        return points;
    }, [path, demandas, startPos, endPos, viewMode]);

    const demandMarkers = demandas.map((demanda, index) => {
        if (typeof demanda.lat !== 'number' || typeof demanda.lng !== 'number') return null;

        let iconToUse;
        if (viewMode === 'points') {
            iconToUse = iconDefault;
        } else {
            iconToUse = new DivIcon({
                className: 'numbered-marker-icon',
                html: `<b>${index + 1}</b>`,
                iconSize: [20, 20], iconAnchor: [10, 10]
            });
        }

        return (
            <Marker
                key={demanda.id}
                position={[demanda.lat, demanda.lng]}
                icon={iconToUse}
                eventHandlers={{
                    click: () => {
                        if (onMarkerClick) onMarkerClick(demanda);
                    }
                }}
            >
                <Popup>
                    <b>{viewMode === 'route' ? `Parada ${index + 1}` : `Demanda #${demanda.id}`}</b><br />
                    {demanda.logradouro}, {demanda.numero}<br />
                    <span style={{ fontSize: '0.8em', color: '#666', cursor: 'pointer' }}>
                        Clique para detalhes
                    </span>
                </Popup>
            </Marker>
        );
    }).filter(Boolean);

    const pointsForBounds: [number, number][] = demandas
        .filter(d => d.lat !== null && d.lng !== null)
        .map(d => [d.lat!, d.lng!] as [number, number]);

    if (viewMode === 'route') {
        pointsForBounds.push(startPos);
        pointsForBounds.push(endPos);
    }

    const bounds: LatLngBoundsExpression = pointsForBounds.length > 0
        ? pointsForBounds as any
        : [fallbackPos];

    return (
        <MapContainer center={fallbackPos as LatLngExpression} zoom={13} style={{ height: '100%', width: '100%', borderRadius: '8px' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />

            {viewMode === 'route' && (
                <>
                    <Marker position={startPos} icon={iconStart}><Popup><b>Início</b></Popup></Marker>
                    <Marker position={endPos} icon={iconEnd}><Popup><b>Fim</b></Popup></Marker>
                </>
            )}

            {demandMarkers}

            {viewMode === 'route' && polylinePositions.length > 0 && (
                <Polyline positions={polylinePositions as LatLngExpression[]} color="blue" />
            )}

            <InvalidateSize trigger={!!modalIsOpen} />
            <FitBounds bounds={bounds} />
        </MapContainer>
    );
}

export default RouteMap;