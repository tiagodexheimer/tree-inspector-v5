'use client';

import React, { useState } from 'react';
import {
    Box, TextField, MenuItem, Select, FormControl, InputLabel,
    Button, Stack, IconButton, InputAdornment, Chip, ToggleButton, ToggleButtonGroup,
    Paper, Divider, Tooltip, Menu, ListItemIcon, ListItemText
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import RouteIcon from '@mui/icons-material/Route';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import MapIcon from '@mui/icons-material/Map';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HistoryIcon from '@mui/icons-material/History';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { CircularProgress } from '@mui/material';

interface DemandasToolbarProps {
    filtro: string;
    onFiltroChange: (val: string) => void;

    filtroStatusIds: number[];
    onFiltroStatusChange: (e: any) => void;
    availableStatus: any[];
    statusError: any;

    filtroTipoNomes: string[];
    onFiltroTipoChange: (e: any) => void;
    availableTipos: any[];
    tiposError: any;

    filtroBairros: string[];
    onFiltroBairrosChange: (e: any) => void;
    availableBairros: string[];

    viewMode: 'card' | 'list' | 'map';
    onViewModeChange: (mode: 'card' | 'list' | 'map') => void;

    onAddDemandaClick: () => void;
    onImportPdfClick: () => void;
    onAddNotificacaoClick: () => void;
    onCreateRotaClick: () => void;
    onDeleteSelectedClick: () => void;

    selectedDemandasCount: number;
    onClearStatusFilter: () => void;
    onClearTipoFilter: () => void;
    onClearBairroFilter: () => void;
    isOptimizing: boolean;
    notificacoesVencidas: boolean;
    onNotificacoesVencidasChange: (val: boolean) => void;
}

export default function DemandasToolbar(props: DemandasToolbarProps) {
    const [moreAnchorEl, setMoreAnchorEl] = useState<null | HTMLElement>(null);
    const moreMenuOpen = Boolean(moreAnchorEl);

    const handleViewChange = (_event: React.MouseEvent<HTMLElement>, newView: 'card' | 'list' | 'map' | null) => {
        if (newView !== null) {
            props.onViewModeChange(newView);
        }
    };

    const hasActiveFilters = props.filtro || props.filtroStatusIds.length > 0 || props.filtroTipoNomes.length > 0 || props.filtroBairros.length > 0 || props.notificacoesVencidas;

    return (
        <Paper elevation={0} sx={{ mb: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            
            {/* ═══ LINHA 1: Filtros + Visualização ═══ */}
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                
                {/* Busca */}
                <TextField
                    placeholder="Buscar por protocolo, endereço..."
                    size="small"
                    value={props.filtro}
                    onChange={(e) => props.onFiltroChange(e.target.value)}
                    sx={{ minWidth: 200, flexGrow: 1, maxWidth: 360 }}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>
                    }}
                />

                {/* Filtros em linha */}
                <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        multiple
                        value={props.filtroStatusIds}
                        onChange={props.onFiltroStatusChange}
                        label="Status"
                        renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {(selected as number[]).map((id) => {
                                    const st = props.availableStatus.find(s => s.id === id);
                                    return (
                                        <Chip 
                                            key={id} 
                                            label={st?.nome} 
                                            size="small" 
                                            sx={{ height: 20 }} 
                                            onDelete={(e) => {
                                                e.stopPropagation();
                                                const newValue = (selected as number[]).filter(v => v !== id);
                                                props.onFiltroStatusChange({ target: { value: newValue } } as any);
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                        />
                                    );
                                })}
                            </Box>
                        )}
                    >
                        {props.availableStatus.map((status) => (
                            <MenuItem key={status.id} value={status.id}>
                                {status.nome}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Tipo</InputLabel>
                    <Select
                        multiple
                        value={props.filtroTipoNomes}
                        onChange={props.onFiltroTipoChange}
                        label="Tipo"
                        renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {(selected as string[]).map((t) => (
                                    <Chip 
                                        key={t} 
                                        label={t} 
                                        size="small" 
                                        sx={{ height: 20 }} 
                                        onDelete={(e) => {
                                            e.stopPropagation();
                                            const newValue = (selected as string[]).filter(v => v !== t);
                                            props.onFiltroTipoChange({ target: { value: newValue } } as any);
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    />
                                ))}
                            </Box>
                        )}
                    >
                        {props.availableTipos.map((tipo: any) => (
                            <MenuItem key={tipo.id || tipo.nome} value={tipo.nome}>
                                {tipo.nome}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Bairros</InputLabel>
                    <Select
                        multiple
                        value={props.filtroBairros}
                        onChange={props.onFiltroBairrosChange}
                        label="Bairros"
                        renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {(selected as string[]).map((b) => (
                                    <Chip 
                                        key={b} 
                                        label={b} 
                                        size="small" 
                                        sx={{ height: 20 }} 
                                        onDelete={(e) => {
                                            e.stopPropagation();
                                            const newValue = (selected as string[]).filter(v => v !== b);
                                            props.onFiltroBairrosChange({ target: { value: newValue } } as any);
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                    />
                                ))}
                            </Box>
                        )}
                    >
                        {props.availableBairros.map((bairro) => (
                            <MenuItem key={bairro} value={bairro}>
                                {bairro}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Tooltip title="Filtrar demandas com notificações vencidas">
                    <ToggleButton
                        value="vencidas"
                        selected={props.notificacoesVencidas}
                        onChange={() => props.onNotificacoesVencidasChange(!props.notificacoesVencidas)}
                        size="small"
                        color="error"
                        sx={{ height: 40, px: 1.5, fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                        <HistoryIcon sx={{ mr: 0.5 }} fontSize="small" />
                        Re-vistoria
                    </ToggleButton>
                </Tooltip>

                {hasActiveFilters && (
                    <Button
                        size="small"
                        color="error"
                        startIcon={<FilterListOffIcon />}
                        onClick={() => {
                            props.onFiltroChange('');
                            props.onClearStatusFilter();
                            props.onClearTipoFilter();
                            props.onClearBairroFilter();
                            props.onNotificacoesVencidasChange(false);
                        }}
                        sx={{ 
                            textTransform: 'none', 
                            fontWeight: 'bold',
                            height: 32,
                            px: 2,
                            border: '1px dashed'
                        }}
                    >
                        Limpar Filtros
                    </Button>
                )}

                {/* Spacer */}
                <Box sx={{ flexGrow: 1 }} />

                {/* Modo de Visualização */}
                <ToggleButtonGroup
                    value={props.viewMode}
                    exclusive
                    onChange={handleViewChange}
                    aria-label="modo de visualização"
                    size="small"
                >
                    <ToggleButton value="card" aria-label="cards" title="Cards">
                        <ViewModuleIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="list" aria-label="lista" title="Lista">
                        <ViewListIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="map" aria-label="mapa" title="Mapa">
                        <MapIcon fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            <Divider />

            {/* ═══ LINHA 2: Ações ═══ */}
            <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'grey.50' }}>

                {/* Ações Primárias (esquerda) */}
                <Button
                    variant="contained"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={props.onAddDemandaClick}
                    size="small"
                    sx={{
                        bgcolor: '#257e1a',
                        '&:hover': { bgcolor: '#1a5912' },
                        fontWeight: 'bold',
                        textTransform: 'none',
                        borderRadius: 1.5,
                        px: 2,
                    }}
                >
                    Nova Demanda
                </Button>

                <Button
                    variant="outlined"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={props.onImportPdfClick}
                    size="small"
                    sx={{
                        textTransform: 'none',
                        borderRadius: 1.5,
                        borderColor: '#257e1a',
                        color: '#257e1a',
                        '&:hover': { borderColor: '#1a5912', bgcolor: 'rgba(37,126,26,0.04)' },
                    }}
                >
                    Importar PDFs
                </Button>

                <Button
                    variant="outlined"
                    startIcon={<AssignmentIcon />}
                    onClick={props.onAddNotificacaoClick}
                    size="small"
                    sx={{
                        textTransform: 'none',
                        borderRadius: 1.5,
                        borderColor: '#666',
                        color: '#555',
                        '&:hover': { borderColor: '#333', bgcolor: 'rgba(0,0,0,0.02)' },
                    }}
                >
                    Nova Notificação
                </Button>

                {/* Spacer */}
                <Box sx={{ flexGrow: 1 }} />

                {/* Ações Contextuais (direita) — aparecem quando há seleção */}
                {props.selectedDemandasCount > 0 && (
                    <>
                        <Chip
                            label={`${props.selectedDemandasCount} selecionada${props.selectedDemandasCount > 1 ? 's' : ''}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                        />

                        <Button
                            variant="contained"
                            color="info"
                            startIcon={props.isOptimizing ? <CircularProgress size={16} color="inherit" /> : <RouteIcon />}
                            onClick={props.onCreateRotaClick}
                            disabled={props.isOptimizing}
                            size="small"
                            sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 'bold' }}
                        >
                            Criar Rota
                        </Button>

                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={props.onDeleteSelectedClick}
                            size="small"
                            sx={{ textTransform: 'none', borderRadius: 1.5, fontWeight: 'bold' }}
                        >
                            Excluir
                        </Button>
                    </>
                )}

                {/* Criar Rota aparece desabilitado quando não há seleção */}
                {props.selectedDemandasCount === 0 && (
                    <Tooltip title="Selecione demandas para criar uma rota">
                        <span>
                            <Button
                                variant="outlined"
                                color="info"
                                startIcon={<RouteIcon />}
                                disabled
                                size="small"
                                sx={{ textTransform: 'none', borderRadius: 1.5 }}
                            >
                                Criar Rota
                            </Button>
                        </span>
                    </Tooltip>
                )}
            </Box>
        </Paper>
    );
}