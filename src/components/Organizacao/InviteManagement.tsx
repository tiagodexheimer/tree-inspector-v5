// src/components/Organizacao/InviteManagement.tsx
import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, TextField, Button, Grid,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Tooltip, CircularProgress, Chip, Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import { ActiveInvite, OrganizationRole } from '@/types/auth-types';

interface InviteManagementProps {
    organizationId?: number | string | null;
    invitesList: ActiveInvite[];
    userPlanType: string;
    userRole: string;
    fetchData: () => Promise<void>;
    setError: (msg: string) => void;
    membersCount: number;
}

export const InviteManagement: React.FC<InviteManagementProps> = ({
    organizationId,
    invitesList = [],
    userPlanType,
    userRole,
    fetchData,
    setError,
    membersCount
}) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [revokeLoading, setRevokeLoading] = useState<number | null>(null);

    // Lógica de Limites
    const isFree = userRole === 'free' || userRole === 'free_user';
    const isBasic = userRole === 'basic';

    // Limite Basic: 5 usuários no total (membros + convites pendentes)
    const totalUsage = membersCount + invitesList.length;
    const basicLimit = 5;
    const isBasicLimitReached = isBasic && totalUsage >= basicLimit;

    const handleInvite = async () => {
        if (!email.includes('@')) {
            setError('Digite um e-mail válido.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/gerenciar/convites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role: 'member' })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Erro ao enviar convite');
            }

            setEmail('');
            await fetchData();
            alert("Convite enviado com sucesso!");

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (inviteId: number) => {
        if (!confirm("Deseja cancelar este convite?")) return;

        setRevokeLoading(inviteId);
        try {
            const res = await fetch(`/api/gerenciar/convites?id=${inviteId}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error("Falha ao revogar convite");

            await fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setRevokeLoading(null);
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon color="action" /> Convidar Membros
            </Typography>

            {/* SEÇÃO FREE: BLOQUEIO TOTAL */}
            {isFree && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Seu plano <strong>Free</strong> não permite convidar novos membros.
                    <Button color="inherit" size="small" sx={{ ml: 1, textDecoration: 'underline' }}>
                        Faça Upgrade
                    </Button>
                </Alert>
            )}

            {/* SEÇÃO BASIC: LIMITE */}
            {isBasic && (
                <Box sx={{ mb: 2 }}>
                    <Alert severity={isBasicLimitReached ? "error" : "info"}>
                        Plano Basic: {totalUsage} / {basicLimit} usuários utilizados (Membros + Convites).
                        {isBasicLimitReached && <strong> Limite atingido.</strong>}
                    </Alert>
                </Box>
            )}

            {/* FORMULÁRIO (Exibido apenas se não for Free) */}
            {!isFree && (
                <Box sx={{ mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, sm: 8 }}>
                            <TextField
                                fullWidth
                                label="E-mail do novo membro"
                                variant="outlined"
                                size="small"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading || isBasicLimitReached} // Bloqueia se atingiu limite
                                placeholder={isBasicLimitReached ? "Limite de usuários atingido" : "exemplo@email.com"}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Button
                                variant="contained"
                                fullWidth
                                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                                onClick={handleInvite}
                                disabled={loading || !email || isBasicLimitReached} // Bloqueia botão
                                color={isBasicLimitReached ? 'error' : 'primary'}
                            >
                                {loading ? 'Enviando...' : (isBasicLimitReached ? 'Limite Atingido' : 'Enviar Convite')}
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            )}

            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                Convites Pendentes ({invitesList.length})
            </Typography>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f9f9f9' }}>
                            <TableCell><strong>E-mail</strong></TableCell>
                            <TableCell><strong>Função</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell align="right"><strong>Ações</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {invitesList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                    Nenhum convite pendente.
                                </TableCell>
                            </TableRow>
                        ) : (
                            invitesList.map((invite) => (
                                <TableRow key={invite.id}>
                                    <TableCell>{invite.email}</TableCell>
                                    <TableCell>
                                        <Chip label={invite.role} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" color="warning.main">
                                            Aguardando aceite
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Cancelar convite">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleRevoke(invite.id)}
                                                disabled={revokeLoading === invite.id}
                                            >
                                                {revokeLoading === invite.id ?
                                                    <CircularProgress size={16} /> :
                                                    <DeleteIcon fontSize="small" />
                                                }
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};