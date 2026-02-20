import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { notificacoesService } from "@/services/notificacoes-service";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const organizationId = parseInt((session.user as any).organizationId || "0", 10);
    const { searchParams } = new URL(request.url);
    const demandaId = searchParams.get("demanda_id");
    const vencidas = searchParams.get("vencidas") === "true";

    try {
        if (vencidas) {
            const result = await notificacoesService.listExpired(organizationId);
            return NextResponse.json(result);
        }

        if (demandaId) {
            const result = await notificacoesService.listByDemanda(parseInt(demandaId, 10));
            return NextResponse.json(result);
        }

        return NextResponse.json({ message: "Parâmetros inválidos" }, { status: 400 });
    } catch (error) {
        console.error("[API GET Notificacoes]", error);
        return NextResponse.json({ message: "Erro ao buscar notificações" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const organizationId = parseInt((session.user as any).organizationId || "0", 10);
    const userRole = (session.user as any).role; // [NOVO]

    try {
        const body = await request.json();
        const result = await notificacoesService.createNotificacao(body, organizationId, userRole);
        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("[API POST Notificacoes]", error);
        return NextResponse.json({ message: "Erro ao criar notificação" }, { status: 500 });
    }
}
