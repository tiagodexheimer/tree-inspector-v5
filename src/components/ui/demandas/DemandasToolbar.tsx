'use client';

import React from 'react';
import { 
    Box, TextField, MenuItem, Select, FormControl, InputLabel, 
    Button, Stack, IconButton, InputAdornment, Chip, ToggleButton, ToggleButtonGroup,
    Paper, Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RouteIcon from '@mui/icons-material/Route';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import MapIcon from '@mui/icons-material/Map';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
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

    viewMode: 'card' | 'list' | 'map'; 
    onViewModeChange: (mode: 'card' | 'list' | 'map') => void;

    onAddDemandaClick: () => void;
    onCreateRotaClick: () => void;
    onDeleteSelectedClick: () => void;
    
    selectedDemandasCount: number;
    onClearStatusFilter: () => void;
    onClearTipoFilter: () => void;
    isOptimizing: boolean;
}

export default function DemandasToolbar(props: DemandasToolbarProps) {
    
    const handleViewChange = (event: React.MouseEvent<HTMLElement>, newView: 'card' | 'list' | 'map' | null) => {
        if (newView !== null) {
            props.onViewModeChange(newView);
        }
    };

    return (
        <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'background.paper', border: '1px solid #eee' }}>
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
                
                {/* ESQUERDA: Busca e Filtros */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', lg: 'auto' }, flexGrow: 1 }}>
                    <TextField
                        placeholder="Buscar por protocolo, endereço..."
                        size="small"
                        value={props.filtro}
                        onChange={(e) => props.onFiltroChange(e.target.value)}
                        sx={{ minWidth: 220, flexGrow: { xs: 1, sm: 0 } }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>
                        }}
                    />

                    <FormControl size="small" sx={{ minWidth: 160, flexGrow: { xs: 1, sm: 0 } }}>
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
                                        return <Chip key={id} label={st?.nome} size="small" sx={{ height: 20 }} />;
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

                    {(props.filtro || props.filtroStatusIds.length > 0 || props.filtroTipoNomes.length > 0) && (
                        <IconButton onClick={() => { props.onFiltroChange(''); props.onClearStatusFilter(); props.onClearTipoFilter(); }} title="Limpar Filtros">
                            <FilterListOffIcon />
                        </IconButton>
                    )}
                </Stack>

                {/* DIREITA: Ações e Visualização */}
                <Stack direction="row" spacing={2} alignItems="center" sx={{ width: { xs: '100%', lg: 'auto' }, justifyContent: { xs: 'space-between', lg: 'flex-end' } }}>
                    
                    {/* Botão EXCLUIR (Vermelho Destaque) */}
                    {props.selectedDemandasCount > 0 && (
                        <Button 
                            variant="contained" // [ALTERADO] Para destaque sólido
                            color="error" 
                            startIcon={<DeleteIcon />} 
                            onClick={props.onDeleteSelectedClick}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                        >
                            Excluir ({props.selectedDemandasCount})
                        </Button>
                    )}

                    <Stack direction="row" spacing={1} alignItems="center">
                        {/* Botão CRIAR ROTA (Azul Destaque) */}
                        <Button 
                            variant="contained" // [ALTERADO] Para destaque sólido
                            color="info"        // [ALTERADO] 'info' geralmente é um azul agradável, ou use 'primary'
                            startIcon={props.isOptimizing ? <CircularProgress size={20} color="inherit" /> : <RouteIcon />} 
                            onClick={props.onCreateRotaClick}
                            disabled={props.selectedDemandasCount === 0 || props.isOptimizing}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                        >
                            Criar Rota
                        </Button>

                        <Button 
                            variant="outlined" // [ALTERADO] Nova Demanda fica outlined para dar contraste com os de ação em lote
                            color="primary" 
                            startIcon={<AddCircleOutlineIcon />} 
                            onClick={props.onAddDemandaClick}
                            size="small"
                        >
                            Nova Demanda
                        </Button>

                        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                        <ToggleButtonGroup
                            value={props.viewMode}
                            exclusive
                            onChange={handleViewChange}
                            aria-label="modo de visualização"
                            size="small"
                        >
                            <ToggleButton value="card" aria-label="cards" title="Cards">
                                <ViewModuleIcon />
                            </ToggleButton>
                            <ToggleButton value="list" aria-label="lista" title="Lista">
                                <ViewListIcon />
                            </ToggleButton>
                            <ToggleButton value="map" aria-label="mapa" title="Mapa">
                                <MapIcon />
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>

                </Stack>
            </Stack>
        </Paper>
    );
}