// src/components/Organizacao/OrgNameEditor.tsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Paper, Grid, TextField, Button, Alert, 
    Collapse, CircularProgress 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useSession } from 'next-auth/react';
import { OrganizationRole } from '@/types/organization-types'; // Importando o tipo

interface OrgNameEditorProps {
    initialName: string;
    orgId: string | number;
    userRole: string; // Role do sistema (admin/free/paid)
    orgRole: OrganizationRole; // Role na organização (owner/admin/member/viewer)
    canEdit: boolean; // Permissão para editar o nome (baseada em orgRole)
    onOrgUpdate: (newName: string) => Promise<void>;
    onLeaveSuccess: () => Promise<void>;
}

export const OrgNameEditor: React.FC<OrgNameEditorProps> = ({ 
    initialName, 
    orgId, 
    userRole, 
    orgRole,
    canEdit,
    onOrgUpdate ,
    onLeaveSuccess
}) => {
    const [name, setName] = useState(initialName || 'Minha Organização');
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const { update } = useSession();

    useEffect(() => {
        // Garante que o estado interno do nome se sincronize quando o initialName carregar ou mudar
        if (initialName && name !== initialName) {
            setName(initialName);
        }
    }, [initialName]);

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
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Falha ao atualizar o nome.' });
            setName(initialName);
        } finally {
            setIsLoading(false);
            setIsEditing(false);
        }
    };
    
    // --- Handler para Sair da Organização ---
    const handleLeaveOrganization = async () => {
        if (!window.confirm("ATENÇÃO: Você tem certeza que deseja sair desta organização?")) return;
        
        setIsLeaving(true);
        setMessage(null);

        try {
            // Chamada para a rota de saída
            const response = await fetch('/api/gerenciar/organizacao/membros/sair', { method: 'POST' });
            const data = await response.json();

            if (response.ok) {
                // Atualiza a sessão para desvincular a organização e redefine o papel
                await update({ organizationId: null, organizationName: null, organizationRole: 'viewer', planType: 'FREE' }); 
                
                // 1. Atualiza os dados do pai (opcional, pois o redirect vai acontecer, mas é bom para consistência)
                onLeaveSuccess(); 

                // 2. Redireciona para o dashboard base (Obrigatório após update)
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
                
                {/* 1. Edição do Nome */}
                <Grid item xs={12} sm={8} md={7}>
                    <TextField
                        fullWidth
                        label="Nome da Organização"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        // Desabilita se não puder editar ou se estiver processando
                        disabled={!isEditing || isLoading || isLeaving || !canEdit} 
                        // readonly se não estiver em edição
                        InputProps={{ readOnly: !isEditing || !canEdit }}
                        helperText={!canEdit && "Apenas o Administrador ou Dono pode editar o nome."}
                    />
                </Grid>
                
                {/* 2. Botões de Edição */}
                <Grid item xs={12} sm={4} md={3}>
                    {canEdit && (
                        isEditing ? (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                    onClick={handleSubmit}
                                    disabled={isLoading || name.trim().length < 3 || name.trim() === initialName.trim()}
                                    fullWidth
                                >
                                    {isLoading ? 'Salvando...' : 'Salvar'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={() => { setName(initialName); setIsEditing(false); }}
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
                    {/* O Super Admin (role='admin') não é um membro normal e não deve sair. 
                       O owner real só deve sair se houver outro membro (checado no backend). */}
                    {userRole !== 'admin' && (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={isLeaving ? <CircularProgress size={20} color="inherit" /> : <ExitToAppIcon />}
                            onClick={handleLeaveOrganization}
                            disabled={isLeaving || isEditing}
                            fullWidth
                            title="Desvincula sua conta desta organização"
                        >
                            {isLeaving ? 'Saindo...' : 'Sair'}
                        </Button>
                    )}
                </Grid>
            </Grid>
        </Paper>
    );
};