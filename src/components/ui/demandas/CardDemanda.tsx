// src/components/ui/demandas/CardDemanda.tsx
'use client';

import React, { useState } from 'react';
import {
    Card, CardContent, Typography, Box, Chip, IconButton,
    Divider, Stack, Tooltip, Menu, MenuItem, Checkbox
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import GavelIcon from '@mui/icons-material/Gavel';
import { DemandaType, DemandaComIdStatus } from '@/types/demanda';
import { format, differenceInCalendarDays } from 'date-fns';

interface CardDemandaProps {
    demanda: DemandaComIdStatus;
    selected: boolean;
    onSelect: () => void;
    onDelete: (id: number) => void;
    onEdit: (demanda: DemandaComIdStatus) => void;
    onView: (demanda: DemandaComIdStatus) => void;
    onStatusChange: (id: number, newStatus: number) => void;
    availableStatus: any[];
}

export default function CardDemanda({
    demanda, selected, onSelect, onDelete, onEdit,
    onStatusChange, onView, availableStatus
}: CardDemandaProps) {

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const openMenu = Boolean(anchorEl);

    const dataCriacao = demanda.created_at
        ? format(new Date(demanda.created_at), 'dd/MM/yyyy')
        : '-';

    const statusColor = demanda.status_cor || '#ccc';

    // --- PRAZO E URGÊNCIA ---
    const isConcluida = ['Concluído', 'Concluída', 'Concluídas', 'Concluido', 'Finalizado'].includes(demanda.status_nome || '');
    const prazoDate = demanda.prazo ? new Date(demanda.prazo) : null;
    const daysRemaining = prazoDate ? differenceInCalendarDays(prazoDate, new Date()) : null;

    let urgencyBorder = 'none';
    let urgencyColor = 'transparent';

    if (!isConcluida && daysRemaining !== null) {
        if (daysRemaining < 4) {
            urgencyBorder = '3px solid #d32f2f'; // Vermelho
            urgencyColor = '#d32f2f';
        } else if (daysRemaining < 7) {
            urgencyBorder = '3px solid #fbc02d'; // Amarelo
            urgencyColor = '#fbc02d';
        }
    }

    // --- HANDLERS ---

    const handleCardClick = () => {
        onSelect();
    };

    const handleStatusClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    // [CORREÇÃO] Função simplificada para fechar o menu (compatível com MUI onClose)
    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleSelectStatus = (event: React.MouseEvent, statusId: number) => {
        event.stopPropagation();
        if (demanda.id) {
            onStatusChange(demanda.id, statusId);
        }
        setAnchorEl(null);
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(demanda);
    };

    const handleViewClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onView(demanda);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (demanda.id) onDelete(demanda.id);
    };

    const handleCheckboxClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect();
    };

    return (
        <Card
            elevation={selected ? 8 : 2}
            onClick={handleCardClick}
            sx={{
                width: '100%',
                minHeight: '380px',
                display: 'flex',
                flexDirection: 'column',
                borderLeft: `6px solid ${statusColor}`,
                transition: 'all 0.2s ease',
                backgroundColor: selected ? '#f0f7ff' : 'white',
                cursor: 'pointer',
                '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
                position: 'relative',
                borderRadius: 3,
                outline: selected ? '2px solid #1976d2' : urgencyBorder,
                outlineOffset: urgencyBorder !== 'none' ? '-3px' : '0px'
            }}
        >
            <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

                {/* CABEÇALHO */}
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box flex={1}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.8rem' }}>
                            {dataCriacao}
                        </Typography>
                        <Typography variant="h6" fontWeight="800" lineHeight={1.3} sx={{ wordBreak: 'break-word', fontSize: '1.1rem' }}>
                            {demanda.protocolo || 'Sem Protocolo'}
                        </Typography>
                    </Box>

                    <Checkbox
                        checked={selected}
                        onClick={handleCheckboxClick}
                        sx={{ mt: -1, mr: -1 }}
                    />
                </Box>

                {/* INDICADOR DE PRAZO */}
                {!isConcluida && daysRemaining !== null && (
                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip
                            label={daysRemaining < 0 ? 'Vencida' : daysRemaining === 0 ? 'Vence hoje' : `Faltam ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}`}
                            size="small"
                            sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                backgroundColor: urgencyColor,
                                color: urgencyColor !== 'transparent' ? 'white' : 'text.secondary',
                                border: urgencyColor === 'transparent' ? '1px solid #ddd' : 'none'
                            }}
                        />
                        {prazoDate && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                (Até {format(prazoDate, 'dd/MM/yy')})
                            </Typography>
                        )}
                    </Box>
                )}

                {/* BARRA DE AÇÕES E STATUS */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
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
                            onClose={handleMenuClose} // [CORRIGIDO] Usando o novo handler simples
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
                        <IconButton size="small" onClick={handleViewClick} color="info">
                            <VisibilityIcon fontSize="small" />
                        </IconButton>
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
                        <Box display="flex" alignItems="center" gap={1}>
                            <GavelIcon color={demanda.notificacao_status ? "error" : "disabled"} sx={{ fontSize: 18 }} />
                            <Box display="flex" alignItems="baseline" gap={1}>
                                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: demanda.notificacao_status ? 'error.main' : 'text.disabled' }}>
                                    {demanda.notificacao_status || 'Sem fiscalização'}
                                </Typography>
                                {demanda.notificacao_vencimento && (
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.main', bgcolor: '#ffebee', px: 0.5, borderRadius: 0.5 }}>
                                        {format(new Date(demanda.notificacao_vencimento), 'dd/MM/yy')}
                                    </Typography>
                                )}
                            </Box>
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