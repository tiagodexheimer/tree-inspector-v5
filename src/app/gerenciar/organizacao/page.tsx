// src/app/gerenciar/organizacao/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, CircularProgress, Alert, Grid, Button,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock';
import { useSession } from 'next-auth/react';

// Importa os tipos e constantes do arquivo dedicado
import { OrganizationMember, ActiveInvite, OrganizationRole } from '@/types/organization-types';

// Importa os novos componentes
import { OrgNameEditor } from '@/components/Organizacao/OrgNameEditor';
import { PlanLimitsCard } from '@/components/Organizacao/PlanLimitsCard';
import { InviteManagement } from '@/components/Organizacao/InviteManagement';
import { MemberList } from '@/components/Organizacao/MemberList';
import { SuperAdminCrudModal } from '@/components/Organizacao/SuperAdminCrudModal';


export default function GerenciarOrganizacaoPage() {
    const { data: session, status, update } = useSession();

    // Extração de Dados da Sessão
    const sessionUserId = session?.user?.id || '';
    const sessionRole = session?.user?.role || 'free';
    const sessionOrgRole: OrganizationRole = (session?.user?.organizationRole as OrganizationRole) || 'viewer';
    const sessionPlanType = session?.user?.planType || sessionRole;

    const initialOrgName = session?.user?.organizationName || 'Organização Desconhecida';
    const organizationId = session?.user?.organizationId || 0;

    const userPlanType = sessionPlanType.toUpperCase();
    const isSuperAdminCreation = session?.user?.role === 'admin';

    // LÓGICA DE PERMISSÃO E PROPRIEDADE
    const isCurrentUserOwner = sessionOrgRole === 'owner';
    const canManageOrgDetails = isCurrentUserOwner || sessionOrgRole === 'admin';
    const isOrganizationAlheia = !isCurrentUserOwner;


    // --- ESTADOS DE ORQUESTRAÇÃO ---
    const [membersList, setMembersList] = useState<OrganizationMember[]>([]);
    const [invitesList, setInvitesList] = useState<ActiveInvite[]>([]);

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [openCrudModal, setOpenCrudModal] = useState(false);


    // --- Handlers de Organização/Edição (Centralizado aqui) ---
    const handleUpdateOrgName = useCallback(async (newName: string) => {
        const response = await fetch('/api/gerenciar/organizacao', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newName }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Falha ao atualizar o nome da organização.');
        }
        await update({ organizationName: data.organizationName });
    }, [update]);


    // --- Busca de Dados ---
    const fetchManagementData = useCallback(async () => {
        if (!session || !session.user.organizationId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            // 1. Buscar lista de Membros (ROTA CORRIGIDA)
            const membersRes = await fetch('/api/gerenciar/organizacao/membros');
            const membersData = await membersRes.json();

            if (membersRes.ok) {
                setMembersList(membersData.map((u: any) => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    // O backend deve retornar organization_role (ou orgRole)
                    role: (u.organization_role || 'member') as OrganizationMember['role'],
                })));
            } else {
                setError(`Falha ao listar membros: ${membersData.message || 'Erro de API.'}`);
            }

            // 2. Buscar Convites Ativos
            const invitesRes = await fetch('/api/gerenciar/convites');
            const invitesData = await invitesRes.json();
            if (invitesRes.ok) {
                setInvitesList(invitesData.invites || []);
            } else if (invitesRes.status !== 403) {
                console.error("Erro ao buscar convites:", invitesData.message);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar dados de gerenciamento.');
        } finally {
            setIsLoading(false);
        }
    }, [session]);

    useEffect(() => {
        if (status === 'authenticated' && session.user.organizationId) {
            fetchManagementData();
        } else if (status !== 'loading') {
            setIsLoading(false);
        }
    }, [status, session, fetchManagementData]);


    // --- RENDERIZAÇÃO (Segurança e Loading) ---
    if (status === 'loading') {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress /> <Typography sx={{ ml: 2 }}>Verificando autorização...</Typography>
            </Box>
        );
    }

    // Se não está autenticado ou não pertence a nenhuma organização (mesmo a 'free' inicial)
    if (status !== 'authenticated' || !session.user.organizationId) {
        return (
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <LockIcon color="error" sx={{ fontSize: 60 }} />
                <Typography variant="h5" color="error">Acesso Negado</Typography>
                <Typography>Você precisa estar logado em uma organização para gerenciar esta página.</Typography>
            </Box>
        );
    }

    // Exibição da Página
    return (
        <Box sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>

                {/* TÍTULO CONDICIONAL */}
                <Typography variant="h4" component="h1" gutterBottom>
                    <GroupIcon fontSize="inherit" sx={{ mr: 1 }} />
                    {isOrganizationAlheia ?
                        `Organização Convidada: ${initialOrgName}`
                        :
                        `Gerenciamento da Sua Organização`
                    }
                </Typography>

                {isSuperAdminCreation && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenCrudModal(true)}
                        sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}
                    >
                        Adicionar Usuário (Admin CRUD)
                    </Button>
                )}
            </Box>

            {/* Aviso de erro/sucesso principal */}
            {error && (
                <Alert
                    severity={error.includes('sucesso') ? 'success' : 'error'}
                    sx={{ mb: 2 }}
                    onClose={() => setError(null)}
                >
                    {error}
                </Alert>
            )}

            {/* ALERTA VISUAL DE ORGANIZAÇÃO ALHEIA */}
            {isOrganizationAlheia && (
                <Alert severity="info" sx={{ mb: 4, width: '100%' }}>
                    Você é um **{sessionOrgRole.toUpperCase()}** nesta organização de terceiros. Seu papel concede acesso limitado apenas a visualização de membros e rotas.
                </Alert>
            )}

            {/* --- 1. Edição do Nome e Saída --- */}
            <OrgNameEditor
                initialName={initialOrgName}
                orgId={organizationId}
                userRole={sessionRole}
                orgRole={sessionOrgRole}
                canEdit={canManageOrgDetails}
                onOrgUpdate={handleUpdateOrgName}
                onLeaveSuccess={fetchManagementData} // <-- Passando o handler de atualização
            />

            <Grid container spacing={4}>

                {/* 2. Limites e Plano Atual */}
                <Grid item xs={12} md={6} lg={4}>
                    <PlanLimitsCard planType={userPlanType} />
                </Grid>

                {/* 3. Gestão de Convites (Exibido apenas se puder gerenciar, ou seja, se for dono/admin e tiver plano) */}
                <Grid item xs={12} md={6} lg={8}>
                    {canManageOrgDetails && (
                        <InviteManagement
                            invitesList={invitesList}
                            userPlanType={userPlanType}
                            userRole={userRole}
                            fetchData={fetchManagementData}
                            setError={setError}
                        />
                    )}

                    {/* Placeholder para quem não tem permissão para gerenciar convites */}
                    {!canManageOrgDetails && (
                        <Alert severity="warning">Somente Administradores ou o Dono da organização podem gerenciar convites.</Alert>
                    )}
                </Grid>

                {/* 4. Listagem de Membros Ativos (Visível para todos, mas ações desabilitadas) */}
                <Grid item xs={12}>
                    <MemberList
                        membersList={membersList}
                        isLoading={isLoading}
                        sessionUserId={sessionUserId}
                        fetchData={fetchManagementData}
                        setError={setError}
                        // Passamos a role na organização para controlar as ações de edição/remoção de outros membros
                        sessionOrgRole={sessionOrgRole}
                    />
                </Grid>
            </Grid>

            {/* Modal Super Admin CRUD */}
            {isSuperAdminCreation && (
                <SuperAdminCrudModal
                    open={openCrudModal}
                    onClose={() => setOpenCrudModal(false)}
                    fetchData={fetchManagementData}
                />
            )}
        </Box>
    );
}