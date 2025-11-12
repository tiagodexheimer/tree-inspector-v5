// src/components/ui/demandas/ListaCardDemanda.tsx
// import { DemandaType, Status } from "@/types/demanda"; // Import Status (No longer needed if using StatusOption)
import CardDemanda from "./CardDemanda";
import { Box } from "@mui/material"; // Importar Box para o container de rolagem

// Interface for the Status type coming from the API (if not already defined elsewhere)
interface StatusOption {
    id: number;
    nome: string;
    cor: string;
}

// Interface updated for DemandaType (assuming you added id_status)
import { DemandaType } from "@/types/demanda"; // Keep DemandaType import
interface DemandaComIdStatus extends DemandaType {
    id_status?: number | null;
    status_nome?: string;
    status_cor?: string;
    lat: number | null; // <-- ADICIONADO/CORRIGIDO
    lng: number | null; // <-- ADICIONADO/CORRIGIDO
}

interface ListDemandaProps {
    demandas: DemandaComIdStatus[]; // Use the updated interface
    selectedDemandas: number[];
    onSelectDemanda: (id: number) => void;
    onDelete: (id: number) => void;
    onEdit: (demanda: DemandaComIdStatus) => void; // Adjust type here too
    onStatusChange: (demandaId: number, newStatusId: number) => Promise<void>; // Prop for changing status ID
    availableStatus: StatusOption[]; // <-- New prop
}

export default function ListaCardDemanda({
    demandas,
    selectedDemandas,
    onSelectDemanda,
    onDelete,
    onEdit,
    onStatusChange,
    availableStatus // <-- Receive the prop
}: ListDemandaProps) {
    
    // NOTA: Para implementar a virtualização COMPLETA com react-window, 
    // a estrutura interna precisaria ser alterada (e.g., usando <FixedSizeList>).
    // Esta correção apenas melhora a experiência de rolagem do contêiner externo
    // e prepara o terreno para uma futura implementação de virtualização real.

    return (
        // [MODIFICADO]: Usar Box com overflow-y para criar um container de rolagem vertical.
        // A altura (e.g., 75vh) garante que apenas uma parte da lista seja renderizada, 
        // e o 'flex-wrap' foi substituído por 'flex-start' para manter os itens em linha, 
        // preparando para a virtualização.
        <Box 
            sx={{ 
                p: 2, 
                display: 'flex', 
                flexDirection: 'row', 
                flexWrap: 'wrap', // Mantido 'wrap' por enquanto para um layout adaptável sem virtualização de terceiros
                gap: 4, // Aumentei o gap para melhor visualização entre os cards
                maxHeight: 'calc(100vh - 220px)', // Altura máxima baseada no viewport menos header/toolbar/padding
                overflowY: 'auto', // Habilita a rolagem vertical
                justifyContent: 'flex-start'
            }}
        >
            {demandas.map((demanda) => {
                const isSelected = demanda.id !== undefined && selectedDemandas.includes(demanda.id);
                const currentStatusId = demanda.id_status; // <-- Use id_status

                // Ensure CardDemanda receives all necessary props, including the new ones
                return (
                    <div key={demanda.id} style={{ display: 'inline-block' }}> {/* Wrapper para flex-wrap */}
                        <CardDemanda
                            {...demanda} // Pass all demand data
                            isSelected={isSelected}
                            onSelect={onSelectDemanda}
                            onDelete={onDelete}
                            onEdit={() => onEdit(demanda)} // Pass the specific demanda to onEdit
                            // Pass updated props for StatusDemanda (handled inside CardDemanda)
                            currentStatusId={currentStatusId} // <-- Pass ID
                            availableStatus={availableStatus} // <-- Pass list
                            onStatusChange={onStatusChange}
                        />
                    </div>
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