// src/app/gerenciar/usuarios/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, Typography, CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem,
    SelectChangeEvent // <-- CORREÇÃO: Importar SelectChangeEvent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import { useSession } from 'next-auth/react'; // Importante para segurança

// Interface para o usuário
interface User {
    id: string; // Lembre-se que seu ID é 'text'
    name: string;
    email: string;
    role: 'admin' | 'paid_user' | 'free_user';
}

// Interface para o formulário de novo usuário
interface NewUserForm {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'paid_user' | 'free_user';
}

export default function GerenciarUsuariosPage() {
    // Segurança da Página
    const { data: session, status } = useSession();

    const [usersList, setUsersList] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Estado do Modal de Criar
    const [openModal, setOpenModal] = useState<boolean>(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [newUser, setNewUser] = useState<NewUserForm>({ name: '', email: '', password: '', role: 'free_user' });

    // Estado do Modal de Deletar
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState<boolean>(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // --- Busca Inicial ---
    const fetchUsers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/users');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Erro HTTP ${response.status}`);
            }
            const data: User[] = await response.json();
            setUsersList(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar usuários.');
        } finally {
            setIsLoading(false);
        }
    };

    // Roda a busca quando o componente montar (se for admin)
    useEffect(() => {
        // Correção: removido 'as any'
        if (status === 'authenticated' && session?.user?.role === 'admin') {
            fetchUsers();
        }
    }, [status, session]);

    // --- Handlers de Ações ---
    const handleSave = async () => {
        if (!newUser.email || !newUser.password || !newUser.role) {
            setModalError('Email, Senha e Papel são obrigatórios.');
            return;
        }
        setIsSaving(true);
        setModalError(null);
        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || `Erro ${response.status}`);
            }
            handleCloseModal();
            fetchUsers(); // Recarrega a lista
        } catch (err) {
            setModalError(err instanceof Error ? err.message : 'Erro ao criar usuário.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;
        
        // Proteção: não deixar o admin logado se auto-deletar
        // Correção: removido 'as any'
        if (session?.user?.id === userToDelete.id) {
            setDeleteError("Você não pode apagar a si mesmo.");
            setIsDeleting(false);
            return;
        }
        
        setIsDeleting(true);
        setDeleteError(null);
        try {
            const response = await fetch(`/api/admin/users/${userToDelete.id}`, { method: 'DELETE' });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.message || `Erro ${response.status}`);
            }
            handleCloseDeleteConfirm();
            fetchUsers(); // Recarrega
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Erro ao deletar usuário.');
        } finally {
            setIsDeleting(false);
        }
    };

    // --- Handlers de Modais ---
    const handleOpenModal = () => {
        setNewUser({ name: '', email: '', password: '', role: 'free_user' });
        setModalError(null);
        setOpenModal(true);
    };
    const handleCloseModal = () => {
        setOpenModal(false);
        setIsSaving(false);
    };
    const handleModalChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setNewUser(prev => ({ ...prev, [name]: value }));
        if (modalError) setModalError(null);
    };
    
    // +++ INÍCIO DA CORREÇÃO +++
    // Função corrigida para usar o tipo SelectChangeEvent
    const handleRoleChange = (event: SelectChangeEvent<NewUserForm['role']>) => {
        setNewUser(prev => ({ ...prev, role: event.target.value as NewUserForm['role'] }));
    };
    // +++ FIM DA CORREÇÃO +++

    const handleOpenDeleteConfirm = (user: User) => {
        setUserToDelete(user);
        setDeleteError(null);
        setOpenDeleteConfirm(true);
    };
    const handleCloseDeleteConfirm = () => {
        setOpenDeleteConfirm(false);
        setUserToDelete(null);
        setIsDeleting(false);
    };

    // --- RENDERIZAÇÃO E SEGURANÇA ---
    if (status === 'loading') {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress /> <Typography sx={{ ml: 2 }}>Verificando autorização...</Typography>
            </Box>
        );
    }

    // Correção: removido 'as any'
    if (status !== 'authenticated' || session.user.role !== 'admin') {
        return (
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <LockIcon color="error" sx={{ fontSize: 60 }} />
                <Typography variant="h5" color="error">Acesso Negado</Typography>
                <Typography>Você precisa ser um administrador para acessar esta página.</Typography>
            </Box>
        );
    }
    
    // Se chegou aqui, é admin.
    return (
        <div className="p-4">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Gerenciar Usuários
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenModal}
                    sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}
                >
                    Adicionar Usuário
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
                                <TableCell sx={{ fontWeight: 'bold' }}>Nome</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Papel (Role)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {usersList.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.name || '(Sem nome)'}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.role}</TableCell>
                                    <TableCell align="right">
                                        <IconButton 
                                            onClick={() => handleOpenDeleteConfirm(user)} 
                                            color="error" 
                                            title="Deletar Usuário"
                                            // Correção: removido 'as any'
                                            disabled={session?.user?.id === user.id} 
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Modal Adicionar Usuário */}
            <Dialog open={openModal} onClose={handleCloseModal} fullWidth maxWidth="xs">
                <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                <DialogContent>
                    {modalError && <Alert severity="error" sx={{ mb: 2 }}>{modalError}</Alert>}
                    <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField label="Nome (Opcional)" name="name" value={newUser.name} onChange={handleModalChange} variant="outlined" fullWidth />
                        <TextField label="Email" name="email" type="email" value={newUser.email} onChange={handleModalChange} variant="outlined" fullWidth required error={!!modalError && !newUser.email} />
                        <TextField label="Senha" name="password" type="password" value={newUser.password} onChange={handleModalChange} variant="outlined" fullWidth required error={!!modalError && !newUser.password} />
                        <FormControl fullWidth required error={!!modalError && !newUser.role}>
                            <InputLabel>Papel (Role)</InputLabel>
                            {/* +++ INÍCIO DA CORREÇÃO +++ */}
                            {/* Removido o 'as any' da prop onChange */}
                            <Select name="role" value={newUser.role} label="Papel (Role)" onChange={handleRoleChange}>
                            {/* +++ FIM DA CORREÇÃO +++ */}
                                <MenuItem value="free_user">Usuário Gratuito</MenuItem>
                                <MenuItem value="paid_user">Usuário Pago</MenuItem>
                                <MenuItem value="admin">Administrador</MenuItem>
                            </Select>
                        </FormControl>
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
                    <Typography> Tem certeza que deseja excluir o usuário &quot;{userToDelete?.email}&quot;? </Typography>
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