// src/app/api/convites/pendentes/route.ts
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
// [Importante] Este repositório precisa ter o método findPendingByEmail
import { InviteRepository } from "@/repositories/invite-repository"; 

/**
 * GET: Lista convites pendentes que foram enviados para o email do usuário logado.
 * Esta rota é acessada pelo Dashboard (DashboardPage).
 */
export async function GET() { 
    const session = await auth();

    // 1. CHECAGEM DE AUTENTICAÇÃO
    if (!session || !session.user || !session.user.email) {
        console.error("[API Convites Pendentes] Tentativa de acesso sem autenticação (401).");
        return NextResponse.json({ message: "Usuário não autenticado ou email ausente na sessão." }, { status: 401 });
    }
    
    const userEmail = session.user.email.toLowerCase();
    
    // Logging para confirmar o email da sessão
    console.log(`[API Convites Pendentes DEBUG] Buscando convites para o email: ${userEmail}`);

    // 2. BUSCA NO REPOSITÓRIO (Tratamento de Exceção)
    try {
        // Assume-se que o repositório faz o JOIN com organizations
        const invites = await InviteRepository.findPendingByEmail(userEmail);
        
        // Logging do resultado da busca
        console.log(`[API Convites Pendentes DEBUG] ${invites.length} convites encontrados no DB.`);

        // Retorna a lista de convites
        return NextResponse.json({ convites: invites || [] }, { status: 200 });

    } catch (error) {
        // 3. LOG DE ERRO INTERNO (500)
        console.error("[API GET Convites Pendentes] Erro Crítico no Repositório/DB:", error);
        
        let errorMessage = "Erro interno ao buscar convites pendentes. Verifique os logs do servidor.";
        if (error instanceof Error) {
             errorMessage = `Erro no Serviço: ${error.message}.`;
        }
        
        // Retorna 500 com a mensagem de erro para o frontend
        return NextResponse.json({ message: errorMessage }, { status: 500 });
    }
}