'use client';

import React from 'react';
import { useRouter } from 'next/navigation'; 
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid'; 
import { Box, Chip } from '@mui/material'; 
// CORREÇÃO: Importar do serviço, não da página
import { RotaComContagem } from '@/services/client/rotas-client';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns'; 

const formatData = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
        return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch { 
        return 'Data inválida';
    }
};

interface ListaRotasProps {
    rotas: RotaComContagem[];
    onDelete: (id: number) => void;
}

export default function ListaRotas({ rotas, onDelete }: ListaRotasProps) {
    const router = useRouter(); 
    
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
            valueGetter: (value: string | null) => formatData(value),
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Ações',
            width: 100,
            cellClassName: 'actions',
            getActions: ({ id }) => {
                return [
                    <GridActionsCellItem
                        key={`view-${id}`}
                        icon={<VisibilityIcon />}
                        label="Visualizar Rota"
                        onClick={() => router.push(`/rotas/${id}`)}
                        color="inherit"
                    />,
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