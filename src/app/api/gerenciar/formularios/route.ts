// src/app/api/gerenciar/formularios/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { formulariosService } from "@/services/formularios-service";
import { FormulariosRepository } from "@/repositories/formularios-repository"; 
import { UserRole } from "@/types/auth-types"; 

export const dynamic = 'force-dynamic';

// --- Função Auxiliar de Segurança ---
function getAuthContext(session: any) {
    if (!session || !session.user) {
        throw new Error("Não autenticado");
    }

    const user = session.user as any;
    const organizationId = parseInt(user.organizationId || "0", 10);
    const userRole = user.role as UserRole; 
    
    if (isNaN(organizationId) || organizationId === 0) {
        throw new Error("Sessão inválida: ID da organização ausente.");
    }
    
    // userRole é o Plan Type (free, basic, pro, premium)
    return { organizationId, userRole };
}

// --- GET: Listar Formulários ---
export async function GET(request: NextRequest) {
    const session = await auth();

    try {
        const { organizationId } = getAuthContext(session); 
        
        // Lista todos os formulários pertencentes à organização
        // Assumimos que FormulariosRepository.listByOrganization existe e garante o multi-tenant
        const formularios = await FormulariosRepository.listByOrganization(organizationId);

        return NextResponse.json(formularios, { status: 200 });

    } catch (error: any) {
        if (error.message === "Não autenticado") {
            return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
        }
        if (error.message.includes("Sessão inválida")) {
            return NextResponse.json({ message: error.message }, { status: 403 });
        }
        console.error("[API GET Formularios]", error);
        return NextResponse.json(
            { message: "Falha ao buscar formulários", error: error.message },
            { status: 500 }
        );
    }
}

// --- POST: Criar Formulário ---
export async function POST(request: NextRequest) {
    const session = await auth();

    try {
        const { organizationId, userRole } = getAuthContext(session); 
        const body = await request.json();
        
        // O service lida com a checagem de limite (MAX_FORMULARIOS) e a validação do tipo de formulário (Formulário Padrão Fixo para Free).
        const newForm = await formulariosService.createFormulario(
            body, // Contém nome, descricao, definicao_campos
            organizationId,
            userRole
        );

        return NextResponse.json(newForm, { status: 201 });

    } catch (error: any) {
        if (error.message === "Não autenticado") {
            return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
        }
        if (error.message.includes("Sessão inválida") || error.message.includes("Limite de") || error.message.includes("personalizados")) {
            // Retorna 403 para erros de permissão ou limite de plano
            return NextResponse.json({ message: error.message }, { status: 403 }); 
        }
        console.error("[API POST Formularios]", error);
        return NextResponse.json(
            { message: "Falha ao criar formulário", error: error.message },
            { status: 500 }
        );
    }
}

// --- Outras Rotas (PUT, DELETE) ---
// Estas rotas (PUT e DELETE) deverão seguir o mesmo padrão, utilizando o service e verificando a posse do formulário pela organização.