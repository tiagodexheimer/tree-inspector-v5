// src/app/api/relatorios/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { RelatoriosService } from "@/services/relatorios-service";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Não autenticado" }, { status: 401 });

  try {
    const relatorios = await RelatoriosService.listarRelatorios();
    return NextResponse.json(relatorios, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erro ao buscar relatórios" }, { status: 500 });
  }
}