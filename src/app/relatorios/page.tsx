// src/app/relatorios/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, Chip } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem, GridSortModel } from '@mui/x-data-grid';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useRouter } from 'next/navigation';

// Hooks e Tipos
import { useRelatoriosData } from '@/hooks/useRelatoriosData';

const STORAGE_KEY = 'treeinspector_relatorios_sort';

export default function RelatoriosPage() {
    const router = useRouter();
    const { relatorios, isLoading, error, deleteRelatorio } = useRelatoriosData();
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
            <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
                Relatórios de Vistoria
            </Typography>

            <Paper elevation={2} sx={{ height: 600, width: '100%' }}>
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
