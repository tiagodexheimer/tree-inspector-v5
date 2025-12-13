// src/app/api/gerenciar/organizacao/route.ts

import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { organizationService } from "@/services/organization-service"; // Vamos criar/ajustar este serviço

// --- PUT: ATUALIZAR NOME DA ORGANIZAÇÃO ---
export async function PUT(request: NextRequest) {
    const session = await auth();

    // 1. Checagem de Autenticação e Organização
    if (!session || !session.user || !session.user.organizationId) {
        return NextResponse.json(
            { message: "Não autenticado ou organização não definida." },
            { status: 401 }
        );
    }

    const organizationId = Number(session.user.organizationId);

    // 2. Checagem de Permissão (Apenas admin/paid_user deve poder editar o nome da organização)
    const userRole = session.user.role.toLowerCase();
    if (userRole === "free") {
        return NextResponse.json(
            { message: "Seu plano Free não permite editar o nome da organização." },
            { status: 403 }
        );
    }

    try {
        const body = await request.json();
        const { newName } = body;

        if (!newName || newName.trim().length < 3) {
            return NextResponse.json(
                { message: "O nome da organização deve ter no mínimo 3 caracteres." },
                { status: 400 }
            );
        }

        // 3. Chama o Service para atualizar o nome
        const updatedOrg = await organizationService.updateOrganizationName(
            organizationId,
            newName
        );

        return NextResponse.json(
            { 
                message: "Nome da organização atualizado com sucesso.",
                organizationName: updatedOrg.name
            },
            { status: 200 }
        );
        
    } catch (error) {
        console.error("[API PUT Organization Name]", error);
        let message = "Erro interno ao atualizar nome da organização.";

        if (error instanceof Error) {
            message = error.message;
        }

        return NextResponse.json({ message }, { status: 500 });
    }
}