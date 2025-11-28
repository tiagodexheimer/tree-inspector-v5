// src/components/ui/rotas/ListaRotas.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation'; 
import { DataGrid, GridColDef, GridActionsCellItem, GridRowParams } from '@mui/x-data-grid'; 
import { Box, Chip, useTheme, useMediaQuery, Typography } from '@mui/material'; 
import { RotaComContagem } from '@/services/client/rotas-client';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns'; 

// Importar o novo componente mobile
import ListaCardRotas from './ListaCardRotas';

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
    onRowClick: (id: number) => void; 
    selectedRotaId: number | null; 
}

export default function ListaRotas({ rotas, onDelete, onRowClick, selectedRotaId }: ListaRotasProps) {
    const router = useRouter(); 
    const theme = useTheme();
    // DETECTA se é mobile (< 600px)
    const isMobile = useMediaQuery(theme.breakpoints.down('sm')); 
    
    // Definição das colunas da DataGrid (apenas para Desktop)
    const columns: GridColDef[] = [
        { field: 'id', headerName: 'ID', width: 50 }, 
        { 
            field: 'nome', 
            headerName: 'Nome da Rota', 
            flex: 1, 
            minWidth: 120 
        },
        { 
            field: 'responsavel', 
            headerName: 'Responsável', 
            width: 120 
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 100, 
            renderCell: (params) => {
                let color: "default" | "warning" | "info" | "success" = "default";
                if (params.value === 'Pendente') color = 'warning';
                if (params.value === 'Em Andamento') color = 'info';
                if (params.value === 'Concluída') color = 'success';
                return <Chip label={params.value || 'N/A'} color={color} size="small" sx={{ minWidth: 80 }} />;
            }
        },
        {
            field: 'total_demandas',
            headerName: 'Demandas',
            width: 90, 
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
                        onClick={(e) => { e.stopPropagation(); router.push(`/rotas/${id}`); }} 
                        color="inherit"
                    />,
                    <GridActionsCellItem
                        key={`delete-${id}`}
                        icon={<DeleteIcon />}
                        label="Deletar Rota"
                        // Corrigido para chamar onDelete (que recebe o ID)
                        onClick={(e) => { e.stopPropagation(); onDelete(id as number); }}
                        color="inherit"
                    />,
                ];
            },
        },
    ];

    const getRowClassName = (params: GridRowParams) => {
        return params.row.id === selectedRotaId ? 'Mui-selected' : '';
    };


    // RETORNO CONDICIONAL
    if (isMobile) {
        // [CORREÇÃO APLICADA AQUI]: Passando a prop onDelete para o componente mobile
        return (
            <ListaCardRotas 
                rotas={rotas} 
                onRowClick={onRowClick} 
                selectedRotaId={selectedRotaId} 
                onDelete={onDelete} // <--- PROP FALTANTE ADICIONADA
            />
        );
    }

    // Renderiza a DataGrid no Desktop
    return (
        <Box sx={{ height: '70vh', minHeight: 450, width: '100%', cursor: 'pointer' }}> 
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
                onRowClick={(params) => onRowClick(params.row.id)}
                getRowClassName={getRowClassName}
            />
        </Box>
    );
}