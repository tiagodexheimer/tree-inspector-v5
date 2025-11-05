// src/components/ui/rotas/ListaRotas.tsx
'use client';

import React from 'react';
// 1. Importar o useRouter
import { useRouter } from 'next/navigation'; 
// 2. Remover GridValueGetter (não era o erro, mas limpando) e Tooltip (warning)
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid'; 
import { Box, Chip } from '@mui/material'; 
import { RotaComContagem } from '@/app/rotas/page'; 
// import Link from 'next/link'; // Não é mais necessário aqui
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns'; 

// Função para formatar data (corrigido o warning do 'error')
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
    // 3. Instanciar o router
    const router = useRouter(); 
    
    // Definição das colunas
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
            // Correção da v7 para v8 (pega o valor direto)
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
                    // ***** 4. CORREÇÃO AQUI *****
                    <GridActionsCellItem
                        key={`view-${id}`}
                        icon={<VisibilityIcon />}
                        label="Visualizar Rota"
                        // Substituímos 'component' e 'componentProps' por 'onClick'
                        onClick={() => router.push(`/rotas/${id}`)}
                        color="inherit" // Adicionado para consistência visual
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