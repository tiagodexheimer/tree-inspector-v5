// src/app/gerenciar/status/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, Typography, CircularProgress, Alert, InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ColorLensIcon from '@mui/icons-material/ColorLens'; // Para o seletor de cor
// [NOVO] Importações de Autenticação
import { useSession } from 'next-auth/react';
import LockIcon from '@mui/icons-material/Lock';

// Interface para o tipo Status
interface StatusType {
    id: number;
    nome: string;
    cor: string;
}

export default function GerenciarStatusPage() {
    // [NOVO] Verificação de Admin
    const { data: session, status } = useSession();
    // Usamos session?.user?.role (safe navigation)
    const isAdmin = status === 'authenticated' && session?.user?.role === 'admin';

    const [statusList, setStatusList] = useState<StatusType[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [openModal, setOpenModal] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [currentStatus, setCurrentStatus] = useState<Partial<StatusType> | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState<boolean>(false);
    const [statusToDelete, setStatusToDelete] = useState<StatusType | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // --- Busca Inicial ---
    useEffect(() => {
        // [MODIFICADO] Só busca os dados se for admin
        if (isAdmin) {
            fetchStatus();
        } else if (status === 'authenticated') {
            // Se está logado mas não é admin, para o loading
            setIsLoading(false);
        }
    }, [isAdmin, status]); // Depende de isAdmin e status

    // --- Funções API ---
    const fetchStatus = async () => {
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
        if (!currentStatus?.nome || currentStatus.nome.trim() === '') {
            setModalError('O nome do status é obrigatório.');
            return;
        }
        if (!currentStatus?.cor || !/^#[0-9A-F]{6}$/i.test(currentStatus.cor)) {
             setModalError('A cor é obrigatória e deve estar no formato #RRGGBB.');
            return;
        }

        setIsSaving(true);
        setModalError(null);
        const url = isEditing ? `/api/demandas-status/${currentStatus.id}` : '/api/demandas-status';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: currentStatus.nome.trim(), cor: currentStatus.cor }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || result.error || `Erro ${response.status}`);
            }
            handleCloseModal();
            fetchStatus(); // Recarrega a lista
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
            const response = await fetch(`/api/demandas-status/${statusToDelete.id}`, { method: 'DELETE' });
             const result = await response.json().catch(() => ({})); // Pega JSON mesmo se não for OK
            if (!response.ok) {
                throw new Error(result.message || `Erro ${response.status}`);
            }
            handleCloseDeleteConfirm();
            fetchStatus(); // Recarrega
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Erro ao deletar status.');
        } finally {
             setIsDeleting(false);
        }
    };


    // --- Handlers Modal ---
    const handleOpenModal = (status: Partial<StatusType> | null = null) => {
        setIsEditing(!!status);
        setCurrentStatus(status ? { ...status } : { nome: '', cor: '#808080' }); // Define cor padrão cinza para novo
        setModalError(null);
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setCurrentStatus(null);
        setIsSaving(false); // Garante reset do loading
    };

    const handleModalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setCurrentStatus(prev => prev ? { ...prev, [name]: value } : null);
         // Limpa erro ao digitar
         if (modalError) setModalError(null);
    };

    const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
         setCurrentStatus(prev => prev ? { ...prev, cor: event.target.value } : null);
         if (modalError) setModalError(null);
    };

    // --- Handlers Delete Confirm ---
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

    // --- [NOVO] Renderização de Segurança ---
    if (status === 'loading') {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress /> <Typography sx={{ ml: 2 }}>Verificando autorização...</Typography>
            </Box>
        );
    }

    // A verificação de !isAdmin já cobre o 'status !== 'authenticated''
    if (!isAdmin) {
        return (
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <LockIcon color="error" sx={{ fontSize: 60 }} />
                <Typography variant="h5" color="error">Acesso Negado</Typography>
                <Typography>Você precisa ser um administrador para acessar esta página.</Typography>
            </Box>
        );
    }
    // --- [FIM NOVO] ---


    // --- Renderização (Se for admin) ---
    return (
        <div className="p-4">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Gerenciar Status das Demandas
                </Typography>
                {/* O botão "Adicionar" só é renderizado se for admin, o que já foi checado */}
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenModal()}
                    sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}
                >
                    Adicionar Status
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {statusList.map((status) => (
                                <TableRow key={status.id}>
                                    <TableCell>{status.id}</TableCell>
                                    <TableCell>{status.nome}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 20, height: 20, backgroundColor: status.cor, borderRadius: '4px', border: '1px solid #ccc' }} />
                                            <Typography variant="body2">{status.cor}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                        {/* Ações só renderizam se for admin, o que já foi checado */}
                                        <IconButton onClick={() => handleOpenModal(status)} color="primary" title="Editar Status">
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton onClick={() => handleOpenDeleteConfirm(status)} color="error" title="Deletar Status">
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {statusList.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">Nenhum status cadastrado.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Modal Adicionar/Editar */}
            <Dialog open={openModal} onClose={handleCloseModal} fullWidth maxWidth="xs">
                <DialogTitle>{isEditing ? 'Editar Status' : 'Adicionar Novo Status'}</DialogTitle>
                <DialogContent>
                     {modalError && <Alert severity="error" sx={{ mb: 2 }}>{modalError}</Alert>}
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            label="Nome do Status"
                            name="nome"
                            value={currentStatus?.nome || ''}
                            onChange={handleModalChange}
                            variant="outlined"
                            fullWidth
                            required
                            error={!!modalError && !currentStatus?.nome?.trim()} // Exemplo de validação visual
                        />
                        <TextField
                            label="Cor"
                            name="cor"
                            value={currentStatus?.cor || '#808080'}
                            onChange={handleColorChange}
                            variant="outlined"
                            fullWidth
                            required
                            type="color" // Usa o input de cor nativo do HTML
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <ColorLensIcon />
                                    </InputAdornment>
                                ),
                                style: { padding: '8px' } // Ajusta padding para o input color
                            }}
                            error={!!modalError && !/^#[0-9A-F]{6}$/i.test(currentStatus?.cor || '')} // Exemplo validação visual
                            sx={{
                                // Melhora a aparência do input color
                                '& input[type="color"]': {
                                    height: '40px',
                                    cursor: 'pointer',
                                    border: 'none',
                                    padding: 0,
                                    width: '100%' // Ocupa espaço disponível no Adornment
                                }
                            }}
                         />
                         {/* Mostra a cor selecionada */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: -1 }}>
                            <Typography variant='caption'>Prévia:</Typography>
                            <Box sx={{ width: 24, height: 24, backgroundColor: currentStatus?.cor || '#808080', borderRadius: '4px', border: '1px solid #ccc' }} />
                             <Typography variant='caption'>{currentStatus?.cor || '#808080'}</Typography>
                        </Box>

                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal} disabled={isSaving}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" disabled={isSaving}>
                        {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Salvar'}
                    </Button>
                </DialogActions>
            </Dialog>

             {/* Modal Confirmar Delete */}
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