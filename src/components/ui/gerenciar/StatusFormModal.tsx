// src/components/gerenciar/StatusFormModal.tsx

import React from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField,
    CircularProgress, Alert, InputAdornment, Typography
} from '@mui/material';
import ColorLensIcon from '@mui/icons-material/ColorLens';

// Definindo o tipo base do Status para o formulário
interface StatusFormType {
    id?: number;
    nome: string;
    cor: string;
}

interface StatusFormModalProps {
    open: boolean;
    isEditing: boolean;
    currentStatus: Partial<StatusFormType> | null;
    modalError: string | null;
    isSaving: boolean;
    onClose: () => void;
    onSave: () => Promise<void>; // Ação de salvar vinda do componente pai
    onModalChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onColorChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    setModalError: React.Dispatch<React.SetStateAction<string | null>>;
}

const StatusFormModal: React.FC<StatusFormModalProps> = ({
    open,
    isEditing,
    currentStatus,
    modalError,
    isSaving,
    onClose,
    onSave,
    onModalChange,
    onColorChange,
    setModalError
}) => {
    
    // Ações de formulário (mantidas simples para evitar bugs no refactoring)
    const handleLocalSave = async () => {
        if (!currentStatus?.nome || currentStatus.nome.trim() === '') {
            setModalError('O nome do status é obrigatório.');
            return;
        }
        if (!currentStatus?.cor || !/^#[0-9A-F]{6}$/i.test(currentStatus.cor)) {
            setModalError('A cor é obrigatória e deve estar no formato #RRGGBB.');
            return;
        }
        await onSave();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>{isEditing ? 'Editar Status' : 'Adicionar Novo Status'}</DialogTitle>
            <DialogContent>
                {modalError && <Alert severity="error" sx={{ mb: 2 }}>{modalError}</Alert>}
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        label="Nome do Status"
                        name="nome"
                        value={currentStatus?.nome || ''}
                        onChange={onModalChange}
                        variant="outlined"
                        fullWidth
                        required
                        error={!!modalError && !currentStatus?.nome?.trim()} 
                    />
                    <TextField
                        label="Cor"
                        name="cor"
                        value={currentStatus?.cor || '#808080'}
                        onChange={onColorChange}
                        variant="outlined"
                        fullWidth
                        required
                        type="color" 
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <ColorLensIcon />
                                </InputAdornment>
                            ),
                            style: { padding: '8px' } 
                        }}
                        error={!!modalError && !/^#[0-9A-F]{6}$/i.test(currentStatus?.cor || '')} 
                        sx={{
                            '& input[type="color"]': {
                                height: '40px',
                                cursor: 'pointer',
                                border: 'none',
                                padding: 0,
                                width: '100%' 
                            }
                        }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: -1 }}>
                        <Typography variant='caption'>Prévia:</Typography>
                        <Box sx={{ width: 24, height: 24, backgroundColor: currentStatus?.cor || '#808080', borderRadius: '4px', border: '1px solid #ccc' }} />
                        <Typography variant='caption'>{currentStatus?.cor || '#808080'}</Typography>
                    </Box>
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

export default StatusFormModal;