// src/components/Organizacao/SuperAdminCrudModal.tsx
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, TextField, FormControl, InputLabel, Select, MenuItem, Button, Alert, CircularProgress, SelectChangeEvent } from '@mui/material';
import { NewUserForm } from '@/types/organization-types'; // Assuma que este tipo foi movido

interface SuperAdminCrudModalProps {
    open: boolean;
    onClose: () => void;
    fetchData: () => Promise<void>;
}

export const SuperAdminCrudModal: React.FC<SuperAdminCrudModalProps> = ({ open, onClose, fetchData }) => {
    
    const [newUser, setNewUser] = useState<NewUserForm>({ name: '', email: '', password: '', role: 'free_user' });
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [modalError, setModalError] = useState<string | null>(null);

    const handleCloseModal = () => {
        setNewUser({ name: '', email: '', password: '', role: 'free_user' });
        setModalError(null);
        setIsSaving(false);
        onClose();
    };
    
    const handleSave = async () => {
        if (!newUser.email || !newUser.password || !newUser.role) {
            setModalError('Email, Senha e Papel são obrigatórios.');
            return;
        }
        setIsSaving(true);
        setModalError(null);
        try {
            // Rota POST para Super Admin (Originalmente /api/admin/users)
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
            fetchData(); // Atualiza a lista principal
        } catch (err) {
            setModalError(err instanceof Error ? err.message : 'Erro ao criar usuário.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleModalChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setNewUser(prev => ({ ...prev, [name]: value }));
        if (modalError) setModalError(null);
    };
    
    const handleRoleChange = (event: SelectChangeEvent<NewUserForm['role']>) => {
        setNewUser(prev => ({ ...prev, role: event.target.value as NewUserForm['role'] }));
    };

    return (
        <Dialog open={open} onClose={handleCloseModal} fullWidth maxWidth="xs">
            <DialogTitle>Adicionar Novo Usuário (Admin)</DialogTitle>
            <DialogContent>
                {modalError && <Alert severity="error" sx={{ mb: 2 }}>{modalError}</Alert>}
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField label="Nome (Opcional)" name="name" value={newUser.name} onChange={handleModalChange} variant="outlined" fullWidth />
                    <TextField label="Email" name="email" type="email" value={newUser.email} onChange={handleModalChange} variant="outlined" fullWidth required error={!!modalError && !newUser.email} />
                    <TextField label="Senha" name="password" type="password" value={newUser.password} onChange={handleModalChange} variant="outlined" fullWidth required error={!!modalError && !newUser.password} />
                    <FormControl fullWidth required error={!!modalError && !newUser.role}>
                        <InputLabel>Papel (Role)</InputLabel>
                        <Select name="role" value={newUser.role} label="Papel (Role)" onChange={handleRoleChange}>
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
    );
};