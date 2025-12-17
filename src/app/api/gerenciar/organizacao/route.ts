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
        // 3. Chama o Service para atualizar o nome
        const updatedOrg = await organizationService.updateOrganization(
            organizationId,
            { name: newName }
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

export async function PATCH(request: Request) {
    try {
        const session = await auth();

        // 1. Verificar Autenticação
        if (!session || !session.user || !session.user.organizationId) {
            return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
        }

        // 2. Verificar Permissão (Apenas Owner ou Admin podem editar)
        const role = (session.user as any).organizationRole;
        if (role !== 'owner' && role !== 'admin') {
            return NextResponse.json({ message: "Permissão negada." }, { status: 403 });
        }

        // 3. Ler corpo da requisição
        const body = await request.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ message: "Nome é obrigatório." }, { status: 400 });
        }

        // 4. Chamar o serviço
        const updatedOrg = await organizationService.updateOrganization(
            Number(session.user.organizationId),
            { name }
        );

        return NextResponse.json(updatedOrg);

    } catch (error: any) {
        console.error("Erro ao atualizar organização:", error);
        return NextResponse.json(
            { message: error.message || "Erro interno ao atualizar." },
            { status: 500 }
        );
    }
}