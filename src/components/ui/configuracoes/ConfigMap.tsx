// src/components/ui/configuracoes/ConfigMap.tsx
'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { LatLngExpression, LatLngTuple } from 'leaflet';
import { Box, Typography } from '@mui/material';

// --- CONFIGURAÇÃO DE ÍCONES (Padrão Leaflet) ---
// Corrige o bug dos ícones padrão não aparecerem no Next.js
const iconDefault = L.icon({
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Ícones coloridos para diferenciar Início (Verde) e Fim (Vermelho)
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

// --- COMPONENTE CONTROLADOR DO MAPA ---
// O Leaflet não atualiza o centro automaticamente quando as props mudam. 
// Precisamos desse componente auxiliar para "reagir" às mudanças de coordenadas.
const MapController = ({ inicio, fim }: { inicio: LatLngTuple, fim: LatLngTuple }) => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        const hasInicio = inicio[0] !== 0 && inicio[1] !== 0;
        const hasFim = fim[0] !== 0 && fim[1] !== 0;

        if (hasInicio && hasFim) {
            // Se tiver os dois, ajusta o zoom para mostrar ambos
            const bounds = L.latLngBounds([inicio, fim]);
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (hasInicio) {
            // Só início, centraliza lá
            map.setView(inicio, 14);
        } else if (hasFim) {
            // Só fim, centraliza lá
            map.setView(fim, 14);
        }

        // Força redesenho para evitar bugs visuais de tamanho
        map.invalidateSize();
    }, [map, inicio, fim]);

    return null;
};

// --- PROPS ---
interface Coord { lat: number; lng: number }
interface Props { inicio: Coord; fim: Coord; }

import { useGeolocation } from '@/hooks/use-geolocation';

// --- COMPONENTE PRINCIPAL ---
export default function ConfigMap({ inicio, fim }: Props) {
    // Busca localização do usuário (SP se falhar)
    const { latitude, longitude } = useGeolocation();

    // Coordenadas dinâmicas
    const defaultCenter: LatLngTuple = [latitude, longitude];

    // Converte objeto {lat, lng} para tupla [lat, lng] que o Leaflet prefere
    const posInicio: LatLngTuple = [inicio.lat, inicio.lng];
    const posFim: LatLngTuple = [fim.lat, fim.lng];

    const hasInicio = inicio.lat !== 0 || inicio.lng !== 0;
    const hasFim = fim.lat !== 0 || fim.lng !== 0;

    return (
        <Box sx={{ height: '480px', width: '640px', minHeight: '400px', border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden' }}>
            <MapContainer
                center={hasInicio ? posInicio : defaultCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* Marcador de Início */}
                {hasInicio && (
                    <Marker position={posInicio} icon={iconStart}>
                        <Popup>
                            <b>📍 Ponto de Início (Garagem)</b><br />
                            Lat: {inicio.lat}<br />
                            Lng: {inicio.lng}
                        </Popup>
                    </Marker>
                )}

                {/* Marcador de Fim */}
                {hasFim && (
                    <Marker position={posFim} icon={iconEnd}>
                        <Popup>
                            <b>🏁 Ponto de Chegada (Retorno)</b><br />
                            Lat: {fim.lat}<br />
                            Lng: {fim.lng}
                        </Popup>
                    </Marker>
                )}

                {/* Controlador para mover a câmera quando os inputs mudam */}
                <MapController inicio={posInicio} fim={posFim} />
            </MapContainer>
        </Box>
    );
}