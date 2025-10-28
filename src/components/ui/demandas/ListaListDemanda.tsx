// src/components/ui/demandas/ListaListDemanda.tsx
'use client';
import { DemandaType } from "@/types/demanda";
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, IconButton } from "@mui/material"; // Adicionado IconButton
import StatusDemanda from "./StatusDemanda";
import DeleteIcon from '@mui/icons-material/Delete'; // Importa o ícone

interface ListDemandaProps {
    demandas: DemandaType[];
    selectedDemandas: number[];
    onSelectDemanda: (id: number) => void;
    onSelectAll: () => void;
    numSelected: number;
    rowCount: number;
    // Adiciona a prop para a função de deleção
    onDelete: (id: number) => void;
}

export default function ListaListDemanda({ demandas, selectedDemandas, onSelectDemanda, onDelete }: ListDemandaProps){
    const formatPrazo = (date: Date | null | undefined): string => {
        if (date instanceof Date && !isNaN(date.getTime())) {
            try { return date.toLocaleDateString('pt-BR'); }
            catch { return 'Data inválida'; }
        }
        return 'Não definido';
    };

    const formatEnderecoCompleto = (d: DemandaType): string => {
        const parts = [
            d.logradouro,
            d.numero ? `, ${d.numero}` : '',
            d.complemento ? ` - ${d.complemento}` : '',
            d.bairro ? ` - ${d.bairro}` : '',
            d.cidade && d.uf ? ` - ${d.cidade}/${d.uf}` : (d.cidade || d.uf || ''),
            d.cep ? ` - CEP: ${d.cep}` : ''
        ];
        // Filtra partes vazias e junta, removendo vírgulas ou hífens extras no início
        const formatted = parts.filter(Boolean).join('').trim();
        // Remove qualquer separador redundante no início, se houver
        return formatted.startsWith(', ') ? formatted.substring(2) :
               formatted.startsWith(' - ') ? formatted.substring(3) :
               formatted || 'Endereço não informado';
    };

    return (
        <div /* ... */>
            <TableContainer component={Paper}>
                <Table stickyHeader aria-label="Tabela de Demandas">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Endereço Completo</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Prazo</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            {/* Nova coluna para ações */}
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">Ações</TableCell>
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
                                    // onClick={() => onSelectDemanda(demanda.id!)} // Pode remover o onClick da linha inteira se preferir
                                    sx={{ '& td': { borderColor: 'rgba(224, 224, 224, 1)' } }} // Estilo para bordas
                                    aria-selected={isSelected}
                                >
                                    {/* Células de dados */}
                                    <TableCell onClick={() => onSelectDemanda(demanda.id!)} sx={{ cursor: 'pointer' }}>{demanda.id}</TableCell>
                                    <TableCell onClick={() => onSelectDemanda(demanda.id!)} sx={{ cursor: 'pointer' }}>{formatEnderecoCompleto(demanda)}</TableCell>
                                    <TableCell onClick={() => onSelectDemanda(demanda.id!)} sx={{ cursor: 'pointer' }}>{demanda.tipo_demanda}</TableCell>
                                    <TableCell onClick={() => onSelectDemanda(demanda.id!)} sx={{ cursor: 'pointer' }}>{formatPrazo(demanda.prazo)}</TableCell>
                                    <TableCell onClick={() => onSelectDemanda(demanda.id!)} sx={{ cursor: 'pointer' }}>
                                        {demanda.status ? <StatusDemanda status={demanda.status} /> : 'N/A'}
                                    </TableCell>
                                    {/* Célula de Ações */}
                                    <TableCell align="right">
                                        <IconButton
                                            aria-label={`Excluir demanda ${demanda.id}`}
                                            color="error"
                                            onClick={(e) => {
                                                e.stopPropagation(); // Impede que o clique na linha seja acionado
                                                onDelete(demanda.id!); // Chama a função onDelete passada pelo pai
                                            }}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                        {/* Poderia adicionar botão de Editar aqui também */}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {demandas.length === 0 && (
                            <TableRow>
                                {/* Ajusta colSpan */}
                                <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 4 }}>
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