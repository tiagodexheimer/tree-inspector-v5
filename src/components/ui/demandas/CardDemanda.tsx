'use client';

import React, { useState } from 'react';
import {
    Card, CardContent, Typography, Box, Chip, IconButton,
    Divider, Stack, Tooltip, Menu, MenuItem
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { DemandaType } from '@/types/demanda';
import { format } from 'date-fns';

interface CardDemandaProps {
    demanda: DemandaType;
    selected: boolean;
    onSelect: () => void;
    onDelete: (id: number) => void;
    onEdit: (demanda: DemandaType) => void;
    onStatusChange: (id: number, newStatus: number) => void;
    availableStatus: any[];
}

export default function CardDemanda({
    demanda, selected, onSelect, onDelete, onEdit, 
    onStatusChange, availableStatus
}: CardDemandaProps) {

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const openMenu = Boolean(anchorEl);

    const dataCriacao = demanda.created_at
        ? format(new Date(demanda.created_at), 'dd/MM/yyyy')
        : '-';

    const statusColor = demanda.status_cor || '#ccc';

    // --- HANDLERS ---

    // 1. Clique no Card (Seleção)
    const handleCardClick = () => {
        onSelect();
    };

    // 2. Menu de Status
    const handleStatusClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation(); // Impede seleção do card
        setAnchorEl(event.currentTarget);
    };

    const handleStatusClose = (event?: React.MouseEvent) => {
        event?.stopPropagation();
        setAnchorEl(null);
    };

    const handleSelectStatus = (event: React.MouseEvent, statusId: number) => {
        event.stopPropagation();
        if (demanda.id) {
            onStatusChange(demanda.id, statusId);
        }
        setAnchorEl(null);
    };

    // 3. Botões de Ação
    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(demanda);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (demanda.id) onDelete(demanda.id);
    };

    return (
        <Card
            elevation={selected ? 8 : 2}
            onClick={handleCardClick} // [MELHORIA] Card inteiro clicável
            sx={{
                width: '100%',
                minHeight: '380px',
                display: 'flex',
                flexDirection: 'column',
                borderLeft: `6px solid ${statusColor}`,
                transition: 'all 0.2s ease',
                backgroundColor: selected ? '#f0f7ff' : 'white',
                cursor: 'pointer', // Cursor de mão em todo o card
                '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
                position: 'relative',
                borderRadius: 3,
                // Borda visual extra quando selecionado
                outline: selected ? '2px solid #1976d2' : 'none', 
            }}
        >
            <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

                {/* CABEÇALHO */}
                <Box mb={1}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.8rem' }}>
                        {dataCriacao}
                    </Typography>
                    <Typography variant="h6" fontWeight="800" lineHeight={1.3} sx={{ wordBreak: 'break-word', fontSize: '1.1rem' }}>
                        {demanda.protocolo || 'Sem Protocolo'}
                    </Typography>
                </Box>

                {/* BARRA DE AÇÕES E STATUS */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    
                    {/* CHIP DE STATUS (Restaurado) */}
                    <Box>
                        <Chip
                            label={demanda.status_nome}
                            onClick={handleStatusClick}
                            onDelete={handleStatusClick}
                            deleteIcon={<ArrowDropDownIcon style={{ color: 'white' }} />}
                            sx={{
                                bgcolor: statusColor,
                                color: '#fff',
                                fontWeight: 'bold',
                                height: 28,
                                fontSize: '0.75rem',
                                '&:hover': { opacity: 0.9 }
                            }}
                        />
                        
                        <Menu
                            anchorEl={anchorEl}
                            open={openMenu}
                            onClose={handleStatusClose}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {availableStatus.map((status) => (
                                <MenuItem 
                                    key={status.id} 
                                    onClick={(e) => handleSelectStatus(e, status.id)}
                                    selected={status.nome === demanda.status_nome}
                                    sx={{ fontSize: '0.9rem' }}
                                >
                                    <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: status.cor, mr: 1 }} />
                                    {status.nome}
                                </MenuItem>
                            ))}
                        </Menu>
                    </Box>

                    {/* BOTÕES (Com stopPropagation) */}
                    <Box>
                        <IconButton size="small" onClick={handleEditClick} sx={{ color: 'text.primary' }}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={handleDeleteClick}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Stack>

                <Divider sx={{ my: 1.5 }} />

                {/* CORPO */}
                <Stack spacing={1.5} sx={{ flexGrow: 1 }}>
                    <Box>
                        <Chip 
                            label={demanda.tipo_demanda} 
                            variant="outlined" 
                            size="small"
                            sx={{ mb: 0.5, height: 20, fontSize: '0.7rem', fontWeight: 600 }} 
                        />
                        <Box display="flex" alignItems="flex-start" gap={1}>
                            <PersonIcon color="action" sx={{ fontSize: 20, mt: 0.2 }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word', fontSize: '0.9rem' }}>
                                {demanda.nome_solicitante || 'Anônimo'}
                            </Typography>
                        </Box>
                    </Box>

                    <Box display="flex" alignItems="flex-start" gap={1}>
                        <LocationOnIcon color="action" sx={{ fontSize: 20, mt: 0.2 }} />
                        <Box>
                            <Typography variant="body2" lineHeight={1.2} sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
                                {demanda.logradouro}, {demanda.numero}
                            </Typography>
                            {demanda.bairro && (
                                <Typography variant="caption" color="text.secondary">
                                    {demanda.bairro}
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    {demanda.descricao && (
                        <Box display="flex" alignItems="flex-start" gap={1} sx={{ bgcolor: '#f5f5f5', p: 1, borderRadius: 2, mt: 'auto' }}>
                            <DescriptionIcon color="action" sx={{ fontSize: 18, mt: 0.2, flexShrink: 0 }} />
                            <Tooltip title={demanda.descricao}>
                                <Typography 
                                    variant="caption" 
                                    color="text.secondary"
                                    sx={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        fontStyle: 'italic',
                                        lineHeight: 1.3
                                    }}
                                >
                                    {demanda.descricao}
                                </Typography>
                            </Tooltip>
                        </Box>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}