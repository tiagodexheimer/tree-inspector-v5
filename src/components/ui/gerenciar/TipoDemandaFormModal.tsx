// src/components/gerenciar/TipoDemandaFormModal.tsx

'use client';

import React from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField,
    CircularProgress, Alert, Typography
} from '@mui/material';

interface TipoDemandaFormType {
    id?: number;
    nome: string;
    id_formulario: number | null; // Assumindo que o ID do formulário é um número ou null
}

interface TipoDemandaFormModalProps {
    open: boolean;
    isEditing: boolean;
    currentTipo: Partial<TipoDemandaFormType> | null;
    modalError: string | null;
    isSaving: boolean;
    formulariosDisponiveis: { id: number, nome: string }[];
    onClose: () => void;
    onSave: () => Promise<void>;
    onModalChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    setModalError: React.Dispatch<React.SetStateAction<string | null>>;
}

const TipoDemandaFormModal: React.FC<TipoDemandaFormModalProps> = ({
    open,
    isEditing,
    currentTipo,
    modalError,
    isSaving,
    onClose,
    onSave,
    onModalChange,
    setModalError,
    formulariosDisponiveis
}) => {
    
    // Ação de salvar localmente, garantindo validação mínima
    const handleLocalSave = async () => {
        if (!currentTipo?.nome || currentTipo.nome.trim() === '') {
            setModalError('O nome do Tipo de Demanda é obrigatório.');
            return;
        }
        await onSave();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>{isEditing ? 'Editar Tipo de Demanda' : 'Adicionar Novo Tipo de Demanda'}</DialogTitle>
            <DialogContent>
                {modalError && <Alert severity="error" sx={{ mb: 2 }}>{modalError}</Alert>}
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        label="Nome do Tipo de Demanda"
                        name="nome"
                        value={currentTipo?.nome || ''}
                        onChange={onModalChange}
                        variant="outlined"
                        fullWidth
                        required
                        error={!!modalError && !currentTipo?.nome?.trim()} 
                    />
                    
                    {/* [NOVO CAMPO] Seleção de Formulário (usando um TextField básico como placeholder para simplicidade) */}
                    <TextField
                        select
                        label="Formulário Vinculado (Opcional)"
                        name="id_formulario"
                        value={currentTipo?.id_formulario || ''}
                        onChange={onModalChange}
                        variant="outlined"
                        fullWidth
                        SelectProps={{ native: true }}
                    >
                        <option value={''}>Nenhum</option>
                        {formulariosDisponiveis.map((form) => (
                            <option key={form.id} value={form.id}>
                                {form.nome}
                            </option>
                        ))}
                    </TextField>

                    <Typography variant="caption" color="textSecondary">
                        O Tipo de Demanda determina o formulário de vistoria a ser usado.
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button onClick={handleLocalSave} variant="contained" disabled={isSaving}>
                    {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Salvar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TipoDemandaFormModal;