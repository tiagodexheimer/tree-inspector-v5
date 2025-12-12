'use client';

import React, { useState, useEffect } from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, IconButton, Typography, CircularProgress, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSession } from 'next-auth/react';
import LockIcon from '@mui/icons-material/Lock';
import { UserRole, getLimitsByRole } from '@/types/auth-types';
// [NOVO] Importa o componente modal
import StatusFormModal from '@/components/ui/gerenciar/StatusFormModal';


interface StatusType {
    id: number;
    nome: string;
    cor: string;
    // Adicionadas as colunas do backend para controle de permissão e visualização
    organization_id: number | null;
    is_custom: boolean;
    is_default_global: boolean;
}

// O tipo base para o formulário
type CurrentStatusType = Partial<StatusType> | null;


export default function GerenciarStatusPage() {
    const { data: session, status } = useSession();

    const userRole = session?.user?.role as UserRole | undefined;
    const limits = userRole ? getLimitsByRole(userRole) : getLimitsByRole('free');
    const canManageStatus = limits.ALLOW_CUSTOM_STATUS;

    const [statusList, setStatusList] = useState<StatusType[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Estados do Modal
    const [openModal, setOpenModal] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [currentStatus, setCurrentStatus] = useState<CurrentStatusType>(null);
    const [modalError, setModalError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Estados do Delete
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState<boolean>(false);
    const [statusToDelete, setStatusToDelete] = useState<StatusType | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // --- Busca Inicial ---
    useEffect(() => {
        if (status === 'authenticated') {
            fetchStatus();
        }
    }, [status]);

    // --- Funções API ---
    const fetchStatus = async () => {
        // ... (fetchStatus mantido) ...
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/demandas-status');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Erro ${response.status}` }));
                throw new Error(errorData.message || `Erro HTTP ${response.status}`);
            }
            const data: StatusType[] = await response.json();
            setStatusList(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar status.');
        } finally {
            setIsLoading(false);
        }
    };


    const handleSave = async () => {
        // [FIX] A validação mínima já foi feita no modal component (StatusFormModal.tsx)
        setIsSaving(true);
        setModalError(null);

        // [FIX] O problema de esmaecimento estava aqui: a validação de cor/nome deve ser centralizada.
        const url = isEditing ? `/api/demandas-status?id=${currentStatus!.id}` : '/api/demandas-status';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: currentStatus!.nome!.trim(), cor: currentStatus!.cor }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || result.error || `Erro ${response.status}`);
            }
            handleCloseModal();
            fetchStatus();
        } catch (err) {
            setModalError(err instanceof Error ? err.message : `Erro ao ${isEditing ? 'salvar' : 'criar'} status.`);
        } finally {
            setIsSaving(false);
        }
    };


    const handleDeleteConfirm = async () => {
        if (!statusToDelete) return;
        setIsDeleting(true);
        setDeleteError(null);
        try {
            const response = await fetch(`/api/demandas-status?id=${statusToDelete.id}`, { method: 'DELETE' });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.message || `Erro ${response.status}`);
            }
            handleCloseDeleteConfirm();
            fetchStatus();
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Erro ao deletar status.');
        } finally {
            setIsDeleting(false);
        }
    };

    // --- Handlers Modal ---
    const handleOpenModal = (status: CurrentStatusType = null) => {
        // [FIX CRÍTICO DO MODAL] O erro era a inicialização do currentStatus para um objeto vazio,
        // que pode ter causado a falha de renderização do Dialog.
        setIsEditing(!!status);
        setCurrentStatus(status ? { ...status } : { nome: '', cor: '#808080' });
        setModalError(null);
        // Abertura do modal garantida
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setCurrentStatus(null);
        setIsSaving(false);
        setModalError(null); // Limpar erro ao fechar
    };

    const handleModalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        // O `!` garante que o TS não reclame, pois o modal só abre se `currentStatus` não for null
        setCurrentStatus(prev => ({ ...prev!, [name]: value }));
        if (modalError) setModalError(null);
    };

    const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentStatus(prev => ({ ...prev!, cor: event.target.value }));
        if (modalError) setModalError(null);
    };

    // --- Handlers Delete Confirm (Mantidos) ---
    const handleOpenDeleteConfirm = (status: StatusType) => {
        setStatusToDelete(status);
        setDeleteError(null);
        setOpenDeleteConfirm(true);
    };
    const handleCloseDeleteConfirm = () => {
        setOpenDeleteConfirm(false);
        setStatusToDelete(null);
        setIsDeleting(false);
    };

    // --- Renderização ---
    if (status === 'loading') { /* ... */ }
    if (status === 'unauthenticated') { return null; }

    return (
        <div className="p-4">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Gerenciar Status das Demandas
                </Typography>

                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    // [FIX] Chama handleOpenModal sem argumentos para Adicionar
                    onClick={() => handleOpenModal()}
                    disabled={!canManageStatus}
                    sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}
                >
                    Adicionar Status
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {!canManageStatus && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Modo de visualização. Apenas os Planos **Pro** e **Premium** podem criar ou editar status personalizados.
                </Alert>
            )}

            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Nome</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Cor</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {statusList.map((status) => {
                                const isCustomAndOwner = status.is_custom && !status.is_default_global;
                                const isEditable = canManageStatus && isCustomAndOwner;

                                return (
                                    <TableRow key={status.id}>
                                        <TableCell>{status.id}</TableCell>
                                        <TableCell>{status.nome}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {/* Certifique-se de que a cor está sendo lida aqui */}
                                                <Box sx={{ width: 20, height: 20, backgroundColor: status.cor, borderRadius: '4px', border: '1px solid #ccc' }} />
                                                <Typography variant="body2">{status.cor}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {status.is_default_global ? (
                                                    <>
                                                        <LockIcon fontSize="small" color="disabled" />
                                                        <Typography variant="body2" color="textSecondary">Padrão Global</Typography>
                                                    </>
                                                ) : (
                                                    <Typography variant="body2" color={status.is_custom ? "primary" : "textSecondary"}>
                                                        {status.is_custom ? "Customizado" : "Padrão ORG (Legado)"}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton
                                                onClick={() => handleOpenModal(status)}
                                                color="primary"
                                                title="Editar Status"
                                                disabled={!isEditable}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton
                                                onClick={() => handleOpenDeleteConfirm(status)}
                                                color="error"
                                                title="Deletar Status"
                                                disabled={!isEditable}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {statusList.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">Nenhum status cadastrado.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* [FIX] Usa o novo componente modal extraído */}
            <StatusFormModal
                open={openModal}
                isEditing={isEditing}
                currentStatus={currentStatus}
                modalError={modalError}
                isSaving={isSaving}
                onClose={handleCloseModal}
                onSave={handleSave}
                onModalChange={handleModalChange}
                onColorChange={handleColorChange}
                setModalError={setModalError}
            />

            {/* Modal Confirmar Delete mantido */}
            <Dialog open={openDeleteConfirm} onClose={handleCloseDeleteConfirm}>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <Typography> Tem certeza que deseja excluir o status &quot;{statusToDelete?.nome}&quot;? </Typography>
                    <Typography variant="caption" color="textSecondary"> Esta ação não pode ser desfeita. </Typography>
                    {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm} disabled={isDeleting}>Cancelar</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={isDeleting}>
                        {isDeleting ? <CircularProgress size={24} color="inherit" /> : 'Excluir'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}