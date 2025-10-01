import { DemandaType } from "@/types/demanda";
import CardDemanda from "./CardDemanda";

interface ListDemandaProps {
    demandas: DemandaType[];
    selectedDemandas: string[];
    onSelectDemanda: (id: string) => void;
}

export default function ListaCardDemanda({ demandas, selectedDemandas, onSelectDemanda }: ListDemandaProps){
    return (
        <div className="flex flex-wrap gap-4" style={{ padding: "16px" }}>
            {demandas.map((demanda) => (
                <CardDemanda 
                    key={demanda.ID} 
                    {...demanda} // Passa todas as props da demanda
                    isSelected={selectedDemandas.includes(demanda.ID)} // Informa se o card está selecionado
                    onSelect={onSelectDemanda} // Passa a função de seleção
                />
            ))}
        </div>
    );
}