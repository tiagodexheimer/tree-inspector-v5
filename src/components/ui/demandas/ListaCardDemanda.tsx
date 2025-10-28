// src/components/ui/demandas/ListaCardDemanda.tsx
import { DemandaType } from "@/types/demanda"; // Importa o tipo DemandaType
import CardDemanda from "./CardDemanda"; // Importa o componente CardDemanda

// Interface para as propriedades do componente
interface ListDemandaProps {
    demandas: DemandaType[];
    // Espera um array de números para os IDs selecionados
    selectedDemandas: number[];
    // Espera uma função que aceita um ID numérico
    onSelectDemanda: (id: number) => void;
}

export default function ListaCardDemanda({ demandas, selectedDemandas, onSelectDemanda }: ListDemandaProps){
    return (
        // Container flexível que quebra linha (wrap) e adiciona espaçamento (gap)
        <div className="flex flex-wrap gap-4" style={{ padding: "16px" }}>
            {/* Mapeia o array de demandas para renderizar um CardDemanda para cada uma */}
            {demandas.map((demanda) => {
                // Verifica se o ID da demanda atual (que é número) está no array de selecionados
                // Usa asserção de não-nulo (!) pois esperamos que demandas na lista tenham ID
                const isSelected = demanda.id !== undefined && selectedDemandas.includes(demanda.id);
                return (
                    <CardDemanda
                        key={demanda.id} // Chave única para o React
                        {...demanda} // Passa todas as propriedades da demanda (id, endereco, descricao, etc.)
                        isSelected={isSelected} // Informa ao CardDemanda se ele está selecionado
                        onSelect={onSelectDemanda} // Passa a função de seleção (que agora espera um número)
                    />
                );
            })}
             {/* Mensagem opcional se não houver demandas (ex: após filtro) */}
             {demandas.length === 0 && (
                <div style={{ width: '100%', textAlign: 'center', marginTop: '20px', color: 'grey' }}>
                    <p>Nenhuma demanda encontrada.</p>
                </div>
            )}
        </div>
    );
}