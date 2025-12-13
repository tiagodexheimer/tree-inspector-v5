'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Container, Typography, Box, Alert, CircularProgress, Divider, Paper 
} from '@mui/material';

// Componentes da UI
import { OrgNameEditor } from '@/components/Organizacao/OrgNameEditor';
import { InviteManagement } from '@/components/Organizacao/InviteManagement'; 
import { OrganizationMembersList } from '@/components/Organizacao/OrganizationMembersList'; 

// Tipos
import { OrganizationRole, ActiveInvite, OrganizationMember } from '@/types/auth-types'; 

export default function GerenciarOrganizacaoPage() {
  const { data: session, status, update } = useSession();
  
  // Inicializa como arrays vazios para evitar erros de .map undefined
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invites, setInvites] = useState<ActiveInvite[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Extração de Dados da Sessão
  const sessionOrgRole: OrganizationRole = (session?.user as any)?.organizationRole || 'viewer';
  const userPlanType = (session?.user as any)?.planType || 'free';
  const userRole = session?.user?.role || 'free'; 
  
  const organizationId = session?.user?.organizationId;
  const organizationName = (session?.user as any)?.organizationName || 'Minha Organização';

  const canManageOrgDetails = sessionOrgRole === 'owner' || sessionOrgRole === 'admin';

  // 2. Busca de Dados
  const fetchManagementData = useCallback(async () => {
    if (!organizationId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // A) Buscar Membros
      const membersRes = await fetch('/api/gerenciar/organizacao/membros');
      if (!membersRes.ok) {
          // Se falhar silenciosamente, apenas loga, mas não quebra a tela toda se possível
          console.error("Falha ao carregar membros");
      } else {
          const membersData = await membersRes.json();
          if (Array.isArray(membersData)) setMembers(membersData);
      }

      // B) Buscar Convites (Apenas se tiver permissão)
      if (canManageOrgDetails) {
        const invitesRes = await fetch('/api/gerenciar/convites');
        if (invitesRes.ok) {
           const invitesData = await invitesRes.json();
           
           // [CORREÇÃO DE SEGURANÇA] Verifica se é array
           if (Array.isArray(invitesData)) {
               setInvites(invitesData);
           } else {
               console.warn("Formato inválido de convites:", invitesData);
               setInvites([]); 
           }
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados:", err);
      setError(err.message || "Erro ao carregar detalhes.");
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, canManageOrgDetails]);

  useEffect(() => {
    if (status === 'authenticated' && organizationId) {
      fetchManagementData();
    } else if (status === 'authenticated' && !organizationId) {
      setIsLoading(false); 
    }
  }, [status, organizationId, fetchManagementData]);


  // 3. Handlers
  const handleUpdateOrgName = async (newName: string) => {
    try {
      const res = await fetch('/api/gerenciar/organizacao', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      if (!res.ok) throw new Error("Falha ao atualizar nome.");
      await update({ organizationName: newName });
      
    } catch (err: any) {
      throw new Error(err.message);
    }
  };
  
  const handleLeaveSuccess = async () => {
      setMembers([]);
      setInvites([]);
  };

  // 4. Renderização
  if (status === 'loading' || (isLoading && !members.length && !error)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!organizationId) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">
          Você não pertence a nenhuma organização.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Gerenciar Organização
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Administre os membros e configurações da <strong>{organizationName}</strong>.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <OrgNameEditor 
        initialName={organizationName}
        orgId={organizationId}
        userRole={userRole}           
        orgRole={sessionOrgRole}      
        canEdit={canManageOrgDetails} 
        onOrgUpdate={handleUpdateOrgName}
        onLeaveSuccess={handleLeaveSuccess}
      />

      {/* Gestão de Convites */}
      {canManageOrgDetails ? (
        <InviteManagement 
          organizationId={organizationId}
          invitesList={invites}
          userPlanType={userPlanType}
          userRole={userRole} 
          fetchData={fetchManagementData} 
          setError={(msg) => setError(msg)}
        />
      ) : (
        <Paper sx={{ p: 3, mb: 4, bgcolor: '#f5f5f5' }}>
            <Typography variant="body2" color="text.secondary" align="center">
                Somente Administradores ou o Dono da organização podem gerenciar convites.
            </Typography>
        </Paper>
      )}

      <Divider sx={{ my: 4 }} />

      {/* Lista de Membros */}
      <OrganizationMembersList 
        members={members}
        currentUserId={session?.user?.id}
        currentUserOrgRole={sessionOrgRole}
        onMemberUpdate={fetchManagementData} 
      />

    </Container>
  );
}