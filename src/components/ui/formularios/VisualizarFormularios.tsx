'use client';

import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert, Typography, Dialog, DialogContent, IconButton, Button } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CreateIcon from '@mui/icons-material/Create';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock';

import { useSession } from 'next-auth/react';

// Importa utilitários de permissão e tipos de formulário
import { UserRole, getLimitsByRole } from '@/types/auth-types';
import { CampoDef, FormulariosPersistence } from '@/types/formularios';

// Importamos o componente de visualização
import PreVisualizarFormularios from './PreVisualizarFormularios';

// A interface FormularioRow precisa herdar as colunas de permissão do backend
interface FormularioRow extends FormulariosPersistence {
    tipo_demanda_associada: string | null;
}

interface Props {
    onEdit: (id: number) => void;
    onDelete: (id: number) => void;
    onAdd: () => void;
    refreshTrigger?: number;
}

export default function VisualizarFormularios({ onEdit, onDelete, onAdd, refreshTrigger }: Props) {
    const { data: session, status } = useSession();

    // --- LÓGICA DE PERMISSÃO E LIMITE ---
    const userRole = session?.user?.role as UserRole | undefined;
    const limits = userRole ? getLimitsByRole(userRole) : getLimitsByRole('free');
    const maxFormularios = limits.MAX_FORMULARIOS;
    
    // Se o limite for maior que 1 (Basic: 2, Pro/Premium: 9999), o usuário pode gerenciar seus formulários.
    const canManageFormularios = limits.MAX_FORMULARIOS > 1;

    const [rows, setRows] = useState<FormularioRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const currentFormCount = rows.length;
    // Permite criar se a contagem atual for menor que o limite máximo do plano
    const canCreateForm = currentFormCount < maxFormularios;

    // --- ESTADOS DO MODAL DE VISUALIZAÇÃO ---
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewFields, setPreviewFields] = useState<CampoDef[]>([]);
    const [previewTitle, setPreviewTitle] = useState('');

    // --- BUSCA DE DADOS ---
    const fetchFormularios = async () => {
        if (rows.length === 0) setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/gerenciar/formularios');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Erro HTTP ${response.status}` }));
                throw new Error(errorData.message || `Erro HTTP ${response.status}`);
            }
            const data: FormularioRow[] = await response.json();
            setRows(data);
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : 'Erro ao conectar com o servidor.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (status === 'authenticated') {
            fetchFormularios();
        }
    }, [status, refreshTrigger]);

    // --- HANDLER DE VISUALIZAÇÃO ---
    const handleVisualize = async (id: number) => {
        setPreviewLoading(true);
        setPreviewOpen(true);
        try {
            const response = await fetch(`/api/gerenciar/formularios/${id}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Erro desconhecido" }));
                throw new Error(errorData.message || "Erro ao buscar detalhes");
            }

            const data = await response.json();

            // [FIX] Lógica robusta para extrair os campos, seja String JSON ou Objeto
            let fields: CampoDef[] = [];
            if (typeof data.definicao_campos === 'string') {
                try {
                    fields = JSON.parse(data.definicao_campos);
                } catch (e) {
                    console.error("Erro ao parsear JSON de campos:", e);
                    fields = [];
                }
            } else if (Array.isArray(data.definicao_campos)) {
                fields = data.definicao_campos;
            } else {
                fields = [];
            }

            setPreviewFields(fields);
            setPreviewTitle(data.nome);

        } catch (error) {
            console.error(error);
            // Mantém o modal aberto mas limpa os campos em caso de erro
            setPreviewFields([]);
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleClosePreview = () => {
        setPreviewOpen(false);
        setPreviewFields([]);
    };

    // --- DEFINIÇÃO DAS COLUNAS ---
    const columns: GridColDef[] = [
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150 },
        { field: 'descricao', headerName: 'Descrição', flex: 1.5, minWidth: 200, valueFormatter: (value: string | null) => value || '-' },
        {
            field: 'tipo_demanda_associada',
            headerName: 'Tipo de Demanda',
            flex: 1.5,
            minWidth: 220,
            renderCell: (params) => {
                const content = params.value;
                if (!content) {
                    return <Typography variant="caption" color="text.secondary">Sem vínculo</Typography>;
                }
                return (
                    <Box sx={{ whiteSpace: 'normal', lineHeight: '1.4', height: '100%', overflow: 'visible', pt: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {content}
                        </Typography>
                    </Box>
                );
            }
        },
        {
            field: 'status_tipo',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => {
                const row = params.row as FormularioRow;
                const isGlobal = row.organization_id === null;

                if (isGlobal) {
                    return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LockIcon fontSize="small" color="disabled" />
                            <Typography variant="caption" color="textSecondary">Global</Typography>
                        </Box>
                    );
                }
                return (
                    <Typography variant="caption" color="primary">Customizado</Typography>
                );
            }
        },
        { field: 'updated_at', headerName: 'Atualizado em', width: 150, valueFormatter: (value: string) => value ? new Date(value).toLocaleDateString('pt-BR') : '-' },
        {
            field: 'actions', type: 'actions', headerName: 'Ações', width: 150,
            getActions: (params) => {
                const row = params.row as FormularioRow;
                const isGlobal = row.organization_id === null;
                
                // [FIX] Permite edição se o plano permitir customização (Basic/Pro/Premium) 
                // E o formulário NÃO for global.
                const isEditable = canManageFormularios && !isGlobal;

                return [
                    <GridActionsCellItem
                        key="view" icon={<VisibilityIcon />} label="Visualizar"
                        onClick={() => handleVisualize(Number(params.id))}
                    />,
                    <GridActionsCellItem
                        key="edit" icon={<CreateIcon />} label="Editar"
                        onClick={() => onEdit(Number(params.id))}
                        disabled={!isEditable}
                    />,
                    <GridActionsCellItem
                        key="delete" icon={<DeleteForeverIcon color="error" />} label="Deletar"
                        onClick={() => onDelete(Number(params.id))}
                        disabled={!isEditable}
                    />,
                ];
            }
        },
    ];

    if (isLoading && rows.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    if (error) return <Box sx={{ p: 2 }}><Alert severity="error">{error}</Alert></Box>;

    return (
        <>
            <Box sx={{ height: 500, width: '100%' }}>
                
                {/* Mensagem informativa para plano Free */}
                {!canManageFormularios && (
                    <Box sx={{ mb: 2 }}>
                        <Alert severity="info">
                            Modo de visualização. A criação e edição de formulários personalizados requer um plano pago.
                        </Alert>
                    </Box>
                )}

                {/* Mensagem de Limite Atingido (apenas se não puder criar mais e não for Pro/Premium) */}
                {!canCreateForm && userRole !== 'pro' && userRole !== 'premium' && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Seu Plano ({userRole?.toUpperCase()}) atingiu o limite de {maxFormularios} formulário(s). 
                        Considere atualizar para o Plano Pro/Premium para criar mais.
                    </Alert>
                )}

                {rows.length === 0 && !isLoading ? (
                    <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#f5f5f5', borderRadius: 2 }}>
                        <Typography color="text.secondary">Nenhum formulário criado ainda.</Typography>
                        <Button 
                            onClick={onAdd} 
                            disabled={!canCreateForm}
                            sx={{ mt: 2 }} 
                            variant="contained" 
                            startIcon={<AddIcon />}
                        >
                           Criar Formulário
                        </Button>
                        {!canCreateForm && (
                            <Typography variant="caption" display="block" color="error.main" sx={{ mt: 1 }}>
                                Limite atingido para o Plano {userRole?.toUpperCase()}.
                            </Typography>
                        )}
                    </Box>
                ) : (
                    <DataGrid
                        rows={rows} columns={columns}
                        initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
                        pageSizeOptions={[5, 10, 25]} disableRowSelectionOnClick
                        getRowHeight={() => 'auto'}
                        sx={{ border: 0 }}
                    />
                )}
            </Box>

            {/* --- MODAL DE VISUALIZAÇÃO --- */}
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
                {/* Botão de Fechar */}
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

                {/* Conteúdo (Celular) */}
                <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '680px' }}>
                    {previewLoading ? (
                        <CircularProgress sx={{ color: 'white' }} />
                    ) : (
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