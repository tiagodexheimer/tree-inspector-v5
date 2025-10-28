// src/components/ui/demandas/ListaListDemanda.tsx
'use client';
// Importa Status junto com DemandaType
import { DemandaType, Status } from "@/types/demanda";
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, IconButton } from "@mui/material";
// Importa StatusDemanda
import StatusDemanda from "./StatusDemanda";
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit'; // Presumindo que EditIcon já foi importado

interface ListDemandaProps {
    demandas: DemandaType[];
    selectedDemandas: number[];
    onSelectDemanda: (id: number) => void;
    // Props opcionais que podem ou não estar sendo usadas, mantidas por segurança
    onSelectAll?: () => void;
    numSelected?: number;
    rowCount?: number;
    // Funções de ação
    onDelete: (id: number) => void;
    onEdit: (demanda: DemandaType) => void;
    // Nova prop para mudança de status
    onStatusChange: (demandaId: number, newStatus: Status) => Promise<void>;
}

// Recebe a nova prop onStatusChange
export default function ListaListDemanda({
    demandas,
    selectedDemandas,
    onSelectDemanda,
    onDelete,
    onEdit,
    onStatusChange, // Recebe a função aqui
    // Inclui props opcionais se estiverem definidas na interface
    onSelectAll,
    numSelected,
    rowCount
}: ListDemandaProps){

    // Função para formatar prazo (mantida como estava)
    const formatPrazo = (date: Date | null | undefined): string => {
        if (date instanceof Date && !isNaN(date.getTime())) {
            try { return date.toLocaleDateString('pt-BR'); }
            catch { return 'Data inválida'; }
        }
        return 'Não definido';
    };

    // Função para formatar endereço (mantida como estava)
    const formatEnderecoCompleto = (d: DemandaType): string => {
        const parts = [
            d.logradouro,
            d.numero ? `, ${d.numero}` : '',
            d.complemento ? ` - ${d.complemento}` : '',
            d.bairro ? ` - ${d.bairro}` : '',
            d.cidade && d.uf ? ` - ${d.cidade}/${d.uf}` : (d.cidade || d.uf || ''),
            d.cep ? ` - CEP: ${d.cep}` : ''
        ];
        const formatted = parts.filter(Boolean).join('').trim();
        return formatted.startsWith(', ') ? formatted.substring(2) :
               formatted.startsWith(' - ') ? formatted.substring(3) :
               formatted || 'Endereço não informado';
    };

    return (
        // A div externa pode precisar de estilos, ex: padding, se não vierem da página pai
        <div>
            <TableContainer component={Paper}>
                <Table stickyHeader aria-label="Tabela de Demandas">
                    <TableHead>
                        <TableRow>
                            {/* Ajuste os cabeçalhos conforme necessário */}
                            <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Endereço Completo</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Prazo</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {demandas.map((demanda) => {
                            // Verifica se a linha está selecionada
                            const isSelected = demanda.id !== undefined && selectedDemandas.includes(demanda.id);
                            // Garante que temos o ID e o Status para passar ao StatusDemanda
                            const demandaId = demanda.id;
                            const currentStatus = demanda.status;

                            return (
                                <TableRow
                                    key={demanda.id}
                                    hover
                                    selected={isSelected}
                                    // onClick={() => onSelectDemanda(demanda.id!)} // Opcional: remover se seleção for por checkbox (não implementado aqui)
                                    sx={{ '& td': { borderColor: 'rgba(224, 224, 224, 1)' } }}
                                    aria-selected={isSelected}
                                >
                                    {/* Células de dados */}
                                    {/* Adiciona cursor pointer e onClick para seleção */}
                                    <TableCell onClick={() => demandaId !== undefined && onSelectDemanda(demandaId)} sx={{ cursor: 'pointer' }}>{demanda.id}</TableCell>
                                    <TableCell onClick={() => demandaId !== undefined && onSelectDemanda(demandaId)} sx={{ cursor: 'pointer' }}>{formatEnderecoCompleto(demanda)}</TableCell>
                                    <TableCell onClick={() => demandaId !== undefined && onSelectDemanda(demandaId)} sx={{ cursor: 'pointer' }}>{demanda.tipo_demanda}</TableCell>
                                    <TableCell onClick={() => demandaId !== undefined && onSelectDemanda(demandaId)} sx={{ cursor: 'pointer' }}>{formatPrazo(demanda.prazo)}</TableCell>

                                    {/* Célula do Status - Renderiza o componente StatusDemanda */}
                                    <TableCell> {/* onClick foi removido desta célula */}
                                        {currentStatus && demandaId !== undefined ? (
                                            <StatusDemanda
                                                demandaId={demandaId}
                                                currentStatus={currentStatus}
                                                onStatusChange={onStatusChange} // Passa a função recebida
                                            />
                                        ) : (
                                            'N/A' // Caso não haja status ou ID
                                        )}
                                    </TableCell>

                                    {/* Célula de Ações (Editar e Deletar) */}
                                    <TableCell align="right">
                                        <IconButton
                                            aria-label={`Editar demanda ${demanda.id}`}
                                            color="primary"
                                            onClick={(e) => {
                                                e.stopPropagation(); // Impede seleção da linha
                                                onEdit(demanda); // Chama a função onEdit passada
                                            }}
                                            title="Editar Demanda"
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            aria-label={`Excluir demanda ${demanda.id}`}
                                            color="error"
                                            onClick={(e) => {
                                                e.stopPropagation(); // Impede seleção da linha
                                                // Garante que ID existe antes de chamar onDelete
                                                if (demandaId !== undefined) {
                                                    onDelete(demandaId);
                                                }
                                            }}
                                            title="Excluir Demanda"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {/* Linha para quando não há demandas */}
                        {demandas.length === 0 && (
                            <TableRow>
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