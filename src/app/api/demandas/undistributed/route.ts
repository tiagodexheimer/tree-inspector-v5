import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DemandasRepository } from "@/repositories/demandas-repository";

// [DICA] Adicione isso para evitar cache estático agressivo se necessário
export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await auth();

    if (!session || !session.user) {
        return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    // 1. Extrair o organizationId da sessão
    const organizationId = parseInt((session.user as any).organizationId || "0", 10);

    // Validação de segurança simples
    if (isNaN(organizationId) || organizationId === 0) {
         return NextResponse.json({ message: "Organização inválida." }, { status: 403 });
    }

    try {
        // 2. Passar o organizationId para a função
        const demandas = await DemandasRepository.findUndistributed(organizationId);

        return NextResponse.json(demandas, { status: 200 });

    } catch (error) {
        console.error("[API GET Undistributed Demandas]", error);
        return NextResponse.json({ message: "Erro ao buscar demandas não distribuídas." }, { status: 500 });
    }
}