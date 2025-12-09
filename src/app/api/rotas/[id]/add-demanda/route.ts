// src/app/api/rotas/[id]/add-demanda/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { rotasService } from "@/services/rotas-service";

type ExpectedContext = {
    params: Promise<{ id: string }>;
};

// POST para adicionar uma lista de demandas a uma rota
export async function POST(request: NextRequest, context: ExpectedContext) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const user = session.user as any;
    
    // Extrai organizationId (necessário para o serviço) e planType (necessário para validação)
    const organizationId = Number(user.organizationId);
    const planType = user.planType; 

    if (isNaN(organizationId) || organizationId <= 0 || !planType) {
        return NextResponse.json({ message: "Dados de organização/plano ausentes na sessão." }, { status: 403 });
    }

    try {
        const params = await context.params;
        const rotaId = parseInt(params.id, 10);

        if (isNaN(rotaId)) {
            return NextResponse.json({ message: 'ID da rota inválido.' }, { status: 400 });
        }

        const body = await request.json();
        const { demandaIds } = body; 

        if (!demandaIds || !Array.isArray(demandaIds) || demandaIds.length === 0) {
             return NextResponse.json({ message: 'Lista de IDs de demanda inválida.' }, { status: 400 });
        }

        // ✅ CORREÇÃO: Chama o serviço com APENAS 3 ARGUMENTOS, conforme o erro indica
        const updatedDemandas = await rotasService.addDemandasToRota(
            rotaId, 
            organizationId, 
            demandaIds 
            // O planType foi removido daqui
        );

        return NextResponse.json({
            message: `${demandaIds.length} demanda(s) adicionada(s) com sucesso!`,
            demandas: updatedDemandas 
        }, { status: 200 });

    } catch (error) {
        console.error(`[API /rotas/[id]/add-demanda] Erro:`, error);
        
        const message = error instanceof Error ? error.message : 'Erro desconhecido.';
        const status = message.includes("não encontrada") ? 404 : (message.includes("já está em outra rota") ? 409 : 500);
        
        return NextResponse.json({ message, error: message }, { status });
    }
}