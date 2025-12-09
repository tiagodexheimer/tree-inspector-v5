import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { rotasService } from "@/services/rotas-service";

type ExpectedContext = {
    params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: ExpectedContext) {
    // 1. Autenticação
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    // ✅ FIX 1: Extrai e valida o organizationId da sessão
    const organizationId = Number((session.user as any).organizationId);
    if (isNaN(organizationId) || organizationId <= 0) {
        return NextResponse.json({ message: "Organização não definida para o usuário." }, { status: 403 });
    }
    
    // Definimos a variável fora do try para ser acessível no catch
    let idForLog: string | number = 'unknown';

    try {
        const params = await context.params;
        const id = parseInt(params.id, 10);
        idForLog = params.id; // Guarda o valor bruto para log

        if (isNaN(id)) {
            return NextResponse.json({ message: 'ID da rota inválido.' }, { status: 400 });
        }

        const body = await request.json();
        const { demandas } = body; // Espera { demandas: [{id: 1}, {id: 5}, ...] }

        if (!demandas || !Array.isArray(demandas)) {
             return NextResponse.json({ message: 'Lista de demandas inválida.' }, { status: 400 });
        }

        // ✅ FIX 2: Chamada ao serviço com o organizationId
        await rotasService.reorderDemandas(id, organizationId, demandas);

        return NextResponse.json({
            message: 'Ordem da rota atualizada com sucesso!'
        }, { status: 200 });

    } catch (error) {
        // Agora usamos a variável que está no escopo correto
        console.error(`[API /rotas/${idForLog}/reorder] Erro:`, error);
        
        const message = error instanceof Error ? error.message : 'Erro desconhecido.';
        const status = message === "Rota não encontrada." ? 404 : 500;
        
        return NextResponse.json({ message, error: message }, { status });
    }
}