// src/components/ui/rotas/ListaRotas.tsx
'use client';

import React from 'react';
import { DataGrid, GridColDef, GridValueGetterParams, GridActionsCellItem } from '@mui/x-data-grid';
import { Box, Chip, Tooltip } from '@mui/material';
import { RotaComContagem } from '@/app/rotas/page'; 
import Link from 'next/link';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns'; 

// Função para formatar data (sem alteração)
const formatData = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
        return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (error) {
        return 'Data inválida';
    }
};

interface ListaRotasProps {
    rotas: RotaComContagem[];
    onDelete: (id: number) => void;
}

export default function ListaRotas({ rotas, onDelete }: ListaRotasProps) {
    
    // Definição das colunas (sem alteração)
    const columns: GridColDef[] = [
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'nome', headerName: 'Nome da Rota', flex: 1, minWidth: 200 },
        { field: 'responsavel', headerName: 'Responsável', width: 180 },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => {
                let color: "default" | "warning" | "info" | "success" = "default";
                if (params.value === 'Pendente') color = 'warning';
                if (params.value === 'Em Andamento') color = 'info';
                if (params.value === 'Concluída') color = 'success';
                return <Chip label={params.value || 'N/A'} color={color} size="small" />;
            }
        },
        {
            field: 'total_demandas',
            headerName: 'Demandas',
            width: 100,
            type: 'number',
            align: 'center',
            headerAlign: 'center',
        },
        {
            field: 'created_at',
            headerName: 'Data Criação',
            width: 160,
            valueGetter: (params: GridValueGetterParams) => formatData(params.value),
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Ações',
            width: 100,
            cellClassName: 'actions',
            getActions: ({ id }) => {
                return [
                    // ***** INÍCIO DA CORREÇÃO *****
                    <GridActionsCellItem
                        key={`view-${id}`}
                        icon={<VisibilityIcon />}
                        label="Visualizar Rota"
                        component={Link}
                        href={`/rotas/${id}`} // <-- Aponta para a nova página
                        // Removemos o onClick={alert}
                    />,
                    // ***** FIM DA CORREÇÃO *****
                    <GridActionsCellItem
                        key={`delete-${id}`}
                        icon={<DeleteIcon />}
                        label="Deletar Rota"
                        onClick={() => onDelete(id as number)}
                        color="inherit"
                    />,
                ];
            },
        },
    ];

    return (
        <Box sx={{ height: '70vh', width: '100%' }}>
            <DataGrid
                rows={rotas}
                columns={columns}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                    pagination: {
                        paginationModel: { pageSize: 10 },
                    },
                }}
                checkboxSelection={false} 
                disableRowSelectionOnClick
            />
        </Box>
    );
}