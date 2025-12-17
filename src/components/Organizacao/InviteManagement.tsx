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
    organizationId?: number | string | null; // Tornado opcional para evitar erros de tipo
    invitesList: ActiveInvite[];
    userPlanType: string;
    userRole: string; // role do sistema (free, basic...)
    fetchData: () => Promise<void>;
    setError: (msg: string) => void;
}

export const InviteManagement: React.FC<InviteManagementProps> = ({
    organizationId,
    invitesList = [], // Valor padrão para evitar crash
    userPlanType,
    userRole,
    fetchData,
    setError
}) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [revokeLoading, setRevokeLoading] = useState<number | null>(null);

    // [DEBUG] Verifica se os convites estão chegando
    useEffect(() => {
        console.log("InviteManagement recebeu invitesList:", invitesList);
    }, [invitesList]);

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
                body: JSON.stringify({ email, role: 'member' }) // Padrão 'member'
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Erro ao enviar convite');
            }

            setEmail(''); // Limpa o campo
            await fetchData(); // Recarrega a lista chamando a função do pai
            alert("Convite enviado com sucesso!"); // Feedback simples

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

            await fetchData(); // Recarrega a lista
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
                            disabled={loading}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Button
                            variant="contained"
                            fullWidth
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                            onClick={handleInvite}
                            disabled={loading || !email}
                        >
                            {loading ? 'Enviando...' : 'Enviar Convite'}
                        </Button>
                    </Grid>
                </Grid>
            </Box>

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