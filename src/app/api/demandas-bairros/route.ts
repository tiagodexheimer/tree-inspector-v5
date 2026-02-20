import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { DemandasRepository } from "@/repositories/demandas-repository";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const session = await auth();

    if (!session || !session.user) {
        return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    const organizationId = parseInt((session.user as any).organizationId || "0", 10);

    if (isNaN(organizationId) || organizationId === 0) {
        return NextResponse.json({ message: "Organização inválida na sessão." }, { status: 400 });
    }

    try {
        const bairros = await DemandasRepository.getUniqueBairros(organizationId);
        return NextResponse.json(bairros, { status: 200 });
    } catch (error: any) {
        console.error("[API GET Demandas Bairros]", error);
        return NextResponse.json(
            { message: "Erro ao buscar bairros", error: error.message },
            { status: 500 }
        );
    }
}
