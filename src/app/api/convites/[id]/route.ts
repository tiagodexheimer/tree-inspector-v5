// src/app/api/convite/[id]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { auth } from "@/auth";
import { inviteService } from '@/services/invite-service';

type Params = { id: string };

/**
 * POST: Executa a ação de aceitar o convite e adicionar o usuário à organização.
 */
export async function POST(request: NextRequest, { params }: { params: Params }) {
    const session = await auth();
    
    // [WORKAROUND] Lendo o valor do token da URL de forma segura
    const pathSegments = request.nextUrl.pathname.split('/');
    const inviteIdFromPath = pathSegments[pathSegments.length - 1]; 
    
    // Tenta usar params.id, senão usa o valor lido do path
    const token = params.id && params.id !== '[id]' ? params.id : inviteIdFromPath;


    // 1. Verifica se o usuário está logado
    if (!session || !session.user) {
        return NextResponse.json({ message: "É necessário estar logado para aceitar." }, { status: 401 });
    }
    
    const acceptingUserId = session.user.id;

    try {
        if (!token || token === 'convite' || token === 'api') { // Validação extra contra strings inválidas
            return NextResponse.json({ message: "Token de convite ausente." }, { status: 400 });
        }
        
        // O Service executa a transação no DB
        const newOrgId = await inviteService.acceptInvite(token, acceptingUserId);

        // 2. Resposta de sucesso
        return NextResponse.json({ 
            message: "Convite aceito com sucesso.", 
            organizationId: newOrgId 
        }, { status: 200 });
        
    } catch (error) {
        console.error("[API POST Invite Accept]", error);
        
        // Log detalhado para o servidor:
        if (error instanceof Error) {
             console.error(`[ACEITE ERROR] User: ${acceptingUserId}, Token: ${token}, Message: ${error.message}`);
        }
        
        let message = error instanceof Error ? error.message : 'Erro interno ao aceitar convite.';
        let status = 400; // Erro de negócio (convite inválido, email diferente, etc.)
        
        return NextResponse.json({ message }, { status });
    }
}