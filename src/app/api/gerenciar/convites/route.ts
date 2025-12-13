// src/app/api/gerenciar/convites/route.ts
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { inviteService } from "@/services/invite-service";

// --- AUXILIARES ---
// Checagem de permissão para criar/listar convites
async function checkInvitePermission(isPost: boolean) {
  const session = await auth();

  if (!session || !session.user || !session.user.organizationId) {
    return {
      authorized: false,
      status: 401,
      message: "Não autenticado ou organização não definida.",
    };
  }

  const userRole = session.user.role.toLowerCase();
  const organizationId = Number(session.user.organizationId);

  // Para POST (Criação de convite): O usuário Free não pode enviar convites.
  if (isPost && userRole === "free") {
    return {
      authorized: false,
      status: 403,
      message: "Seu plano (Free) não permite enviar convites.",
    };
  }

  return { authorized: true, session, userRole, organizationId };
}

// --- GET: LISTAR CONVITES PENDENTES ---
export async function GET() {
  const permission = await checkInvitePermission(false);
  if (!permission.authorized) {
    return NextResponse.json(
      { message: permission.message },
      { status: permission.status }
    );
  }

  try {
    // Chamada ao Service para listar convites ativos da organização
    const activeInvites = await inviteService.listActiveInvites(
      permission.organizationId
    );

    return NextResponse.json({ invites: activeInvites }, { status: 200 });
  } catch (error) {
    console.error("[API GET Invites]", error);
    let status = 500;
    let message = "Erro ao listar convites.";

    if (error instanceof Error && error.message.includes("limite"))
      status = 403;

    return NextResponse.json({ message, error: message }, { status });
  }
}

// --- POST: CRIAR NOVO CONVITE ---
export async function POST(request: NextRequest) {
  const permission = await checkInvitePermission(true);

  if (!permission.authorized) {
    return NextResponse.json(
      { message: permission.message },
      { status: permission.status }
    );
  }

  const organizationId = permission.organizationId;
  const inviterRole = permission.userRole;

  try {
    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { message: "Email e role são obrigatórios." },
        { status: 400 }
      );
    }

    const newInvite = await inviteService.createInvite({
      organizationId,
      inviterRole,
      email,
      role,
    });

    // [FLUXO DE TESTE] Constrói e retorna o link de aceite para o frontend exibir.
    const baseUrl = request.nextUrl.origin;
    const acceptanceLink = `${baseUrl}/convite/${newInvite.token}`;

    return NextResponse.json(
      {
        message: "Convite criado com sucesso. (LINK GERADO ABAIXO)",
        invite: newInvite,
        acceptanceLink: acceptanceLink, 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API POST Invite]", error);
    let status = 500;
    let message = "Erro ao criar convite.";

    if (error instanceof Error) {
      message = error.message;
      if (message.includes("limite") || message.includes("plano não permite"))
        status = 403;
      if (message.includes("obrigatório") || message.includes("inválido"))
        status = 400;
      if (message.includes("já é membro")) status = 409;
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}