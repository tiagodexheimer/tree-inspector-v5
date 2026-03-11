// src/components/ui/demandas/DraggableMap.tsx
'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import React, { useEffect, useState } from 'react';

// Corrige o problema do ícone padrão do Leaflet não aparecer
const icon = L.icon({
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface DraggableMapProps {
    latitude: number;
    longitude: number;
    onChange: (lat: number, lng: number) => void;
    height?: string;
}

// Componente para lidar com eventos do mapa (clique para mover marcador)
const MapEvents = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
};

// Componente para atualizar o centro do mapa quando as coordenadas mudam externamente
const ChangeView = ({ center }: { center: [number, number] }) => {
    const map = React.useMemo(() => null, []); // Placeholder
    const leafletMap = L.DomUtil.get('map') ? null : null; // Just to avoid unused
    // Real center update logic
    const mapInstance = useMapEvents({});
    useEffect(() => {
        mapInstance.setView(center, mapInstance.getZoom());
    }, [center, mapInstance]);
    return null;
};

const DraggableMap: React.FC<DraggableMapProps> = ({ latitude, longitude, onChange, height = '200px' }) => {
    const [position, setPosition] = useState<[number, number]>([latitude, longitude]);

    // Atualiza a posição interna quando as props mudam (ex: geocodificação automática)
    useEffect(() => {
        setPosition([latitude, longitude]);
    }, [latitude, longitude]);

    const handleMarkerDragEnd = (e: any) => {
        const marker = e.target;
        const newPos = marker.getLatLng();
        setPosition([newPos.lat, newPos.lng]);
        onChange(newPos.lat, newPos.lng);
    };

    const handleMapClick = (lat: number, lng: number) => {
        setPosition([lat, lng]);
        onChange(lat, lng);
    };

    return (
        <MapContainer
            center={position}
            zoom={16}
            style={{ height, width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
            scrollWheelZoom={true}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <Marker
                position={position}
                icon={icon}
                draggable={true}
                eventHandlers={{
                    dragend: handleMarkerDragEnd,
                }}
            />
            <MapEvents onMapClick={handleMapClick} />
            <ChangeView center={position} />
        </MapContainer>
    );
}

export default DraggableMap;
