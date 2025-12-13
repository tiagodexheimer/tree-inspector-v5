// src/components/Organizacao/InviteManagement.tsx
import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, TextField, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Button, CircularProgress, Alert, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip, IconButton } from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import { ActiveInvite, OrganizationRole, OrganizationRoleOptions, INVITE_LIMITS_FRONTEND, UserRole } from '@/types/organization-types'; // Assuma que estas constantes e tipos foram movidos para um arquivo de tipos

interface InviteManagementProps {
    invitesList: ActiveInvite[];
    userPlanType: string;
    userRole: string;
    fetchData: () => Promise<void>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export const InviteManagement: React.FC<InviteManagementProps> = ({ invitesList, userPlanType, userRole, fetchData, setError }) => {
    
    const [newInviteEmail, setNewInviteEmail] = useState('');
    const [newInviteRole, setNewInviteRole] = useState<OrganizationRole>('member');
    const [isSendingInvite, setIsSendingInvite] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);

    // Lógica de Limite de Convites
    const rawLimit = INVITE_LIMITS_FRONTEND[userRole as UserRole] || 0; // Role do sistema (admin/free/paid/pro)
    const invitesRemaining = typeof rawLimit === 'number' ? rawLimit - invitesList.length : 'Ilimitado';
    const canCreateInvite = rawLimit === Infinity || (typeof rawLimit === 'number' && rawLimit > 0);
    const isLimitReached = typeof rawLimit === 'number' && invitesList.length >= rawLimit;
    
    // Handler para Criar Convite
    const handleCreateInvite = async () => {
        if (isLimitReached || !canCreateInvite) {
            setInviteError('Limite de convites atingido ou seu plano não permite.');
            return;
        }
        if (!newInviteEmail) {
            setInviteError('O email do convidado é obrigatório.');
            return;
        }

        setIsSendingInvite(true);
        setInviteError(null);

        try {
            const response = await fetch('/api/gerenciar/convites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newInviteEmail, role: newInviteRole }),
            });

            const data = await response.json();

            if (response.ok) {
                const link = data.acceptanceLink; 
                setError(`Convite enviado para ${newInviteEmail} com sucesso!\nLink de Aceite (APENAS PARA TESTES): ${link}`); 
                setNewInviteEmail('');
                fetchData(); 
            } else {
                throw new Error(data.message || 'Erro desconhecido ao enviar convite.');
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Erro ao processar o convite.';
            setInviteError(errorMsg);
        } finally {
            setIsSendingInvite(false);
        }
    };

    // Handler para Cancelar Convite
    const handleCancelInvite = async (inviteId: number) => {
        const confirm = window.confirm("Tem certeza que deseja cancelar este convite?");
        if (!confirm) return;
        
        try {
            const response = await fetch(`/api/gerenciar/convites/${inviteId}`, { method: 'DELETE' });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Falha ao cancelar o convite.");
            }
            setError("Convite cancelado com sucesso.");
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao cancelar convite.');
        }
    };

    return (
        <Grid container spacing={4} sx={{ mt: 2 }}>
            {/* 1. Formulário de Envio */}
            <Grid item xs={12} md={12}>
                <Paper elevation={3} sx={{ p: 4, borderLeft: '6px solid #4caf50' }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#4caf50' }}>
                        <MailOutlineIcon /> Enviar Novo Convite
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Seu plano **{userPlanType}** permite **{invitesRemaining}** convite(s) ativo(s) restante(s).
                    </Typography>

                    <Grid container spacing={2} alignItems="center" sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Email do Convidado"
                                fullWidth size="small" type="email"
                                value={newInviteEmail}
                                onChange={(e) => setNewInviteEmail(e.target.value)}
                                disabled={!canCreateInvite || isLimitReached || isSendingInvite}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Papel</InputLabel>
                                <Select
                                    value={newInviteRole}
                                    label="Papel"
                                    onChange={(e: SelectChangeEvent) => setNewInviteRole(e.target.value as OrganizationRole)}
                                    disabled={!canCreateInvite || isLimitReached || isSendingInvite}
                                >
                                    {OrganizationRoleOptions.filter(opt => opt.value !== 'owner').map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            {option.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={5}>
                            <Button
                                variant="contained" color="success"
                                onClick={handleCreateInvite}
                                startIcon={isSendingInvite ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                                disabled={!newInviteEmail || isLimitReached || isSendingInvite || !canCreateInvite}
                                fullWidth size="medium"
                            >
                                {isSendingInvite ? 'Enviando...' : 'Enviar Convite'}
                            </Button>
                        </Grid>
                    </Grid>

                    {inviteError && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setInviteError(null)}>{inviteError}</Alert>}
                    {!canCreateInvite && userRole === 'free' && (
                        <Alert severity="warning" sx={{ mt: 2 }}>Seu plano Free não permite convidar membros. Faça upgrade para Basic ou superior.</Alert>
                    )}
                </Paper>
            </Grid>

            {/* 2. Lista de Convites Pendentes */}
            <Grid item xs={12} md={12}>
                <Typography variant="h5" gutterBottom sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MailOutlineIcon /> Convites Pendentes ({invitesList.length})
                </Typography>
                <TableContainer component={Paper} elevation={1}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Papel Convidado</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {invitesList.length === 0 ? (
                                <TableRow><TableCell colSpan={3} align="center">Nenhum convite ativo pendente.</TableCell></TableRow>
                            ) : (
                                invitesList.map((invite) => (
                                    <TableRow key={invite.id}>
                                        <TableCell>{invite.email}</TableCell>
                                        <TableCell>
                                            <Chip label={invite.role.toUpperCase()} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                            <IconButton 
                                                size="small" 
                                                color="error"
                                                onClick={() => handleCancelInvite(invite.id)}
                                                title="Cancelar Convite"
                                            >
                                                <DeleteIcon fontSize="inherit" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Grid>
        </Grid>
    );
};