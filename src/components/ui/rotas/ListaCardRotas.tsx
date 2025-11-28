// src/components/ui/rotas/ListaCardRotas.tsx
'use client';

import React from 'react';
import { Box, Typography, Paper, Chip, Divider, useTheme, IconButton } from '@mui/material'; // <-- Added IconButton
import AltRouteIcon from '@mui/icons-material/AltRoute';
import PinDropIcon from '@mui/icons-material/PinDrop';
import PersonIcon from '@mui/icons-material/Person';
import VisibilityIcon from '@mui/icons-material/Visibility'; // <-- NEW
import DeleteIcon from '@mui/icons-material/Delete';     // <-- NEW
import { useRouter } from 'next/navigation';            // <-- NEW
import { RotaComContagem } from '@/services/client/rotas-client'; 
import { format } from 'date-fns';

interface ListaCardRotasProps {
    rotas: RotaComContagem[];
    onRowClick: (id: number) => void;
    selectedRotaId: number | null;
    onDelete: (id: number) => void; // Must accept onDelete prop
}

const formatData = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
        return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch { 
        return 'Data inválida';
    }
};

// Modified component signature to accept onDelete
export default function ListaCardRotas({ rotas, onRowClick, selectedRotaId, onDelete }: ListaCardRotasProps) {
    const theme = useTheme();
    const router = useRouter(); // Initialize router

    // Handler para evitar que o clique no botão ative o onRowClick (mapa)
    const handleViewClick = (e: React.MouseEvent, id: number) => {
        e.stopPropagation(); // Stop propagation is crucial here
        router.push(`/rotas/${id}`);
    };

    // Handler para evitar que o clique no botão ative o onRowClick (mapa)
    const handleDeleteClick = (e: React.MouseEvent, id: number) => {
        e.stopPropagation(); // Stop propagation is crucial here
        if (typeof id === 'number' && !isNaN(id)) {
            onDelete(id); // Calls the onDelete handler passed from RotasPage.tsx
        } else {
            console.error("Tentativa de deletar rota sem ID válido:", id);
        } 
    };
    
    // O clique no card (exceto nos botões) atualiza o mapa (onRowClick)
    const handleCardClick = (id: number) => {
        onRowClick(id);
    };


    return (
        <Box sx={{ p: 1, maxHeight: '80vh', overflowY: 'auto' }}>
            {rotas.map((rota) => {
                let color: "default" | "warning" | "info" | "success" = "default";
                if (rota.status === 'Pendente') color = 'warning';
                if (rota.status === 'Em Andamento') color = 'info';
                if (rota.status === 'Concluída') color = 'success';

                const isSelected = rota.id === selectedRotaId;

                return (
                    <Paper 
                        key={rota.id}
                        elevation={isSelected ? 5 : 2}
                        onClick={() => handleCardClick(rota.id)} 
                        sx={{
                            mb: 2,
                            p: 2,
                            borderLeft: isSelected 
                                ? `6px solid ${theme.palette.primary.main}` 
                                : '1px solid #ddd',
                            cursor: 'pointer',
                            transition: 'box-shadow 0.3s, border-left 0.3s',
                        }}
                    >
                        {/* Header: Title and Chip */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography 
                                variant="subtitle1" 
                                component="h3" 
                                sx={{ fontWeight: 'bold' }}
                            >
                                <AltRouteIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                                {rota.nome}
                            </Typography>
                            <Chip label={`ID: ${rota.id}`} size="small" variant="outlined" />
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        {/* Details (Demandas, Responsável) */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <PinDropIcon fontSize="small" sx={{ mr: 1, color: theme.palette.info.main }} />
                                <Typography variant="body2">
                                    **Demandas:** {rota.total_demandas}
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <PersonIcon fontSize="small" sx={{ mr: 1, color: theme.palette.warning.main }} />
                                <Typography variant="body2">
                                    **Responsável:** {rota.responsavel}
                                </Typography>
                            </Box>
                        </Box>
                        
                        {/* Footer & Actions */}
                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Chip label={rota.status || 'N/A'} color={color} size="small" sx={{ fontWeight: 'bold' }} />
                            
                            {/* AÇÕES DE VISUALIZAÇÃO E DELEÇÃO (Botões que faltavam) */}
                            <Box>
                                <IconButton 
                                    size="small" 
                                    onClick={(e) => handleViewClick(e, rota.id)}
                                    title="Visualizar Detalhes da Rota"
                                >
                                    <VisibilityIcon fontSize="small" />
                                </IconButton>
                                <IconButton 
                                    size="small" 
                                    color="error" 
                                    onClick={(e) => handleDeleteClick(e, rota.id)}
                                    title="Excluir Rota"
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Box>

                        </Box>
                        
                    </Paper>
                );
            })}
            {rotas.length === 0 && (
                 <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
                    Nenhuma rota encontrada.
                 </Typography>
            )}
        </Box>
    );
}