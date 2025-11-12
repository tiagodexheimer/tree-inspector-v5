// src/components/ui/demandas/RouteMap.tsx
'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
// Importamos os tipos necessários do Leaflet
import L, { LatLngExpression, LatLngBoundsExpression, DivIcon } from 'leaflet';
import { DemandaType } from '@/types/demanda';

// Define o ponto de início/fim
const START_END_POINT: LatLngExpression = [-29.8608, -51.1789]; // [lat, lng]

// Ícone para o Ponto de Partida (mantido)
const iconStart = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// Componente interno para ajustar o zoom do mapa
const FitBounds: React.FC<{ bounds: LatLngBoundsExpression }> = ({ bounds }) => {
    const map = useMap();
    useEffect(() => {
        // ***** CORREÇÃO DO ERRO DE BUILD *****
        // Verificamos se 'bounds' é um array antes de checar 'bounds.length'
        if (Array.isArray(bounds) && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
        // ***** FIM DA CORREÇÃO *****
    }, [map, bounds]);
    return null;
};

// Props do componente principal (MODIFICADO)
interface RouteMapProps {
    demandas: DemandaType[];       // Demandas na ordem otimizada (Propriedade renomeada)
    path: [number, number][]; // Array de [lat, lng] da polilinha
}

// O componente agora desestrutura "demandas"
const RouteMap: React.FC<RouteMapProps> = ({ demandas, path }) => {
    
    // --- CORREÇÃO: Adicionar a guarda para evitar .map() em undefined ---
    if (!demandas) {
        console.error("RouteMap recebeu demandas como undefined. Retornando null.");
        return null;
    }
    // --- FIM CORREÇÃO ---


    // Cria os marcadores para as demandas (paradas)
    // Usa "demandas" no lugar de "demands"
    const demandMarkers = demandas.map((demanda, index) => {
        // Já que migramos para lat/lng diretos, precisamos verificar as novas props:
        const lat = (demanda as any).lat;
        const lng = (demanda as any).lng;
        
        if (typeof lat !== 'number' || typeof lng !== 'number') return null; // Use as novas props lat/lng
        
        // Leaflet usa [lat, lng]
        const position: LatLngExpression = [lat, lng];
        
        // Criar o ícone de Div numerado
        const numberedIcon = new DivIcon({
            className: 'numbered-marker-icon', // Classe CSS do globals.css
            html: `<b>${index + 1}</b>`,       // O número da parada
            iconSize: [20, 20],               // Tamanho do ícone
            iconAnchor: [10, 10]              // Ponto de âncora (centro)
        });

        // Usar o 'numberedIcon' no Marcador
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

    // Calcula os limites do mapa para o zoom (mantido)
    const bounds: LatLngBoundsExpression = path.length > 0 ? path : [START_END_POINT];

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
            
            {/* Linha da Rota (mantido) */}
            {path.length > 0 && <Polyline positions={path} color="blue" />}
            
            {/* Ajusta o Zoom (mantido) */}
            <FitBounds bounds={bounds} />
        </MapContainer>
    );
}

export default RouteMap;