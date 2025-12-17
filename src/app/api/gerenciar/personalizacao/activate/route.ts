
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { CustomizationService } from "@/services/customization-service";
import { getLimitsByRole } from "@/types/auth-types";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const organizationId = Number((session.user as any).organizationId);
    if (!organizationId) {
        return NextResponse.json({ message: "Organização não encontrada" }, { status: 400 });
    }

    try {
        const { usesCustomSchema } = await CustomizationService.getCustomizationStatus(organizationId);
        return NextResponse.json({ usesCustomSchema });
    } catch (error) {
        console.error("Erro ao buscar status de personalização:", error);
        return NextResponse.json({ message: "Erro interno", error: String(error) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const userRole = session.user.role;
    const organizationId = Number((session.user as any).organizationId);

    // 1. Verificar Permissão do Plano (Pro/Premium)
    const limits = getLimitsByRole(userRole);
    if (!limits.ALLOW_CUSTOM_STATUS || !limits.ALLOW_CUSTOM_TYPES) {
        return NextResponse.json({
            message: "Seu plano atual não permite personalização avançada."
        }, { status: 403 });
    }

    try {
        // 2. Ativar Customização (Fork)
        await CustomizationService.activateCustomSchema(organizationId);

        return NextResponse.json({
            message: "Personalização ativada com sucesso! Você agora tem seu próprio conjunto de Status e Tipos."
        });

    } catch (error) {
        console.error("Erro ao ativar personalização:", error);
        return NextResponse.json({
            message: "Erro ao ativar personalização.",
            error: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
