// src/components/ui/demandas/ListaCardDemanda.tsx
 import { DemandaType, Status } from "@/types/demanda"; // Import Status
 import CardDemanda from "./CardDemanda";

 interface ListDemandaProps {
     demandas: DemandaType[];
     selectedDemandas: number[];
     onSelectDemanda: (id: number) => void;
     onDelete: (id: number) => void;
     onEdit: (demanda: DemandaType) => void;
     onStatusChange: (demandaId: number, newStatus: Status) => Promise<void>; // Prop defined here
 }

 // FIX: Double-check that onStatusChange is included in the destructuring below
 export default function ListaCardDemanda({
     demandas,
     selectedDemandas,
     onSelectDemanda,
     onDelete,
     onEdit,
     onStatusChange // <-- Ensure this is present
 }: ListDemandaProps){
     return (
         <div className="flex flex-wrap gap-4" style={{ padding: "16px" }}>
             {demandas.map((demanda) => {
                 const isSelected = demanda.id !== undefined && selectedDemandas.includes(demanda.id);
                 return (
                     <CardDemanda
                         key={demanda.id}
                         {...demanda}
                         isSelected={isSelected}
                         onSelect={onSelectDemanda}
                         onDelete={onDelete}
                         onEdit={onEdit}
                         // This line causes the error if the 'onStatusChange' variable above is not defined
                         onStatusChange={onStatusChange} // <-- This usage looks correct
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