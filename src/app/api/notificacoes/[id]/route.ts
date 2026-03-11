import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { notificacoesService } from "@/services/notificacoes-service";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: idStr } = await params;
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const organizationId = parseInt((session.user as any).organizationId || "0", 10);
    const id = parseInt(idStr, 10);

    try {
        const success = await notificacoesService.deleteNotificacao(id, organizationId);
        if (success) {
            return NextResponse.json({ message: "Notificação removida" });
        }
        return NextResponse.json({ message: "Não encontrada" }, { status: 404 });
    } catch (error) {
        console.error("[API DELETE Notificacao]", error);
        return NextResponse.json({ message: "Erro ao deletar" }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: idStr } = await params;
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const organizationId = parseInt((session.user as any).organizationId || "0", 10);
    const id = parseInt(idStr, 10);

    try {
        const body = await request.json();

        // Se o body tiver numero_processo, assumimos que é um update completo
        if (body.numero_processo) {
            const result = await notificacoesService.updateNotificacao(id, organizationId, body);
            if (result) {
                return NextResponse.json(result);
            }
        } else {
            // Caso contrário, mantém o comportamento de atualizar apenas status
            const { status } = body;
            const success = await notificacoesService.updateStatus(id, organizationId, status);
            if (success) {
                return NextResponse.json({ message: "Status atualizado" });
            }
        }

        return NextResponse.json({ message: "Não encontrada" }, { status: 404 });
    } catch (error) {
        console.error("[API PATCH Notificacao]", error);
        return NextResponse.json({ message: "Erro ao atualizar" }, { status: 500 });
    }
}
