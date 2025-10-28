// src/components/ui/demandas/MiniMap.tsx
'use client'; // Necessário para react-leaflet

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet'; // Importa a biblioteca Leaflet

// Corrige o problema do ícone padrão do Leaflet não aparecer
// (um problema comum com bundlers como Webpack/Vite/Turbopack)
const icon = L.icon({
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});


interface MiniMapProps {
    latitude: number;
    longitude: number;
    popupText?: string; // Texto opcional para o popup do marcador
}

const MiniMap: React.FC<MiniMapProps> = ({ latitude, longitude, popupText }) => {
    // Verifica se as coordenadas são válidas antes de renderizar
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
        console.error("Coordenadas inválidas recebidas:", latitude, longitude);
        return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee', color: '#777' }}>Coordenadas inválidas</div>;
    }

    const position: [number, number] = [latitude, longitude];

    return (
        <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} attributionControl={false} >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
             />
            <Marker position={position} icon={icon}>
                {popupText && <Popup>{popupText}</Popup>}
            </Marker>
        </MapContainer>
    );
}

export default MiniMap;