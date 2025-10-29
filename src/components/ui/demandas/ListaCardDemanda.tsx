// src/components/ui/demandas/ListaCardDemanda.tsx
// import { DemandaType, Status } from "@/types/demanda"; // Import Status (No longer needed if using StatusOption)
import CardDemanda from "./CardDemanda"; // <-- ADD THIS LINE
import StatusDemanda from "./StatusDemanda"; // Presuming StatusDemanda is needed by CardDemanda, keep if necessary

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
}

interface ListDemandaProps {
     demandas: DemandaComIdStatus[]; // Use the updated interface
     selectedDemandas: number[];
     onSelectDemanda: (id: number) => void;
     onDelete: (id: number) => void;
     onEdit: (demanda: DemandaComIdStatus) => void; // Adjust type here too
     onStatusChange: (demandaId: number, newStatusId: number) => Promise<void>; // Updated for ID
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
 }: ListDemandaProps){
     return (
         <div className="flex flex-wrap gap-4" style={{ padding: "16px" }}>
             {demandas.map((demanda) => {
                 const isSelected = demanda.id !== undefined && selectedDemandas.includes(demanda.id);
                 const demandaId = demanda.id; // For clarity
                 const currentStatusId = demanda.id_status; // <-- Use id_status

                 // Ensure CardDemanda receives all necessary props, including the new ones
                 return (
                     <CardDemanda
                         key={demanda.id}
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
                 );
             })}
              {demandas.length === 0 && (
                 <div style={{ width: '100%', textAlign: 'center', marginTop: '20px', color: 'grey' }}>
                     <p>Nenhuma demanda encontrada.</p>
                 </div>
             )}
         </div>
     );
 }

// *** Remember to also update CardDemanda.tsx ***
// to accept `currentStatusId` and `availableStatus` props and pass them down
// correctly to the <StatusDemanda /> component inside it.