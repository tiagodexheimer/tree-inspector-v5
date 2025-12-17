// src/app/api/gerenciar/organizacao/membros/sair/route.ts
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { userManagementService } from "@/services/user-management-service";

/**
 * POST: Permite que um usuário saia da sua organização atual.
 * @url /api/gerenciar/organizacao/membros/sair
 */
export async function POST() {
  const session = await auth();

  if (
    !session ||
    !session.user ||
    !session.user.organizationId ||
    !session.user.id
  ) {
    return NextResponse.json(
      { message: "Não autenticado ou organização/ID de usuário ausente." },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const organizationId = Number(session.user.organizationId);

  try {
    // Agora o serviço retorna o ID da nova organização ativa
    const newOrganizationId = await userManagementService.leaveOrganization(
      userId,
      organizationId
    );

    return NextResponse.json(
      {
        message: "Saiu da organização com sucesso.",
        newOrganizationId: newOrganizationId, // Envia o ID da organização pessoal para o frontend
        redirectAction: newOrganizationId ? "SWITCH_CONTEXT" : "LOGOUT", // Flag auxiliar para o front
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API POST Leave Organization]", error);

    let message =
      error instanceof Error
        ? error.message
        : "Erro interno ao sair da organização.";
    let status = 403; // Uso de 403 para erros de permissão ou regras de negócio (ex: único membro).

    return NextResponse.json({ message }, { status });
  }
}
