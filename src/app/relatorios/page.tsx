// src/app/relatorios/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, Chip, TextField, MenuItem, FormControl, InputLabel, Select, InputAdornment } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem, GridSortModel } from '@mui/x-data-grid';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useRouter } from 'next/navigation';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { usePageTitle } from '@/contexts/PageTitleContext';

// Hooks e Tipos
import { useRelatoriosData } from '@/hooks/useRelatoriosData';

const STORAGE_KEY = 'treeinspector_relatorios_sort';

export default function RelatoriosPage() {
    usePageTitle("Relatórios de Vistoria", <AssessmentIcon />);
    const router = useRouter();
    const {
        relatorios,
        isLoading,
        error,
        deleteRelatorio,
        availableBairros,
        filters
    } = useRelatoriosData();
    const [sortModel, setSortModel] = useState<GridSortModel>([]);

    // Carregar ordenação do localStorage no mount
    useEffect(() => {
        const savedSort = localStorage.getItem(STORAGE_KEY);
        if (savedSort) {
            try {
                setSortModel(JSON.parse(savedSort));
            } catch (e) {
                console.error("Erro ao carregar ordenação:", e);
            }
        }
    }, []);

    // Salvar ordenação no localStorage quando mudar
    const handleSortModelChange = (newModel: GridSortModel) => {
        setSortModel(newModel);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newModel));
    };

    const columns: GridColDef[] = [
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'protocolo', headerName: 'Protocolo', width: 150 },
        {
            field: 'tipo_demanda',
            headerName: 'Tipo',
            width: 180,
            renderCell: (params) => <Chip label={params.value} size="small" color="primary" variant="outlined" />
        },
        { field: 'endereco', headerName: 'Endereço', flex: 1, minWidth: 250 },
        {
            field: 'data_realizacao',
            headerName: 'Data Vistoria',
            width: 150,
            valueFormatter: (value: string) => new Date(value).toLocaleDateString('pt-BR') + ' ' + new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Ações',
            width: 100,
            getActions: (params) => [
                <GridActionsCellItem
                    key="pdf"
                    icon={<PictureAsPdfIcon color="error" />}
                    label="Gerar PDF"
                    onClick={() => window.open(`/relatorios/${params.id}`, '_blank')}
                />,
                <GridActionsCellItem
                    key="delete"
                    icon={<DeleteForeverIcon color="action" />}
                    label="Deletar"
                    onClick={() => handleDelete(Number(params.id))}
                />
            ]
        }
    ];

    const handleDelete = async (id: number) => {
        if (!confirm("Tem certeza que deseja deletar este relatório?")) return;
        try {
            await deleteRelatorio(id);
        } catch (error) {
            console.error(error);
            alert("Erro ao deletar relatório.");
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            {/* Barra de Filtros */}
            <Paper elevation={1} sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
                    <FilterListIcon color="action" />
                    <Typography variant="subtitle2" color="text.secondary">Filtros:</Typography>
                </Box>

                <TextField
                    size="small"
                    label="Rua"
                    variant="outlined"
                    value={filters.rua}
                    onChange={(e) => filters.setRua(e.target.value)}
                    sx={{ minWidth: 200 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                    }}
                />

                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Bairro</InputLabel>
                    <Select
                        value={filters.bairro}
                        label="Bairro"
                        onChange={(e) => filters.setBairro(e.target.value)}
                    >
                        <MenuItem value=""><em>Todos os bairros</em></MenuItem>
                        {availableBairros.map((bairro) => (
                            <MenuItem key={bairro} value={bairro}>{bairro}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TextField
                    size="small"
                    label="Número"
                    variant="outlined"
                    value={filters.numero}
                    onChange={(e) => filters.setNumero(e.target.value)}
                    sx={{ width: 120 }}
                />

                {(filters.rua || filters.bairro || filters.numero) && (
                    <Button
                        size="small"
                        onClick={() => {
                            filters.setRua('');
                            filters.setBairro('');
                            filters.setNumero('');
                        }}
                    >
                        Limpar
                    </Button>
                )}
            </Paper>

            <Paper elevation={2} sx={{ height: { xs: 600, md: 'calc(100vh - 280px)' }, width: '100%' }}>
                <DataGrid
                    rows={relatorios}
                    columns={columns}
                    loading={isLoading}
                    sortModel={sortModel}
                    onSortModelChange={handleSortModelChange}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 10 } },
                    }}
                    pageSizeOptions={[10, 25, 50]}
                    disableRowSelectionOnClick
                />
            </Paper>
        </Box>
    );
}
