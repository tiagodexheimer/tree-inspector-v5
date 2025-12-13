// src/app/api/convite/aceitar/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth'; 
import { InviteService } from '@/services/invite-service';

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    // 1. O usuário precisa estar logado para aceitar
    // (A página de convite cuidará do redirecionamento se ele não estiver, 
    // mas a API precisa dessa proteção extra)
    if (!session || !session.user?.id) {
        return NextResponse.json({ message: "Você precisa estar logado." }, { status: 401 });
    }

    const { token } = await request.json();

    if (!token) {
        return NextResponse.json({ message: "Token inválido." }, { status: 400 });
    }

    // 2. Processa o aceite
    const result = await InviteService.acceptInvite(token, session.user.id);

    return NextResponse.json({ 
        message: "Convite aceito com sucesso!",
        organizationId: result.organizationId 
    });

  } catch (error: any) {
    console.error("Erro ao aceitar convite:", error);
    return NextResponse.json(
        { message: error.message || "Erro ao processar convite." }, 
        { status: 500 }
    );
  }
}