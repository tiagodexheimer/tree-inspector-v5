import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { statusService } from "@/services/status-service";
import { UserRole } from "@/types/auth-types"; 

export const dynamic = 'force-dynamic';

// --- Função Auxiliar de Segurança (SIMPLIFICADA) ---
function getAuthContext(session: any) {
    if (!session || !session.user) {
        throw new Error("Não autenticado");
    }

    const user = session.user as any;
    const organizationId = parseInt(user.organizationId || "0", 10);
    
    if (isNaN(organizationId) || organizationId === 0) {
        throw new Error("Sessão inválida: ID da organização ausente.");
    }
    
    // O organizationPlanType é a role do usuário na sessão (free, basic, pro, etc.)
    const organizationPlanType = user.role as UserRole; 
    
    return { organizationId, organizationPlanType };
}


// --- GET: Listar Status ---
export async function GET(request: NextRequest) {
    const session = await auth();
    
    try {
        const { organizationId, organizationPlanType } = getAuthContext(session); 

        // O service usa o PlanType para determinar quais listas de status ele deve buscar (Global ou Custom)
        const status = await statusService.listStatus(organizationId, organizationPlanType);
        
        return NextResponse.json(status, { status: 200 });

    } catch (error: any) {
        if (error.message === "Não autenticado") {
            return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
        }
        console.error("[API GET Status]", error);
        return NextResponse.json(
            { message: "Erro ao buscar status", error: error.message },
            { status: 500 }
        );
    }
}

// --- POST: Criar Status ---
export async function POST(request: NextRequest) {
    const session = await auth();

    try {
        const { organizationId, organizationPlanType } = getAuthContext(session); 
        const body = await request.json();
        
        // O service usa o PlanType para checar se a criação é permitida
        const newStatus = await statusService.createStatus(
            body,
            organizationId,
            organizationPlanType // Plano do usuário
        );

        return NextResponse.json(newStatus, { status: 201 });

    } catch (error: any) {
        if (error.message.includes("plano atual não permite")) {
            return NextResponse.json({ message: error.message }, { status: 403 }); 
        }
        if (error.message === "Não autenticado") {
            return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
        }
        console.error("[API POST Status]", error);
        return NextResponse.json(
            { message: "Falha ao criar status", error: error.message },
            { status: 500 }
        );
    }
}

// --- PUT: Atualizar Status ---
export async function PUT(request: NextRequest) {
    const session = await auth();

    try {
        const { organizationId, organizationPlanType } = getAuthContext(session); 
        const body = await request.json();
        
        const { searchParams } = new URL(request.url);
        const id = parseInt(searchParams.get("id") || "0", 10);
        
        if (id === 0) {
            return NextResponse.json({ message: "ID do status ausente ou inválido." }, { status: 400 });
        }
        
        // O service usa o PlanType para checar se a edição é permitida
        const updatedStatus = await statusService.updateStatus(
            id,
            body,
            organizationId,
            organizationPlanType // Plano do usuário
        );

        return NextResponse.json(updatedStatus, { status: 200 });

    } catch (error: any) {
        if (error.message.includes("plano atual não permite") || error.message.includes("não tem permissão")) {
            return NextResponse.json({ message: error.message }, { status: 403 }); 
        }
        if (error.message === "Não autenticado") {
            return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
        }
        if (error.message.includes("Status não encontrado")) {
            return NextResponse.json({ message: error.message }, { status: 404 });
        }
        console.error("[API PUT Status]", error);
        return NextResponse.json(
            { message: "Falha ao atualizar status", error: error.message },
            { status: 500 }
        );
    }
}

// --- DELETE: Excluir Status ---
export async function DELETE(request: NextRequest) {
    const session = await auth();

    try {
        const { organizationId, organizationPlanType } = getAuthContext(session);
        
        const { searchParams } = new URL(request.url);
        const id = parseInt(searchParams.get("id") || "0", 10);
        
        if (id === 0) {
            return NextResponse.json({ message: "ID do status ausente ou inválido." }, { status: 400 });
        }
        
        // O service usa o PlanType para checar se a exclusão é permitida
        await statusService.deleteStatus(
            id,
            organizationId,
            organizationPlanType // Plano do usuário
        );

        return NextResponse.json({ message: "Status excluído com sucesso." }, { status: 200 });

    } catch (error: any) {
        if (error.message.includes("plano atual não permite") || error.message.includes("não tem permissão")) {
            return NextResponse.json({ message: error.message }, { status: 403 }); 
        }
        if (error.message === "Não autenticado") {
            return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
        }
        if (error.message.includes("Status não encontrado")) {
            return NextResponse.json({ message: error.message }, { status: 404 });
        }
        if (error.message.includes("associação a demandas")) {
            return NextResponse.json({ message: error.message }, { status: 409 }); 
        }
        
        console.error("[API DELETE Status]", error);
        return NextResponse.json(
            { message: "Falha ao excluir status", error: error.message },
            { status: 500 }
        );
    }
}