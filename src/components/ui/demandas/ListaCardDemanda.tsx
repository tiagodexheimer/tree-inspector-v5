// src/components/ui/demandas/ListaCardDemanda.tsx
import { DemandaType } from "@/types/demanda";
import CardDemanda from "./CardDemanda";

interface ListDemandaProps {
    demandas: DemandaType[];
    selectedDemandas: number[];
    onSelectDemanda: (id: number) => void;
    // Add onDelete to the props interface (already done)
    onDelete: (id: number) => void;
}

// FIX: Add 'onDelete' to the function parameters
export default function ListaCardDemanda({ demandas, selectedDemandas, onSelectDemanda, onDelete }: ListDemandaProps){
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
                        // FIX: Pass the received 'onDelete' function down to CardDemanda
                        onDelete={onDelete}
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