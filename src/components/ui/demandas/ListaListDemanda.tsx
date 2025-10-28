// src/components/ui/demandas/ListaListDemanda.tsx
'use client';
import { DemandaType } from "@/types/demanda";
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, Typography } from "@mui/material"; // Adicionado Typography
import StatusDemanda from "./StatusDemanda";

interface ListDemandaProps {
    demandas: DemandaType[];
    selectedDemandas: number[];
    onSelectDemanda: (id: number) => void;
    onSelectAll: () => void;
    numSelected: number;
    rowCount: number;
}

export default function ListaListDemanda({ demandas, selectedDemandas, onSelectDemanda }: ListDemandaProps){
    const formatPrazo = (date: Date | null | undefined): string => {
        // ... (função formatPrazo) ...
        if (date instanceof Date && !isNaN(date.getTime())) {
             try { return date.toLocaleDateString('pt-BR'); }
             catch (e) { console.error("Erro ao formatar data:", date, e); return 'Data inválida'; }
        }
        return 'N/A';
    };

    // Função para formatar o endereço completo a partir dos campos
    const formatEnderecoCompleto = (demanda: DemandaType): string => {
        const parts = [
            demanda.logradouro,
            demanda.numero ? `, ${demanda.numero}` : '', // Adiciona vírgula antes do número
            demanda.complemento ? ` - ${demanda.complemento}` : '',
            demanda.bairro ? `, ${demanda.bairro}` : '',
            demanda.cidade ? ` - ${demanda.cidade}` : '',
            demanda.uf ? `/${demanda.uf}` : '',
            demanda.cep ? ` (CEP: ${demanda.cep})` : ''
        ];
        return parts.filter(Boolean).join('').trim(); // Junta as partes, removendo nulos/vazios e espaços extras
    };


    return (
        <div className="flex flex-wrap gap-4" style={{ padding: "16px" }}>
            <TableContainer component={Paper}>
                <Table stickyHeader aria-label="Tabela de Demandas">
                    <TableHead>
                        <TableRow>
                            {/* Cabeçalhos Atualizados */}
                            <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Endereço Completo</TableCell> {/* Coluna única para endereço formatado */}
                            {/* Poderia ter colunas separadas: Logradouro, Número, Bairro, Cidade/UF */}
                            <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell> {/* Renomeado Descrição para Tipo */}
                            <TableCell sx={{ fontWeight: 'bold' }}>Prazo</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {demandas.map((demanda) => {
                            const isSelected = demanda.id !== undefined && selectedDemandas.includes(demanda.id);
                            return (
                                <TableRow
                                    key={demanda.id}
                                    hover
                                    selected={isSelected}
                                    onClick={() => onSelectDemanda(demanda.id!)}
                                    sx={{ cursor: 'pointer' }}
                                    aria-selected={isSelected}
                                >
                                    {/* Células Atualizadas */}
                                    <TableCell>{demanda.id}</TableCell>
                                    {/* Usa a função para formatar o endereço */}
                                    <TableCell>{formatEnderecoCompleto(demanda)}</TableCell>
                                    {/* Mostra o tipo da demanda em vez da descrição completa */}
                                    <TableCell>{demanda.tipo_demanda}</TableCell>
                                    <TableCell>{formatPrazo(demanda.prazo)}</TableCell>
                                    <TableCell>
                                        {demanda.status ? <StatusDemanda status={demanda.status} /> : 'N/A'}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {demandas.length === 0 && (
                            <TableRow>
                                {/* Ajustar colSpan para o número de colunas */}
                                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 4 }}>
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