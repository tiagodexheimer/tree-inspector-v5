// src/app/gerenciar/tipos-demanda/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    IconButton, Typography, CircularProgress, Alert,
    FormControl, InputLabel, Select, MenuItem, SelectChangeEvent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSession } from 'next-auth/react';
import LockIcon from '@mui/icons-material/Lock';

interface TipoDemanda {
    id: number;
    nome: string;
    id_formulario?: number | null; // ID vinculado
    nome_formulario?: string | null; // Nome para exibir na tabela
}

interface FormularioOption {
    id: number;
    nome: string;
}

export default function GerenciarTiposDemandaPage() {
    const { data: session, status } = useSession();
    const isAdmin = status === 'authenticated' && session?.user?.role === 'admin';

    const [tiposList, setTiposList] = useState<TipoDemanda[]>([]);
    const [formulariosList, setFormulariosList] = useState<FormularioOption[]>([]); // Lista de formulários
    
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
    const [openModal, setOpenModal] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [currentTipo, setCurrentTipo] = useState<Partial<TipoDemanda> | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState<boolean>(false);
    const [tipoToDelete, setTipoToDelete] = useState<TipoDemanda | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // --- Busca Inicial ---
    useEffect(() => {
        if (isAdmin) {
            fetchData();
        } else if (status === 'authenticated') {
            setIsLoading(false);
        }
    }, [isAdmin, status]);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Busca Tipos e Formulários em paralelo
            const [tiposRes, formsRes] = await Promise.all([
                fetch('/api/demandas-tipos'),
                fetch('/api/gerenciar/formularios')
            ]);

            if (!tiposRes.ok) throw new Error('Erro ao carregar tipos.');
            if (!formsRes.ok) throw new Error('Erro ao carregar formulários.');

            const tiposData = await tiposRes.json();
            const formsData = await formsRes.json();

            setTiposList(tiposData);
            setFormulariosList(formsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar dados.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentTipo?.nome || currentTipo.nome.trim() === '') {
            setModalError('O nome do tipo é obrigatório.');
            return;
        }

        setIsSaving(true);
        setModalError(null);
        const url = isEditing ? `/api/demandas-tipos/${currentTipo.id}` : '/api/demandas-tipos';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    nome: currentTipo.nome.trim(),
                    id_formulario: currentTipo.id_formulario // Envia o ID do formulário selecionado
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || result.error || `Erro ${response.status}`);
            }
            handleCloseModal();
            fetchData(); // Recarrega tudo
        } catch (err) {
            setModalError(err instanceof Error ? err.message : `Erro ao ${isEditing ? 'salvar' : 'criar'} tipo.`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteConfirm = async () => {
         if (!tipoToDelete) return;
        setIsDeleting(true);
        setDeleteError(null);
        try {
            const response = await fetch(`/api/demandas-tipos/${tipoToDelete.id}`, { method: 'DELETE' });
             const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.message || `Erro ${response.status}`);
            }
            handleCloseDeleteConfirm();
            fetchData();
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Erro ao deletar tipo.');
        } finally {
             setIsDeleting(false);
        }
    };

    // --- Handlers Modal ---
    const handleOpenModal = (tipo: Partial<TipoDemanda> | null = null) => {
        setIsEditing(!!tipo);
        // Se for criar, id_formulario começa como vazio ('')
        setCurrentTipo(tipo ? { ...tipo } : { nome: '', id_formulario: null });
        setModalError(null);
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setCurrentTipo(null);
        setIsSaving(false);
    };

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentTipo(prev => prev ? { ...prev, nome: event.target.value } : null);
        if (modalError) setModalError(null);
    };

    const handleFormularioChange = (event: SelectChangeEvent<string | number>) => {
        const value = event.target.value;
        // Se valor for string vazia ou 0, consideramos null (sem formulário)
        const idForm = (value === '' || value === 0) ? null : Number(value);
        setCurrentTipo(prev => prev ? { ...prev, id_formulario: idForm } : null);
    };

    // ... (Handlers Delete Confirm iguais) ...
    const handleOpenDeleteConfirm = (tipo: TipoDemanda) => { setTipoToDelete(tipo); setDeleteError(null); setOpenDeleteConfirm(true); };
    const handleCloseDeleteConfirm = () => { setOpenDeleteConfirm(false); setTipoToDelete(null); setIsDeleting(false); };


    if (status === 'loading') return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /><Typography sx={{ ml: 2 }}>Verificando...</Typography></Box>;
    if (status !== 'authenticated' || !isAdmin) return <Box sx={{ p: 4, textAlign: 'center' }}><LockIcon color="error" sx={{ fontSize: 60 }} /><Typography variant="h5" color="error">Acesso Negado</Typography></Box>;

    return (
        <div className="p-4">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1" gutterBottom>Gerenciar Tipos de Demanda</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenModal()} sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}>
                    Adicionar Tipo
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Nome</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Formulário Vinculado</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tiposList.map((tipo) => (
                                <TableRow key={tipo.id}>
                                    <TableCell>{tipo.id}</TableCell>
                                    <TableCell>{tipo.nome}</TableCell>
                                    <TableCell>
                                        {tipo.nome_formulario ? (
                                            <Typography variant="body2" color="primary" fontWeight="medium">
                                                {tipo.nome_formulario}
                                            </Typography>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">
                                                - Sem vínculo -
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton onClick={() => handleOpenModal(tipo)} color="primary"><EditIcon /></IconButton>
                                        <IconButton onClick={() => handleOpenDeleteConfirm(tipo)} color="error"><DeleteIcon /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {tiposList.length === 0 && <TableRow><TableCell colSpan={4} align="center">Nenhum tipo cadastrado.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Modal Adicionar/Editar */}
            <Dialog open={openModal} onClose={handleCloseModal} fullWidth maxWidth="xs">
                <DialogTitle>{isEditing ? 'Editar Tipo' : 'Novo Tipo'}</DialogTitle>
                <DialogContent>
                     {modalError && <Alert severity="error" sx={{ mb: 2 }}>{modalError}</Alert>}
                    <Box component="form" sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <TextField
                            label="Nome do Tipo"
                            value={currentTipo?.nome || ''}
                            onChange={handleNameChange}
                            variant="outlined"
                            fullWidth
                            required
                            autoFocus
                        />
                        
                        {/* SELETOR DE FORMULÁRIO */}
                        <FormControl fullWidth>
                            <InputLabel id="form-select-label">Vincular Formulário</InputLabel>
                            <Select
                                labelId="form-select-label"
                                value={currentTipo?.id_formulario ?? ''}
                                label="Vincular Formulário"
                                onChange={handleFormularioChange}
                            >
                                <MenuItem value="">
                                    <em>Nenhum (Deixar em branco)</em>
                                </MenuItem>
                                {formulariosList.map((form) => (
                                    <MenuItem key={form.id} value={form.id}>
                                        {form.nome}
                                    </MenuItem>
                                ))}
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
                    <Typography>Tem certeza que deseja excluir &quot;{tipoToDelete?.nome}&quot;?</Typography>
                    {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm} disabled={isDeleting}>Cancelar</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={isDeleting}>Excluir</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}