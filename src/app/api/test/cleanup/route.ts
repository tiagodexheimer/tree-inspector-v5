// src/app/api/test/cleanup/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth"; 
import { CleanupService } from "@/services/cleanup-service"; // Novo serviço para a lógica de exclusão

/**
 * Endpoint de Limpeza de Dados para Testes (POST /api/test/cleanup)
 * Exclui todas as demandas e rotas do tenant logado.
 */
export async function POST(request: Request) {
    // 1. Obter a sessão do usuário e o ID da organização
    const session = await auth();
    
    // Verifica autenticação e se o orgId é numérico
    if (!session || !session.user || typeof session.user.orgId !== 'number') {
        return NextResponse.json({ message: "Não autenticado ou sessão inválida." }, { status: 401 });
    }

    const organizationId = session.user.orgId;
    
    try {
        // 2. Chamar o serviço que executa a exclusão segura no DB
        const result = await CleanupService.runCleanup(organizationId);
        
        // 3. Sucesso na Limpeza
        console.log(`Cleanup OK para Org ID ${organizationId}:`, result);
        return NextResponse.json({ 
            message: "Limpeza de dados para testes concluída.",
            ...result
        }, { status: 200 });

    } catch (error) {
        // ✅ FIX: Garante que o corpo da resposta seja SEMPRE JSON e inclui detalhes
        console.error("[API Cleanup] Erro interno durante a limpeza:", error);

        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido durante a operação de exclusão.";
        
        // Use a exceção para retornar uma mensagem mais útil
        return NextResponse.json({ 
            message: "Falha na limpeza de dados do banco.",
            details: errorMessage 
        }, { status: 500 }); // Sempre retorna 500 com JSON válido
    }
}