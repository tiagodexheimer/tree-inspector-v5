// src/app/api/demandas-tipos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { demandasTiposService } from "@/services/demandas-tipos-service";

async function checkAdminPermission() {
  const session = await auth();
  if (!session?.user) {
    return { authorized: false, status: 401, message: "Não autenticado" };
  }
  if (session.user.role !== 'admin') {
    return { authorized: false, status: 403, message: "Não autorizado" };
  }
  return { authorized: true };
}

export async function GET() {
  try {
    const tipos = await demandasTiposService.listAll();
    return NextResponse.json(tipos, { status: 200 });
  } catch (error) {
    console.error('[API GET Tipos]', error);
    return NextResponse.json({ message: 'Erro interno ao buscar tipos de demanda' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const permission = await checkAdminPermission();
  if (!permission.authorized) {
    return NextResponse.json({ message: permission.message }, { status: permission.status });
  }

  try {
    const body = await request.json();

    const newTipo = await demandasTiposService.createTipo({
      nome: body.nome,
      id_formulario: body.id_formulario // Recebe do frontend
    });

    return NextResponse.json(newTipo, { status: 201 });

  } catch (error) {
    console.error('[API POST Tipos]', error);
    
    let status = 500;
    let message = 'Erro interno ao criar tipo de demanda.';

    if (error instanceof Error) {
      message = error.message;
      if (message === "Já existe um tipo de demanda com este nome.") status = 409;
      if (message.includes("obrigatório")) status = 400;
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}