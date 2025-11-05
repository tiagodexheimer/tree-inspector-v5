// src/components/ui/demandas/DemandasToolbar.tsx
'use client';

import React from 'react';
import {
    Box, Button, IconButton, TextField,
    FormControl, InputLabel, Select, MenuItem, OutlinedInput, Checkbox, ListItemText, SelectChangeEvent,
    CircularProgress // <-- Importar CircularProgress
} from "@mui/material";
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Link from 'next/link';

// ... (Interfaces StatusOption, TipoDemandaOption e MenuProps permanecem iguais) ...
interface StatusOption {
    id: number;
    nome: string;
    cor: string;
}
interface TipoDemandaOption {
    id: number;
    nome: string;
}
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};


// Props que o componente da Toolbar irá receber
interface DemandasToolbarProps {
    filtro: string;
    onFiltroChange: (value: string) => void;
    filtroStatusIds: number[];
    onFiltroStatusChange: (event: SelectChangeEvent<number[]>) => void;
    availableStatus: StatusOption[];
    statusError: string | null;
    filtroTipoNomes: string[];
    onFiltroTipoChange: (event: SelectChangeEvent<string[]>) => void;
    availableTipos: TipoDemandaOption[];
    tiposError: string | null;
    viewMode: 'card' | 'list';
    onViewModeChange: (mode: 'card' | 'list') => void;
    onAddDemandaClick: () => void;
    onCreateRotaClick: () => void;
    selectedDemandasCount: number;
    onClearStatusFilter: () => void;
    onClearTipoFilter: () => void;
    isOptimizing: boolean; // <-- NOVA PROP
}

export default function DemandasToolbar({
    filtro,
    onFiltroChange,
    filtroStatusIds,
    onFiltroStatusChange,
    availableStatus,
    statusError,
    filtroTipoNomes,
    onFiltroTipoChange,
    availableTipos,
    tiposError,
    viewMode,
    onViewModeChange,
    onAddDemandaClick,
    onCreateRotaClick,
    selectedDemandasCount,
    onClearStatusFilter,
    onClearTipoFilter,
    isOptimizing // <-- NOVA PROP
}: DemandasToolbarProps) {

    return (
        <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', borderBottom: '1px solid #ddd' }}>
            {/* ... (Botões Adicionar Demanda, Importar, Filtros... tudo igual) ... */}
            <Button variant="contained" sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }} onClick={onAddDemandaClick} disabled={isOptimizing}>
                Adicionar Demanda
            </Button>

            {/* Botão Importar Planilha */}
            <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                sx={{ color: '#555', borderColor: '#ccc', '&:hover': { borderColor: '#aaa', backgroundColor: 'rgba(0,0,0,0.04)' } }}
                component={Link}
                href="/demandas/importar"
                disabled={isOptimizing}
            >
                Importar Planilha
            </Button>

            {/* Filtro Status */}
            <FormControl sx={{ minWidth: 180 }} size="small">
                <InputLabel id="filtro-status-label">Status</InputLabel>
                <Select
                    labelId="filtro-status-label"
                    multiple
                    value={filtroStatusIds}
                    onChange={onFiltroStatusChange}
                    input={<OutlinedInput label="Status" />}
                    renderValue={(selectedIds) => selectedIds.length === 0 ? <em>Todos Status</em> : availableStatus.filter(s => selectedIds.includes(s.id)).map(s => s.nome).join(', ')}
                    MenuProps={MenuProps}
                    disabled={availableStatus.length === 0 || !!statusError || isOptimizing}
                >
                    <MenuItem value={-1} onClick={onClearStatusFilter}><Checkbox checked={filtroStatusIds.length === 0} readOnly /><ListItemText primary="Todos Status" /></MenuItem>
                    {availableStatus.map((status) => (<MenuItem key={status.id} value={status.id}><Checkbox checked={filtroStatusIds.includes(status.id)} /><Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: status.cor, mr: 1, border: '1px solid #ccc' }} /><ListItemText primary={status.nome} /></MenuItem>))}
                    {statusError && <MenuItem disabled>Erro ao carregar</MenuItem>}
                </Select>
            </FormControl>

            {/* Filtro Tipo */}
            <FormControl sx={{ minWidth: 180 }} size="small">
                <InputLabel id="filtro-tipo-label">Tipo</InputLabel>
                <Select
                    labelId="filtro-tipo-label"
                    multiple
                    value={filtroTipoNomes}
                    onChange={onFiltroTipoChange}
                    input={<OutlinedInput label="Tipo" />}
                    renderValue={(selectedNames) => selectedNames.length === 0 ? <em>Todos Tipos</em> : selectedNames.join(', ')}
                    MenuProps={MenuProps}
                    disabled={availableTipos.length === 0 || !!tiposError || isOptimizing}
                >
                    <MenuItem value="" onClick={onClearTipoFilter}><Checkbox checked={filtroTipoNomes.length === 0} readOnly /><ListItemText primary="Todos Tipos" /></MenuItem>
                    {availableTipos.map((tipo) => (<MenuItem key={tipo.id} value={tipo.nome}><Checkbox checked={filtroTipoNomes.includes(tipo.nome)} /><ListItemText primary={tipo.nome} /></MenuItem>))}
                    {tiposError && <MenuItem disabled>Erro ao carregar</MenuItem>}
                </Select>
            </FormControl>

            {/* Filtro Texto */}
            <TextField
                label="Buscar..."
                variant="outlined"
                size="small"
                value={filtro}
                onChange={(e) => onFiltroChange(e.target.value)}
                sx={{ marginLeft: 'auto', minWidth: 250 }}
                disabled={isOptimizing}
            />
            {/* Botões de View */}
            <IconButton onClick={() => onViewModeChange('card')} title="Visualizar em Cards" sx={{ color: viewMode === 'card' ? '#257e1a' : 'default' }} disabled={isOptimizing}>
                <ViewModuleIcon />
            </IconButton>
            <IconButton onClick={() => onViewModeChange('list')} title="Visualizar em Lista" sx={{ color: viewMode === 'list' ? '#257e1a' : 'default' }} disabled={isOptimizing}>
                <ViewListIcon />
            </IconButton>
            
            {/* Botão Criar Rota ATUALIZADO */}
            <Button
                variant="contained"
                disabled={selectedDemandasCount === 0 || isOptimizing}
                onClick={onCreateRotaClick}
                sx={{ backgroundColor: '#1976d2', '&:hover': { backgroundColor: '#115293' }, minWidth: 150 }}
            >
                {isOptimizing ? <CircularProgress size={24} color="inherit" /> : `Criar Rota (${selectedDemandasCount})`}
            </Button>
        </Box>
    );
}