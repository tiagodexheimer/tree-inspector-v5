// src/components/Organizacao/OrganizationMembersList.tsx

import React, { useState } from 'react';
import { 
    Paper, Typography, List, ListItem, ListItemAvatar, Avatar, 
    ListItemText, Chip, IconButton, Tooltip, Divider, Box, 
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, CircularProgress
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import SecurityIcon from '@mui/icons-material/Security';
import { OrganizationMember, OrganizationRole } from '@/types/auth-types';

interface OrganizationMembersListProps {
    members: OrganizationMember[];
    currentUserId?: string;
    currentUserOrgRole: OrganizationRole;
    onMemberUpdate: () => void;
}

export const OrganizationMembersList: React.FC<OrganizationMembersListProps> = ({ 
    members, 
    currentUserId, 
    currentUserOrgRole,
    onMemberUpdate
}) => {
    const [removeLoading, setRemoveLoading] = useState<string | null>(null); // ID do usuário sendo removido
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null);

    // Verifica permissão para remover outros membros
    const canManageMembers = currentUserOrgRole === 'owner' || currentUserOrgRole === 'admin';

    // Helper para ícone e cor da role
    const getRoleChip = (role: OrganizationRole) => {
        switch (role) {
            case 'owner':
                return <Chip icon={<StarIcon />} label="Dono" color="warning" size="small" />;
            case 'admin':
                return <Chip icon={<SecurityIcon />} label="Admin" color="primary" size="small" />;
            case 'member':
                return <Chip label="Membro" size="small" />;
            case 'viewer':
                return <Chip label="Visualizador" size="small" variant="outlined" />;
            default:
                return <Chip label={role} size="small" />;
        }
    };

    const handleRemoveClick = (member: OrganizationMember) => {
        setMemberToRemove(member);
        setConfirmDialogOpen(true);
    };

    const confirmRemoveMember = async () => {
        if (!memberToRemove) return;

        setRemoveLoading(memberToRemove.id);
        setConfirmDialogOpen(false);

        try {
            const response = await fetch(`/api/gerenciar/organizacao/membros?userId=${memberToRemove.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Erro ao remover membro.");
            }

            // Sucesso
            onMemberUpdate();
        } catch (error) {
            console.error("Erro ao remover membro:", error);
            alert("Não foi possível remover o membro. Tente novamente.");
        } finally {
            setRemoveLoading(null);
            setMemberToRemove(null);
        }
    };

    return (
        <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                    Membros da Organização
                </Typography>
                <Chip label={`${members.length} Membro(s)`} variant="outlined" />
            </Box>
            
            <Divider />

            <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                {members.map((member) => {
                    const isCurrentUser = member.id === currentUserId;
                    const isOwner = member.organizationRole === 'owner';
                    
                    // Lógica de quem pode remover quem:
                    // 1. Você não pode remover a si mesmo aqui (use o botão sair)
                    // 2. Apenas Admins/Owners podem remover
                    // 3. Ninguém pode remover o Owner
                    const canRemoveThisUser = canManageMembers && !isCurrentUser && !isOwner;

                    return (
                        <React.Fragment key={member.id}>
                            <ListItem
                                alignItems="flex-start"
                                secondaryAction={
                                    canRemoveThisUser && (
                                        <Tooltip title="Remover da organização">
                                            <IconButton 
                                                edge="end" 
                                                aria-label="delete" 
                                                onClick={() => handleRemoveClick(member)}
                                                disabled={!!removeLoading}
                                            >
                                                {removeLoading === member.id ? <CircularProgress size={24} /> : <DeleteIcon />}
                                            </IconButton>
                                        </Tooltip>
                                    )
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar>
                                        <PersonIcon />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="subtitle1" component="span" fontWeight="medium">
                                                {member.name || "Sem Nome"}
                                            </Typography>
                                            {isCurrentUser && <Chip label="Você" size="small" color="default" variant="outlined" sx={{ height: 20 }} />}
                                            {getRoleChip(member.organizationRole)}
                                        </Box>
                                    }
                                    secondary={
                                        <React.Fragment>
                                            <Typography component="span" variant="body2" color="text.primary">
                                                {member.email}
                                            </Typography>
                                            <br />
                                            <Typography component="span" variant="caption" color="text.secondary">
                                                Plano Individual: {member.role?.toUpperCase() || 'FREE'}
                                            </Typography>
                                        </React.Fragment>
                                    }
                                />
                            </ListItem>
                            <Divider variant="inset" component="li" />
                        </React.Fragment>
                    );
                })}
                
                {members.length === 0 && (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography color="text.secondary">Nenhum membro encontrado.</Typography>
                    </Box>
                )}
            </List>

            {/* Dialog de Confirmação */}
            <Dialog
                open={confirmDialogOpen}
                onClose={() => setConfirmDialogOpen(false)}
            >
                <DialogTitle>Remover Membro</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Tem certeza que deseja remover <strong>{memberToRemove?.name}</strong> ({memberToRemove?.email}) da organização? 
                        Essa ação revogará o acesso dele imediatamente.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialogOpen(false)} color="primary">
                        Cancelar
                    </Button>
                    <Button onClick={confirmRemoveMember} color="error" variant="contained" autoFocus>
                        Remover
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};