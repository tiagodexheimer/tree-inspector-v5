import { DemandaType } from "@/types/demanda";
import CardDemanda from "./CardDemanda";


export default function ListaCardDemanda({ demandas }: { demandas: DemandaType[] }){
    return (
            <div className="flex flex-wrap gap-4" style={{ padding: "16px" }}>
                {demandas.map((demanda) => (
                    <CardDemanda key={demanda.ID} 
                    ID={demanda.ID} 
                    endereco={demanda.endereco} 
                    descricao={demanda.descricao} 
                    prazo={demanda.prazo} 
                    status={demanda.status} 
                    responsavel={demanda.responsavel} 
                    contato={demanda.contato} />
                ))}
            </div>
    );
}
