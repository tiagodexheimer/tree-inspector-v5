// src/components/Organizacao/MemberList.tsx
import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, CircularProgress, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip, IconButton, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { OrganizationMember } from '@/types/organization-types'; // Assuma que este tipo foi movido

interface MemberListProps {
    membersList: OrganizationMember[];
    isLoading: boolean;
    sessionUserId: string;
    fetchData: () => Promise<void>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
}

export const MemberList: React.FC<MemberListProps> = ({ membersList, isLoading, sessionUserId, fetchData, setError }) => {
    
    // --- ESTADOS DO SEU DELETAR ORIGINAL ---
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState<boolean>(false);
    const [userToDelete, setUserToDelete] = useState<OrganizationMember | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const handleOpenDeleteConfirm = (user: OrganizationMember) => {
        setUserToDelete(user);
        setDeleteError(null);
        setOpenDeleteConfirm(true);
    };
    
    const handleCloseDeleteConfirm = () => {
        setOpenDeleteConfirm(false);
        setUserToDelete(null);
        setIsDeleting(false);
        setDeleteError(null);
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;
        
        if (sessionUserId === userToDelete.id) {
            setDeleteError("Você não pode remover a si mesmo.");
            setIsDeleting(false);
            return;
        }
        
        setIsDeleting(true);
        setDeleteError(null);
        try {
            // Rota DELETE para Super Admin (originalmente /api/admin/users/[id])
            const response = await fetch(`/api/admin/users/${userToDelete.id}`, { method: 'DELETE' }); 
            const result = await response.json().catch(() => ({}));
            
            if (!response.ok) {
                throw new Error(result.message || `Erro ${response.status}`);
            }
            handleCloseDeleteConfirm();
            setError("Membro removido com sucesso.");
            fetchData(); 
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Erro ao remover membro.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Typography variant="h5" gutterBottom sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupIcon /> Membros Ativos ({membersList.length})
            </Typography>
            
            {isLoading && membersList.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
            ) : (
                <TableContainer component={Paper} elevation={1}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Nome / Email</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Papel</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {membersList.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="bold">{member.name || '(Sem nome)'}</Typography>
                                        <Typography variant="caption" color="textSecondary">{member.email}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={member.role.toUpperCase()} 
                                            size="small" 
                                            color={member.role === 'owner' ? 'secondary' : 'default'} 
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton color="primary" title="Editar Papel" disabled={member.role === 'owner' || member.id === sessionUserId}>
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton 
                                            onClick={() => handleOpenDeleteConfirm(member)} 
                                            color="error" 
                                            title="Remover Membro"
                                            disabled={member.role === 'owner' || member.id === sessionUserId} 
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

            {/* Modal Confirmar Delete (Mantido) */}
            <Dialog open={openDeleteConfirm} onClose={handleCloseDeleteConfirm}>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <Typography> Tem certeza que deseja remover o membro &quot;{userToDelete?.email}&quot; da organização? </Typography>
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
        </>
    );
};