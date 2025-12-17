// src/app/relatorios/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, Chip } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useRouter } from 'next/navigation';

export default function RelatoriosPage() {
    const router = useRouter();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/relatorios')
            .then(res => res.json())
            .then(data => {
                setRows(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

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
            const res = await fetch(`/api/relatorios/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Erro ao deletar");
            setRows(prev => prev.filter((r: any) => r.id !== id));
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
                    rows={rows}
                    columns={columns}
                    loading={loading}
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