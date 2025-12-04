'use client';

import { DemandaType } from "@/types/demanda";
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Paper, IconButton, Box, useMediaQuery, useTheme, Button
} from "@mui/material";
import StatusDemanda from "./StatusDemanda";
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

interface StatusOption {
    id: number;
    nome: string;
    cor: string;
}

interface DemandaComIdStatus extends DemandaType {
    id_status?: number | null;
    status_nome?: string;
    status_cor?: string;
    lat: number | null;
    lng: number | null;
}

interface ListDemandaProps {
    demandas: DemandaComIdStatus[];
    selectedDemandas: number[];
    onSelectDemanda: (id: number) => void;
    onDelete: (id: number) => void;
    onEdit: (demanda: DemandaComIdStatus) => void;
    onStatusChange: (demandaId: number, newStatusId: number) => Promise<void>;
    availableStatus: StatusOption[];
}

export default function ListaListDemanda({
    demandas,
    selectedDemandas,
    onSelectDemanda,
    onDelete,
    onEdit,
    onStatusChange,
    availableStatus
}: ListDemandaProps) {

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
        const formatted = parts.filter(Boolean).join('').trim();
        return formatted.startsWith(', ') ? formatted.substring(2) :
            formatted.startsWith(' - ') ? formatted.substring(3) :
                formatted || 'Endereço não informado';
    };

    // ============================================================
    // 📱 MOBILE VIEW — Cards verticais
    // ============================================================
    if (isMobile) {
        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 1 }}>
                {demandas.map((demanda) => {
                    const demandaId = demanda.id!;
                    const isSelected = selectedDemandas.includes(demandaId);

                    return (
                        <Paper
                            key={demanda.id}
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                boxShadow: isSelected ? 4 : 1,
                                border: isSelected ? "2px solid #1976d2" : "1px solid #ddd"
                            }}
                            onClick={() => onSelectDemanda(demandaId)}
                        >
                            {/* TÍTULO - PROTOCOLO */}
                            <Box sx={{ fontWeight: 700, fontSize: "1rem", mb: 1 }}>
                                {demanda.protocolo || `ID: ${demanda.id}`}
                            </Box>

                            <Box sx={{ mb: 1 }}>
                                <strong>Endereço:</strong><br />
                                {formatEnderecoCompleto(demanda)}
                            </Box>

                            <Box sx={{ mb: 1 }}>
                                <strong>Tipo:</strong> {demanda.tipo_demanda}
                            </Box>

                            <Box sx={{ mb: 1 }}>
                                <strong>Prazo:</strong> {formatPrazo(demanda.prazo)}
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <strong>Status:</strong>
                                <Box sx={{ mt: 0.5 }}>
                                    <StatusDemanda
                                        demandaId={demandaId}
                                        currentStatusId={demanda.id_status}
                                        availableStatus={availableStatus}
                                        onStatusChange={onStatusChange}
                                    />
                                </Box>
                            </Box>

                            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                                <IconButton color="primary" onClick={(e) => { e.stopPropagation(); onEdit(demanda); }}>
                                    <EditIcon />
                                </IconButton>
                                <IconButton color="error" onClick={(e) => { e.stopPropagation(); onDelete(demandaId); }}>
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        </Paper>
                    );
                })}
                {demandas.length === 0 && <Box sx={{ textAlign: "center", mt: 4, color: "text.secondary" }}>Nenhuma demanda encontrada.</Box>}
            </Box>
        );
    }

    // ============================================================
    // 🖥️ DESKTOP VIEW — Tabela completa
    // ============================================================
    return (
        <TableContainer component={Paper} sx={{ boxShadow: 'none', overflowX: 'auto', overflowY: 'visible' }}>
            <Table stickyHeader aria-label="Tabela de Demandas">
                <TableHead>
                    <TableRow>
                        {/* [ALTERADO] ID -> Protocolo */}
                        <TableCell sx={{ fontWeight: 'bold' }}>Protocolo</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Endereço Completo</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Prazo</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Ações</TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {demandas.map((demanda) => {
                        const demandaId = demanda.id!;
                        const isSelected = selectedDemandas.includes(demandaId);

                        return (
                            <TableRow
                                key={demanda.id}
                                hover
                                selected={isSelected}
                                onClick={() => onSelectDemanda(demandaId)} // Seleciona ao clicar na linha
                                sx={{ 
                                    cursor: 'pointer',
                                    '& td': { borderColor: 'rgba(224, 224, 224, 1)' } 
                                }}
                            >
                                {/* [ALTERADO] Exibe Protocolo (ou ID se não tiver protocolo) */}
                                <TableCell>
                                    {demanda.protocolo || demanda.id}
                                </TableCell>

                                <TableCell>
                                    {formatEnderecoCompleto(demanda)}
                                </TableCell>

                                <TableCell>
                                    {demanda.tipo_demanda}
                                </TableCell>

                                <TableCell>
                                    {formatPrazo(demanda.prazo)}
                                </TableCell>

                                <TableCell onClick={(e) => e.stopPropagation()}> {/* Evita selecionar ao trocar status */}
                                    <StatusDemanda
                                        demandaId={demandaId}
                                        currentStatusId={demanda.id_status}
                                        availableStatus={availableStatus}
                                        onStatusChange={onStatusChange}
                                    />
                                </TableCell>

                                <TableCell align="right" onClick={(e) => e.stopPropagation()}> {/* Evita selecionar ao clicar ações */}
                                    <IconButton color="primary" onClick={() => onEdit(demanda)}>
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton color="error" onClick={() => onDelete(demandaId)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        );
                    })}

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
    );
}