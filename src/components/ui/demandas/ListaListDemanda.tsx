// src/components/ui/demandas/ListaListDemanda.tsx
'use client';
import { DemandaType } from "@/types/demanda"; // Importa o tipo DemandaType
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper } from "@mui/material";
import StatusDemanda from "./StatusDemanda"; // Importa o componente StatusDemanda

// Interface para as propriedades do componente
interface ListDemandaProps {
    demandas: DemandaType[];
    // Espera um array de números para os IDs selecionados
    selectedDemandas: number[];
    // Espera uma função que aceita um ID numérico
    onSelectDemanda: (id: number) => void;
    // Função para selecionar/desselecionar todos (não usada diretamente aqui, mas passada pelo pai)
    onSelectAll: () => void;
    numSelected: number;
    rowCount: number;
}

export default function ListaListDemanda({ demandas, selectedDemandas, onSelectDemanda }: ListDemandaProps){
    // Função auxiliar para formatar a data do prazo
    const formatPrazo = (date: Date | null | undefined): string => {
        if (!date) return 'N/A'; // Retorna 'N/A' se a data for nula ou indefinida
        // Verifica se é um objeto Date válido antes de formatar
        if (date instanceof Date && !isNaN(date.getTime())) {
             try {
                // Formata a data para o padrão pt-BR (DD/MM/AAAA)
                return date.toLocaleDateString('pt-BR');
             } catch (e) {
                console.error("Erro ao formatar data:", date, e);
                return 'Data inválida';
            }
        }
        console.warn("Valor de data inválido recebido:", date);
        return 'Data inválida';
    };

    return (
        <div className="flex flex-wrap gap-4" style={{ padding: "16px" }}>
            <TableContainer component={Paper}>
                <Table stickyHeader aria-label="Tabela de Demandas"> {/* Adicionado stickyHeader e aria-label */}
                    <TableHead>
                        <TableRow>
                            {/* Cabeçalhos das colunas */}
                            <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Endereço</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Descrição</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Prazo</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            {/* Poderia adicionar outras colunas como Responsável, etc. */}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {demandas.map((demanda) => {
                            // Verifica se o ID da demanda (que é número) está no array de selecionados
                            // Usa asserção de não-nulo (!) pois esperamos que demandas na lista tenham ID
                            const isSelected = demanda.id !== undefined && selectedDemandas.includes(demanda.id);
                            return (
                                <TableRow
                                    key={demanda.id}
                                    hover // Efeito visual ao passar o rato
                                    selected={isSelected} // Estilo visual para linha selecionada
                                    // Chama a função de seleção ao clicar na linha, passando o ID numérico
                                    onClick={() => onSelectDemanda(demanda.id!)}
                                    sx={{ cursor: 'pointer' }} // Indica que a linha é clicável
                                    aria-selected={isSelected} // Para acessibilidade
                                >
                                    {/* Células com os dados da demanda */}
                                    <TableCell>{demanda.id}</TableCell>
                                    <TableCell>{demanda.endereco}</TableCell>
                                    {/* Limita a descrição para evitar quebras de layout (opcional) */}
                                    <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {demanda.descricao}
                                    </TableCell>
                                    {/* Formata a data do prazo */}
                                    <TableCell>{formatPrazo(demanda.prazo)}</TableCell>
                                    <TableCell>
                                        {/* Renderiza o StatusDemanda se o status existir, senão 'N/A' */}
                                        {demanda.status ? <StatusDemanda status={demanda.status} /> : 'N/A'}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {/* Mensagem caso não hajam demandas (ex: após filtro) */}
                        {demandas.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 4 }}> {/* Ajustar colSpan se adicionar mais colunas */}
                                    Nenhuma demanda encontrada.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
}