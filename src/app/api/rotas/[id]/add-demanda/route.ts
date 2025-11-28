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

    try {
        const params = await context.params;
        const rotaId = parseInt(params.id, 10);

        if (isNaN(rotaId)) {
            return NextResponse.json({ message: 'ID da rota inválido.' }, { status: 400 });
        }

        const body = await request.json();
        const { demandaIds } = body; // Espera { demandaIds: [1, 5, 8] }

        if (!demandaIds || !Array.isArray(demandaIds) || demandaIds.length === 0) {
             return NextResponse.json({ message: 'Lista de IDs de demanda inválida.' }, { status: 400 });
        }

        // Chama o serviço para adicionar
        const updatedDemandas = await rotasService.addDemandasToRota(rotaId, demandaIds);

        return NextResponse.json({
            message: `${demandaIds.length} demanda(s) adicionada(s) com sucesso!`,
            demandas: updatedDemandas // Retorna a nova lista completa (opcional, mas útil)
        }, { status: 200 });

    } catch (error) {
        console.error(`[API /rotas/[id]/add-demanda] Erro:`, error);
        
        const message = error instanceof Error ? error.message : 'Erro desconhecido.';
        const status = message.includes("não encontrada") ? 404 : (message.includes("já está em outra rota") ? 409 : 500);
        
        return NextResponse.json({ message, error: message }, { status });
    }
}