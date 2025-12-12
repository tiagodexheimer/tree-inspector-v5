// src/app/api/demandas-tipos/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { demandasTiposService } from "@/services/demandas-tipos-service";
import { UserRole } from "@/types/auth-types"; 

export const dynamic = 'force-dynamic';

// --- Função Auxiliar de Segurança (Compartilhada) ---
function getAuthContext(session: any) {
    if (!session || !session.user) {
        throw new Error("Não autenticado");
    }

    const user = session.user as any;
    const organizationId = parseInt(user.organizationId || "0", 10);
    
    if (isNaN(organizationId) || organizationId === 0) {
        throw new Error("Sessão inválida: ID da organização ausente.");
    }
    
    const organizationPlanType = user.role as UserRole; 
    
    return { organizationId, organizationPlanType };
}


// --- GET: Listar Tipos ---
export async function GET(request: NextRequest) {
    const session = await auth();
    
    try {
        const { organizationId, organizationPlanType } = getAuthContext(session); 

        // [FIX] O service listAll agora requer o organizationId e o PlanType
        const tipos = await demandasTiposService.listAll(organizationId, organizationPlanType);
        
        return NextResponse.json(tipos, { status: 200 });

    } catch (error: any) {
        if (error.message === "Não autenticado") {
            return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
        }
        if (error.message.includes("Sessão inválida")) {
            return NextResponse.json({ message: error.message }, { status: 403 });
        }
        console.error("[API GET Tipos]", error);
        return NextResponse.json(
            { message: "Erro ao buscar tipos de demanda", error: error.message },
            { status: 500 }
        );
    }
}

// --- POST: Criar Tipo ---
export async function POST(request: NextRequest) {
    const session = await auth();

    try {
        // [FIX] A chamada ao getAuthContext é essencial para evitar o 403
        const { organizationId, organizationPlanType } = getAuthContext(session); 
        const body = await request.json();
        
        // O service verifica a permissão do plano antes de criar
        const newTipo = await demandasTiposService.createTipo(
            body,
            organizationId,
            organizationPlanType
        );

        return NextResponse.json(newTipo, { status: 201 });

    } catch (error: any) {
        if (error.message.includes("plano atual não permite")) {
            return NextResponse.json({ message: error.message }, { status: 403 }); 
        }
        if (error.message === "Não autenticado") {
            return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
        }
        if (error.message.includes("Sessão inválida") || error.message.includes("Já existe")) {
            return NextResponse.json({ message: error.message }, { status: 403 }); 
        }
        console.error("[API POST Tipos]", error);
        return NextResponse.json(
            { message: "Falha ao criar tipo de demanda", error: error.message },
            { status: 500 }
        );
    }
}

// --- PUT: Atualizar Tipo ---
export async function PUT(request: NextRequest) {
    const session = await auth();

    try {
        // [FIX] A chamada ao getAuthContext é essencial para evitar o 403
        const { organizationId, organizationPlanType } = getAuthContext(session); 
        const body = await request.json();
        
        const { searchParams } = new URL(request.url);
        const id = parseInt(searchParams.get("id") || "0", 10);
        
        if (id === 0) {
            return NextResponse.json({ message: "ID do tipo ausente ou inválido." }, { status: 400 });
        }
        
        // O service verifica a permissão do plano antes de atualizar
        const updatedTipo = await demandasTiposService.updateTipo(
            id,
            body,
            organizationId,
            organizationPlanType
        );

        return NextResponse.json(updatedTipo, { status: 200 });

    } catch (error: any) {
        if (error.message.includes("plano atual não permite") || error.message.includes("não tem permissão")) {
            return NextResponse.json({ message: error.message }, { status: 403 }); 
        }
        if (error.message === "Não autenticado") {
            return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
        }
        if (error.message.includes("Sessão inválida") || error.message.includes("não encontrado")) {
            return NextResponse.json({ message: error.message }, { status: 404 }); 
        }
        console.error("[API PUT Tipos]", error);
        return NextResponse.json(
            { message: "Falha ao atualizar tipo de demanda", error: error.message },
            { status: 500 }
        );
    }
}

// --- DELETE: Excluir Tipo ---
export async function DELETE(request: NextRequest) {
    const session = await auth();

    try {
        // [FIX] A chamada ao getAuthContext é essencial para evitar o 403
        const { organizationId, organizationPlanType } = getAuthContext(session);
        
        const { searchParams } = new URL(request.url);
        const id = parseInt(searchParams.get("id") || "0", 10);
        
        if (id === 0) {
            return NextResponse.json({ message: "ID do tipo ausente ou inválido." }, { status: 400 });
        }
        
        // O service verifica a permissão do plano antes de deletar
        await demandasTiposService.deleteTipo(
            id,
            organizationId,
            organizationPlanType
        );

        return NextResponse.json({ message: "Tipo de demanda excluído com sucesso." }, { status: 200 });

    } catch (error: any) {
        if (error.message.includes("plano atual não permite") || error.message.includes("não tem permissão")) {
            return NextResponse.json({ message: error.message }, { status: 403 }); 
        }
        if (error.message === "Não autenticado") {
            return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
        }
        if (error.message.includes("Sessão inválida") || error.message.includes("não encontrado")) {
            return NextResponse.json({ message: error.message }, { status: 404 }); 
        }
        if (error.message.includes("associação a demandas")) {
            return NextResponse.json({ message: error.message }, { status: 409 }); // Conflict
        }
        
        console.error("[API DELETE Tipos]", error);
        return NextResponse.json(
            { message: "Falha ao excluir tipo de demanda", error: error.message },
            { status: 500 }
        );
    }
}