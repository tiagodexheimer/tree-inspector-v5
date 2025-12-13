// src/app/api/convite/aceitar/route.ts
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth"; // ou sua config de sessão
import { inviteService } from "@/services/invite-service";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: "Usuário não autenticado." }, { status: 401 });
  }

  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ message: "Token de convite é obrigatório." }, { status: 400 });
    }

    // Chama o serviço atualizado
    const result = await inviteService.acceptInvite(token, session.user.id);

    return NextResponse.json({
      message: "Convite aceito com sucesso!",
      newOrganizationId: result.organizationId, // Importante para o frontend
      action: "SWITCH_CONTEXT" // Flag para o front saber que deve atualizar a página/sessão
    });

  } catch (error: any) {
    console.error("Erro ao aceitar convite:", error);
    return NextResponse.json({ message: error.message || "Erro ao processar convite." }, { status: 500 });
  }
}