import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ConfiguracoesService } from "@/services/configuracoes-service";

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    try {
        const config = await ConfiguracoesService.obterConfiguracaoRota();
        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ message: "Erro ao buscar configurações" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const session = await auth();
    if (!session) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    try {
        const body = await request.json();
        await ConfiguracoesService.salvarConfiguracaoRota(body);
        return NextResponse.json({ message: "Configurações salvas com sucesso!" });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || "Erro ao salvar" }, { status: 500 });
    }
}