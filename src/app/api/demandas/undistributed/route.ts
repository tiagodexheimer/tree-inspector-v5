// src/app/api/demandas/undistributed/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { DemandasRepository } from "@/repositories/demandas-repository";

// Endpoint para listar demandas que não estão em nenhuma rota
export async function GET() {
    const session = await auth();
    // Requer autenticação
    if (!session || !session.user) {
        return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    try {
        const demandas = await DemandasRepository.findUndistributed();

        // Mapeamos para garantir que 'prazo' (se existisse) estivesse como Date, 
        // mas o repositório já retorna campos simples para este endpoint.
        return NextResponse.json(demandas, { status: 200 });

    } catch (error) {
        console.error("[API GET Undistributed Demandas]", error);
        return NextResponse.json({ message: "Erro ao buscar demandas não distribuídas." }, { status: 500 });
    }
}