// src/components/ui/formularios/VisualizarFormularios.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert, Typography, Dialog, DialogContent, IconButton } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CreateIcon from '@mui/icons-material/Create';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import CloseIcon from '@mui/icons-material/Close';

// Importamos o componente de visualização
import PreVisualizarFormularios from './PreVisualizarFormularios';
import { CampoDef } from '@/types/formularios';

interface FormularioRow {
    id: number;
    nome: string;
    descricao: string | null;
    updated_at: string;
    // 💡 IMPORTANTE: Este campo virá com os tipos agrupados por STRING_AGG do backend
    tipo_demanda_associada: string | null; 
}

interface Props {
    onEdit: (id: number) => void;
    onDelete: (id: number) => void;
    refreshTrigger?: number;
}

export default function VisualizarFormularios({ onEdit, onDelete, refreshTrigger }: Props) {
    const [rows, setRows] = useState<FormularioRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para o Modal de Visualização
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewFields, setPreviewFields] = useState<CampoDef[]>([]);
    const [previewTitle, setPreviewTitle] = useState('');

    const fetchFormularios = async () => {
        if (rows.length === 0) setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/gerenciar/formularios');
            if (!response.ok) throw new Error('Falha ao carregar formulários.');
            const data = await response.json();
            setRows(data);
        } catch (err) {
            console.error(err);
            setError('Erro ao conectar com o servidor.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFormularios();
    }, [refreshTrigger]);

    // Função para buscar detalhes e abrir o "celular"
    const handleVisualize = async (id: number) => {
        setPreviewLoading(true);
        setPreviewOpen(true); // Abre o modal imediatamente com loading
        try {
            const response = await fetch(`/api/gerenciar/formularios/${id}`);
            if (!response.ok) throw new Error("Erro ao buscar detalhes");
            
            const data = await response.json();
            setPreviewFields(data.definicao_campos || []);
            setPreviewTitle(data.nome);
        } catch (error) {
            console.error(error);
            alert("Não foi possível carregar o formulário.");
            setPreviewOpen(false);
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleClosePreview = () => {
        setPreviewOpen(false);
        setPreviewFields([]); // Limpa para não mostrar dados antigos na proxima abertura
    };

    const columns: GridColDef[] = [
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150 },
        { field: 'descricao', headerName: 'Descrição', flex: 1.5, minWidth: 200, valueFormatter: (value: string | null) => value || '-' },
        { 
            field: 'tipo_demanda_associada', 
            headerName: 'Tipo de Demanda', 
            // 💡 CORREÇÃO 1: Usar flex e minWidth para garantir mais espaço
            flex: 1.5, 
            minWidth: 220, 
            renderCell: (params) => {
                const content = params.value;
                if (!content) {
                    return <Typography variant="caption" color="text.secondary">Sem vínculo</Typography>;
                }
                return (
                    <Box 
                       // 💡 CORREÇÃO 2: Permite a quebra de linha (que resolve o corte)
                       sx={{ 
                           whiteSpace: 'normal', 
                           lineHeight: '1.4', 
                           height: '100%', 
                           overflow: 'visible',
                           pt: 0.5 
                        }}
                    >
                        <Typography 
                           variant="body2" 
                           sx={{ fontWeight: 'bold', color: 'primary.main' }}
                        >
                           {content}
                        </Typography>
                    </Box>
                );
            }
        },
        { field: 'updated_at', headerName: 'Atualizado em', width: 150, valueFormatter: (value: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-' },
        {
            field: 'actions', type: 'actions', headerName: 'Ações', width: 150,
            getActions: (params) => [
                <GridActionsCellItem
                    key="view" icon={<VisibilityIcon />} label="Visualizar"
                    onClick={() => handleVisualize(Number(params.id))}
                />,
                <GridActionsCellItem
                    key="edit" icon={<CreateIcon />} label="Editar"
                    onClick={() => onEdit(Number(params.id))}
                />,
                <GridActionsCellItem
                    key="delete" icon={<DeleteForeverIcon color="error" />} label="Deletar"
                    onClick={() => onDelete(Number(params.id))}
                />,
            ]
        },
    ];

    if (isLoading && rows.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    if (error) return <Box sx={{ p: 2 }}><Alert severity="error">{error}</Alert></Box>;

    return (
        <>
            <Box sx={{ height: 500, width: '100%' }}>
                {rows.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#f5f5f5', borderRadius: 2 }}>
                        <Typography color="text.secondary">Nenhum formulário criado ainda.</Typography>
                    </Box>
                ) : (
                    <DataGrid 
                        rows={rows} columns={columns} 
                        initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
                        pageSizeOptions={[5, 10, 25]} disableRowSelectionOnClick 
                        // Permite que o DataGrid ajuste a altura das linhas para acomodar o texto quebrado
                        getRowHeight={() => 'auto'}
                        sx={{ border: 0 }} 
                    />
                )}
            </Box>

            {/* Modal de Visualização do Celular */}
            <Dialog 
                open={previewOpen} 
                onClose={handleClosePreview}
                maxWidth="sm" 
                fullWidth
                PaperProps={{
                    sx: { 
                        bgcolor: 'transparent', 
                        boxShadow: 'none',
                        overflow: 'hidden' 
                    }
                }}
            >
                {/* Botão de fechar flutuante */}
                <IconButton
                    onClick={handleClosePreview}
                    sx={{
                        position: 'absolute', top: 10, right: 10,
                        bgcolor: 'white', color: 'grey.700',
                        '&:hover': { bgcolor: 'grey.100' },
                        zIndex: 1300
                    }}
                >
                    <CloseIcon />
                </IconButton>

                <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '680px' }}>
                    {previewLoading ? (
                        <CircularProgress sx={{ color: 'white' }} />
                    ) : (
                        // Renderiza o celular em modo somente leitura
                        <PreVisualizarFormularios 
                            campos={previewFields} 
                            readOnly={true} 
                            formName={previewTitle}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}