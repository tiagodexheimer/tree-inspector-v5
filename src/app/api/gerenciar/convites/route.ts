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

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.organizationId) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  // Verifica permissão (apenas admin/owner vê convites)
  const userOrgRole = (session.user as any).organizationRole;
  if (userOrgRole !== "owner" && userOrgRole !== "admin") {
    return NextResponse.json({ message: "Permissão negada" }, { status: 403 });
  }

  try {
    const invites = await inviteService.listPendingInvites(
      Number(session.user.organizationId)
    );
    return NextResponse.json(invites);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// POST: Cria um novo convite
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.organizationId) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  // Verifica permissão
  const userOrgRole = (session.user as any).organizationRole;
  if (userOrgRole !== "owner" && userOrgRole !== "admin") {
    return NextResponse.json(
      { message: "Apenas Admin/Dono pode convidar." },
      { status: 403 }
    );
  }

  try {
    const { email, role } = await request.json();

    if (!email)
      return NextResponse.json(
        { message: "Email obrigatório" },
        { status: 400 }
      );

    const newInvite = await inviteService.createInvite(
      Number(session.user.organizationId),
      email,
      role || "member"
    );

    // TODO: AQUI VOCÊ INTEGRARIA COM UM SERVIÇO DE EMAIL (RESEND, NODEMAILER)
    // await sendEmail(newInvite.email, newInvite.token);

    return NextResponse.json(newInvite);
  } catch (error: any) {
    console.error("Erro ao criar convite:", error);
    return NextResponse.json(
      { message: error.message || "Erro ao processar convite." },
      { status: 400 }
    );
  }
}

// DELETE: Revoga um convite
export async function DELETE(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!session?.user?.organizationId || !id) {
    return NextResponse.json({ message: "Dados inválidos" }, { status: 400 });
  }

  // Verifica permissão
  const userOrgRole = (session.user as any).organizationRole;
  if (userOrgRole !== "owner" && userOrgRole !== "admin") {
    return NextResponse.json({ message: "Permissão negada" }, { status: 403 });
  }

  try {
    await inviteService.revokeInvite(
      Number(id),
      Number(session.user.organizationId)
    );
    return NextResponse.json({ message: "Convite removido" });
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao remover convite" },
      { status: 500 }
    );
  }
}
