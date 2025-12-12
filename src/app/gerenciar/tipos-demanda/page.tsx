// src/app/gerenciar/tipos-demanda/page.tsx

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
import { useSession } from 'next-auth/react';
import LockIcon from '@mui/icons-material/Lock';

// [FIX 1] Importa os utilitários de permissão e o novo componente modal
import { UserRole, getLimitsByRole } from '@/types/auth-types';
import TipoDemandaFormModal from '@/components/ui/gerenciar/TipoDemandaFormModal'; 


interface TipoDemandaType {
    id: number;
    nome: string;
    id_formulario: number | null;
    formulario_nome: string | null;
    // [IMPORTANTE] Adicionado para que o frontend possa aplicar a lógica de negócio
    is_custom: boolean;
    is_default_global: boolean;
}

// O tipo base para o formulário
type CurrentTipoType = Partial<TipoDemandaType> | null;

// [NOVO ESTADO] Para simular a lista de Formulários (em produção, viria de outra API)
const DUMMY_FORMULARIOS = [
    { id: 1, nome: "Vistoria Padrão Árvore" },
    { id: 2, nome: "Checklist Poda" },
];


export default function GerenciarTiposDemandaPage() {
    const { data: session, status } = useSession();
    
    // [FIX 2] Calcula a permissão de escrita baseada no plano do usuário
    const userRole = session?.user?.role as UserRole | undefined;
    const limits = userRole ? getLimitsByRole(userRole) : getLimitsByRole('free');
    const canManageTipos = limits.ALLOW_CUSTOM_TYPES; // true para Pro/Premium

    const [tiposList, setTiposList] = useState<TipoDemandaType[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
    // Estados do Modal
    const [openModal, setOpenModal] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [currentTipo, setCurrentTipo] = useState<CurrentTipoType>(null);
    const [modalError, setModalError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    
    // Estados do Delete
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState<boolean>(false);
    const [tipoToDelete, setTipoToDelete] = useState<TipoDemandaType | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // --- Busca Inicial ---
    useEffect(() => {
        if (status === 'authenticated') {
            fetchTipos();
        }
    }, [status]);

    // --- Funções API ---
    const fetchTipos = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/demandas-tipos');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Erro ${response.status}` }));
                throw new Error(errorData.message || `Erro HTTP ${response.status}`);
            }
            const data: TipoDemandaType[] = await response.json(); 
            setTiposList(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar tipos de demanda.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        // Validação mínima garantida no modal, mas reforçada aqui para a chamada API
        if (!currentTipo?.nome || currentTipo.nome.trim() === '') return;

        setIsSaving(true);
        setModalError(null);
        
        // Passa o ID via query param
        const url = isEditing ? `/api/demandas-tipos?id=${currentTipo!.id}` : '/api/demandas-tipos';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    nome: currentTipo!.nome!.trim(), 
                    // Garante que 0 ou "" não passem como ID
                    id_formulario: currentTipo!.id_formulario || null, 
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || result.error || `Erro ${response.status}`);
            }
            handleCloseModal();
            fetchTipos();
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
            // Passa o ID via query param
            const response = await fetch(`/api/demandas-tipos?id=${tipoToDelete.id}`, { method: 'DELETE' });
            const result = await response.json().catch(() => ({})); 
            if (!response.ok) {
                 throw new Error(result.message || `Erro ${response.status}`);
            }
            handleCloseDeleteConfirm();
            fetchTipos(); 
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Erro ao deletar tipo.');
        } finally {
             setIsDeleting(false);
        }
    };

    // --- Handlers Modal ---
    const handleOpenModal = (tipo: CurrentTipoType = null) => {
        setIsEditing(!!tipo);
        setCurrentTipo(tipo ? { ...tipo } : { nome: '', id_formulario: null }); 
        setModalError(null);
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setCurrentTipo(null);
        setIsSaving(false);
        setModalError(null); 
    };

    const handleModalChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.target;
        
        let typedValue: string | number | null = value;

        // Trata a conversão de id_formulario para number ou null
        if (name === 'id_formulario') {
            typedValue = value ? parseInt(value, 10) : null;
        }

        setCurrentTipo(prev => ({ ...prev!, [name]: typedValue }));
        if (modalError) setModalError(null);
    };


    // --- Handlers Delete Confirm (Mantidos) ---
    const handleOpenDeleteConfirm = (tipo: TipoDemandaType) => {
          setTipoToDelete(tipo);
          setDeleteError(null);
          setOpenDeleteConfirm(true);
    };
    const handleCloseDeleteConfirm = () => {
          setOpenDeleteConfirm(false);
          setTipoToDelete(null);
          setIsDeleting(false);
    };


    // --- Renderização ---
    if (status === 'loading') {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                 <CircularProgress /> <Typography sx={{ ml: 2 }}>Verificando autorização...</Typography>
            </Box>
        );
    }
    if (status !== 'authenticated') { return null; }

    return (
        <div className="p-4">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Gerenciar Tipos de Demanda
                </Typography>
                
                {/* Botão Adicionar habilitado se o plano permitir */}
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenModal()}
                    disabled={!canManageTipos} 
                    sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}
                >
                    Adicionar Tipo
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Aviso de Modo de Visualização */}
            {!canManageTipos && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Modo de visualização. Apenas os Planos **Pro** e **Premium** podem criar ou editar Tipos de Demanda.
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
                                <TableCell sx={{ fontWeight: 'bold' }}>Formulário Vinculado</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tiposList.map((tipo) => {
                                const isGlobal = tipo.is_default_global;
                                // Só permite edição/deleção se o plano permitir E NÃO for global
                                const isEditable = canManageTipos && !isGlobal;

                                return (
                                    <TableRow key={tipo.id}>
                                        <TableCell>{tipo.id}</TableCell>
                                        <TableCell>{tipo.nome}</TableCell>
                                        <TableCell>
                                            {tipo.formulario_nome || 'Nenhum'}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {isGlobal ? (
                                                    <>
                                                        <LockIcon fontSize="small" color="disabled" />
                                                        <Typography variant="body2" color="textSecondary">Padrão Global</Typography>
                                                    </>
                                                ) : (
                                                    <Typography variant="body2" color={tipo.is_custom ? "primary" : "textSecondary"}>
                                                        {tipo.is_custom ? "Customizado" : "Padrão ORG (Legado)"}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        
                                        <TableCell align="right">
                                            {/* Botões habilitados por isEditable */}
                                            <IconButton onClick={() => handleOpenModal(tipo)} color="primary" disabled={!isEditable}><EditIcon /></IconButton>
                                            <IconButton onClick={() => handleOpenDeleteConfirm(tipo)} color="error" disabled={!isEditable}><DeleteIcon /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {tiposList.length === 0 && <TableRow><TableCell colSpan={5} align="center">Nenhum tipo cadastrado.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* [FIX 3] Usa o novo componente modal extraído */}
            {currentTipo && (
                <TipoDemandaFormModal
                    open={openModal}
                    isEditing={isEditing}
                    currentTipo={currentTipo}
                    modalError={modalError}
                    isSaving={isSaving}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    onModalChange={handleModalChange as any} // Cast necessário devido ao evento select
                    setModalError={setModalError}
                    formulariosDisponiveis={DUMMY_FORMULARIOS} // Usando lista dummy por enquanto
                />
            )}

            {/* Modal Confirmar Delete mantido */}
            <Dialog open={openDeleteConfirm} onClose={handleCloseDeleteConfirm}>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <Typography> Tem certeza que deseja excluir o Tipo de Demanda &quot;{tipoToDelete?.nome}&quot;? </Typography>
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