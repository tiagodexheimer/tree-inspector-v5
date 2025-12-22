// src/components/ui/demandas/ListaCardDemanda.tsx
'use client';

import CardDemanda from "./CardDemanda";
import { Box } from "@mui/material";
import { DemandaType } from "@/types/demanda";

interface StatusOption {
    id: number;
    nome: string;
    cor: string;
}

interface DemandaComIdStatus extends DemandaType {
    id_status?: number | null;
    status_nome?: string;
    status_cor?: string;
    lat: number | null;
    lng: number | null;
}

interface ListDemandaProps {
    demandas: DemandaComIdStatus[];
    selectedDemandas: number[];
    onSelectDemanda: (id: number) => void;
    onDelete: (id: number) => void;
    onEdit: (demanda: DemandaComIdStatus) => void;
    onStatusChange: (demandaId: number, newStatusId: number) => Promise<void>;
    onView: (demanda: DemandaComIdStatus) => void;
    availableStatus: StatusOption[];
}

export default function ListaCardDemanda({
    demandas,
    selectedDemandas,
    onSelectDemanda,
    onDelete,
    onEdit,
    onStatusChange,
    onView,
    availableStatus
}: ListDemandaProps) {

    return (
        <Box
            sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 2, // Espaço entre os cards (16px)
                justifyContent: 'flex-start',
                width: '100%'
            }}
        >
            {demandas.map((demanda) => {
                const isSelected = demanda.id !== undefined && selectedDemandas.includes(demanda.id);

                return (
                    <Box
                        key={demanda.id}
                        sx={{
                            // Define quantos cards cabem na linha baseado no tamanho da tela
                            width: {
                                xs: '100%',                     // Mobile: 1 por linha
                                sm: 'calc(50% - 16px)',         // Tablet: 2 por linha
                                md: 'calc(33.333% - 16px)',     // Laptop: 3 por linha
                                lg: 'calc(25% - 16px)',         // Desktop: 4 por linha
                                xl: 'calc(20% - 16px)'          // Monitor Grande: 5 por linha
                            },
                            // Removemos minWidth fixo grande para permitir que caibam mais
                            minWidth: 250
                        }}
                    >
                        <CardDemanda
                            demanda={demanda}
                            selected={isSelected}
                            onSelect={() => demanda.id && onSelectDemanda(demanda.id)}
                            onDelete={onDelete}
                            onEdit={onEdit}
                            onStatusChange={onStatusChange}
                            onView={onView}
                            availableStatus={availableStatus}
                        />
                    </Box>
                );
            })}

            {demandas.length === 0 && (
                <div style={{ width: '100%', textAlign: 'center', marginTop: '40px', color: 'grey' }}>
                    <p>Nenhuma demanda encontrada.</p>
                </div>
            )}
        </Box>
    );
}