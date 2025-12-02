// src/app/api/rotas/[id]/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { rotasService } from "@/services/rotas-service";
import { DemandasRepository } from '@/repositories/demandas-repository';

type ExpectedContext = {
    params: Promise<{ id: string }>;
};

// PATCH: Inicia a rota (App Android) e muda o status das demandas para "Em Rota"
export async function PATCH(request: NextRequest, context: ExpectedContext) {
    // Apenas requer autenticação, não precisa ser admin
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
        
        // 1. Busca as demandas da rota
        const rotaDetails = await rotasService.getRotaDetails(rotaId);
        if (!rotaDetails || !rotaDetails.rota) {
             return NextResponse.json({ message: "Rota não encontrada." }, { status: 404 });
        }
        
        const demandaIds = rotaDetails.demandas.map(d => d.id).filter((id): id is number => typeof id === 'number');

        if (demandaIds.length === 0) {
             return NextResponse.json({ message: "Rota sem demandas para iniciar." }, { status: 400 });
        }
        
        // 2. [AUTOMAÇÃO DE FLUXO] Atualiza o status das demandas para "Em Rota"
        await DemandasRepository.updateStatusByName(demandaIds, "Em Rota");

        // 3. Opcional: Atualiza o status da ROTA para "Em Andamento"
        await rotasService.updateRota(rotaId, { status: "Em Andamento" });


        return NextResponse.json({
            message: `Rota ${rotaId} iniciada. Status das demandas atualizado para "Em Rota".`
        }, { status: 200 });

    } catch (error) {
        console.error(`[API /rotas/[id]/start] Erro:`, error);
        return NextResponse.json({ message: "Erro ao iniciar rota e atualizar status." }, { status: 500 });
    }
}