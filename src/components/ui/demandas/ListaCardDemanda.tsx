// src/components/ui/demandas/ListaCardDemanda.tsx
import CardDemanda from "./CardDemanda";
import { Box } from "@mui/material";

interface StatusOption {
    id: number;
    nome: string;
    cor: string;
}

import { DemandaType } from "@/types/demanda";

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
    availableStatus: StatusOption[];
}

export default function ListaCardDemanda({
    demandas,
    selectedDemandas,
    onSelectDemanda,
    onDelete,
    onEdit,
    onStatusChange,
    availableStatus
}: ListDemandaProps) {

    return (
        <Box
            sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 4,
                justifyContent: 'flex-start',
                width: '100%'
            }}
        >
            {demandas.map((demanda) => {
                const isSelected = demanda.id !== undefined && selectedDemandas.includes(demanda.id);
                const currentStatusId = demanda.id_status;

                return (
                    <Box
                        key={demanda.id}
                        sx={{
                            display: 'inline-block',
                            width: {
                                xs: '100%',   // TELAS PEQUENAS → cada card ocupa 100%
                                sm: '48%',    // TABLET → dois por linha (opcional)
                                md: '30%',    // DESKTOP → três por linha (opcional)
                            },
                        }}
                    >
                        <CardDemanda
                            {...demanda}
                            isSelected={isSelected}
                            onSelect={onSelectDemanda}
                            onDelete={onDelete}
                            onEdit={() => onEdit(demanda)}
                            currentStatusId={currentStatusId}
                            availableStatus={availableStatus}
                            onStatusChange={onStatusChange}
                        />
                    </Box>
                );
            })}

            {demandas.length === 0 && (
                <div style={{ width: '100%', textAlign: 'center', marginTop: '20px', color: 'grey' }}>
                    <p>Nenhuma demanda encontrada.</p>
                </div>
            )}
        </Box>
    );
}