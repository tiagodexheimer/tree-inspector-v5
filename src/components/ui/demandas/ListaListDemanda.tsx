// src/components/ui/demandas/ListaListDemanda.tsx
'use client';
// --- INÍCIO DA CORREÇÃO ---
// 1. Remove a importação do enum 'Status' e ajusta DemandaType (ou define a interface estendida)
import { DemandaType } from "@/types/demanda"; 
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, IconButton } from "@mui/material";
// 2. Importa o StatusDemanda (já estava correto)
import StatusDemanda from "./StatusDemanda";
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

// 3. Define as interfaces locais necessárias (copiadas de ListaCardDemanda/StatusDemanda)
// Interface para o tipo Status vindo da API
interface StatusOption {
    id: number;
    nome: string;
    cor: string;
}

// Interface atualizada para DemandaType para incluir id_status
interface DemandaComIdStatus extends DemandaType {
    id_status?: number | null;
    status_nome?: string; // Campos opcionais que podem vir do JOIN
    status_cor?: string;
}

// 4. Atualiza a interface de Props
interface ListDemandaProps {
    demandas: DemandaComIdStatus[]; // <-- Usa a interface estendida
    selectedDemandas: number[];
    onSelectDemanda: (id: number) => void;
    onSelectAll?: () => void;
    numSelected?: number;
    rowCount?: number;
    onDelete: (id: number) => void;
    onEdit: (demanda: DemandaComIdStatus) => void; // <-- Usa a interface estendida
    
    // 5. Atualiza as props de Status
    onStatusChange: (demandaId: number, newStatusId: number) => Promise<void>; // <-- Espera ID
    availableStatus: StatusOption[]; // <-- Adiciona prop
}

// 6. Recebe a nova prop 'availableStatus'
export default function ListaListDemanda({
    demandas,
    selectedDemandas,
    onSelectDemanda,
    onDelete,
    onEdit,
    onStatusChange,
    availableStatus, // <-- Recebe a prop aqui
    //onSelectAll,
    //numSelected,
    //rowCount
}: ListDemandaProps){
// --- FIM DA CORREÇÃO ---

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
                            
                            // --- INÍCIO DA CORREÇÃO ---
                            // 7. Pega o ID da demanda e o ID do status atual
                            const demandaId = demanda.id;
                            const currentStatusId = demanda.id_status; // <-- Usa id_status
                            // --- FIM DA CORREÇÃO ---

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

                                    {/* --- INÍCIO DA CORREÇÃO --- */}
                                    {/* 8. Célula do Status - Passa as props corretas para StatusDemanda */}
                                    <TableCell> 
                                        {demandaId !== undefined ? (
                                            <StatusDemanda
                                                demandaId={demandaId}
                                                currentStatusId={currentStatusId} // <-- Passa o ID do status
                                                availableStatus={availableStatus} // <-- Passa a lista de status
                                                onStatusChange={onStatusChange}    // <-- Passa a função (agora compatível)
                                            />
                                        ) : (
                                            'N/A' // Caso não haja status ou ID
                                        )}
                                    </TableCell>
                                    {/* --- FIM DA CORREÇÃO --- */}


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