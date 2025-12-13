// src/components/Organizacao/OrgNameEditor.tsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Paper, Grid, TextField, Button, Alert, 
    Collapse, CircularProgress 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useSession } from 'next-auth/react';
import { OrganizationRole } from '@/types/auth-types'; // Ou onde você definiu seus tipos

interface OrgNameEditorProps {
    initialName: string;
    orgId: string | number;
    userRole: string;          // Role do sistema (free, pro, admin)
    orgRole: OrganizationRole; // Role na organização (owner, admin, member)
    canEdit: boolean;          // Permissão calculada na página pai
    onOrgUpdate: (newName: string) => Promise<void>;
    onLeaveSuccess: () => void | Promise<void>; // Callback para atualizar a lista após sair
}

export const OrgNameEditor: React.FC<OrgNameEditorProps> = ({ 
    initialName, 
    orgId, 
    userRole, 
    orgRole,
    canEdit,
    onOrgUpdate,
    onLeaveSuccess
}) => {
    const [name, setName] = useState(initialName || 'Minha Organização');
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const { update } = useSession();

    // Verifica se é o dono para esconder o botão de sair
    const isOwner = orgRole === 'owner';

    useEffect(() => {
        if (initialName && name !== initialName && !isEditing) {
            setName(initialName);
        }
    }, [initialName, isEditing]);

    // --- Handler de Edição do Nome ---
    const handleSubmit = async () => {
        if (!isEditing || name.trim() === initialName.trim() || name.trim().length < 3) {
            setIsEditing(false);
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            await onOrgUpdate(name.trim());
            setMessage({ type: 'success', text: "Nome da organização atualizado com sucesso." });
            setIsEditing(false);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Falha ao atualizar o nome.' });
            setName(initialName); // Reverte ao nome original em caso de erro
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- Handler para Sair da Organização ---
    const handleLeaveOrganization = async () => {
        if (!window.confirm("ATENÇÃO: Você tem certeza que deseja sair desta organização?")) return;
        
        setIsLeaving(true);
        setMessage(null);

        try {
            const response = await fetch('/api/gerenciar/organizacao/membros/sair', { method: 'POST' });
            const data = await response.json();

            if (response.ok) {
                // 1. Atualiza a sessão local para remover os dados da organização
                await update({ 
                    organizationId: null, 
                    organizationName: null, 
                    organizationRole: null, 
                    planType: 'free' 
                }); 
                
                // 2. Chama o callback do pai (opcional, mas bom para limpar estados)
                if (onLeaveSuccess) await onLeaveSuccess();

                // 3. Redireciona para o dashboard
                window.location.href = '/dashboard'; 
            } else {
                setMessage({ type: 'error', text: data.message || 'Falha ao sair da organização.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Erro de rede ao processar sua saída.' });
        } finally {
            setIsLeaving(false);
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Detalhes da Organização
            </Typography>
            
            {/* Alertas de Feedback */}
            <Collapse in={!!message} sx={{ mb: 2 }}>
                {message && (
                    <Alert severity={message.type} onClose={() => setMessage(null)}>
                        {message.text}
                    </Alert>
                )}
            </Collapse>

            <Grid container spacing={2} alignItems="center">
                
                {/* 1. Campo de Nome */}
                <Grid item xs={12} sm={8} md={7}>
                    <TextField
                        fullWidth
                        label="Nome da Organização"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        // Habilitado apenas se: puder editar, estiver no modo edição e não estiver carregando
                        disabled={!isEditing || isLoading || isLeaving || !canEdit} 
                        InputProps={{ readOnly: !isEditing }}
                        helperText={!canEdit && "Apenas o Administrador ou Dono pode editar o nome."}
                    />
                </Grid>
                
                {/* 2. Botões de Ação (Editar/Salvar) */}
                <Grid item xs={12} sm={4} md={3}>
                    {canEdit && (
                        isEditing ? (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                    onClick={handleSubmit}
                                    disabled={isLoading || name.trim().length < 3}
                                    fullWidth
                                >
                                    {isLoading ? 'Salvar' : 'Salvar'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={() => { setName(initialName); setIsEditing(false); setMessage(null); }}
                                    disabled={isLoading}
                                >
                                    Cancelar
                                </Button>
                            </Box>
                        ) : (
                            <Button
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={() => { setMessage(null); setIsEditing(true); }}
                                disabled={isLoading || isLeaving}
                                fullWidth
                            >
                                Editar Nome
                            </Button>
                        )
                    )}
                </Grid>
                
                {/* 3. Botão Sair da Organização */}
                <Grid item xs={12} md={2}>
                    {/* LÓGICA DE EXIBIÇÃO:
                        1. O Super Admin (role='admin') não deve ver esse botão aqui.
                        2. O Dono (isOwner) não pode sair da própria organização (deve deletá-la ou transferir).
                    */}
                    {userRole !== 'admin' && !isOwner && (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={isLeaving ? <CircularProgress size={20} color="inherit" /> : <ExitToAppIcon />}
                            onClick={handleLeaveOrganization}
                            disabled={isLeaving || isEditing}
                            fullWidth
                            title="Sair desta organização"
                        >
                            {isLeaving ? 'Saindo...' : 'Sair'}
                        </Button>
                    )}
                    
                    {/* Feedback visual para o dono (opcional) */}
                    {isOwner && (
                         <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                            Você é o Dono
                         </Typography>
                    )}
                </Grid>
            </Grid>
        </Paper>
    );
};