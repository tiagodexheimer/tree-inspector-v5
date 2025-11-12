// src/app/api/admin/users/[id]/route.ts
import { NextResponse, NextRequest } from "next/server"; // Importe NextRequest
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import pool from "@/lib/db";

// Defina o tipo de contexto esperado, exatamente como o Next.js mostrou no erro
type ExpectedContext = {
    params: Promise<{ id: string }>;
};

// Função HELPER para verificar se o usuário é admin
async function isAdminSession() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === 'admin';
}

// --- APAGAR UM USUÁRIO (Admin) ---
// Assinatura da função CORRIGIDA para corresponder ao erro de build
export async function DELETE(request: NextRequest, context: ExpectedContext) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }

  // Extração do 'id' CORRIGIDA (precisamos dar 'await' no context.params)
  const params = await context.params;
  const id = params.id; // Agora 'id' é extraído da 'context' resolvida
  
  if (!id) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }
  
  const session = await getServerSession(authOptions);
  
  // Proteção: Impedir que o admin apague a si mesmo
  if (session?.user?.id === id) { 
     return NextResponse.json({ message: "Não pode apagar a si mesmo." }, { status: 400 });
  }

  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]); 
    if (result.rowCount === 0) {
      return NextResponse.json({ message: "Usuário não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ message: `Usuário ${id} deletado.` }, { status: 200 });

  } catch (error) { 
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ message: "Erro ao deletar usuário", error: errorMessage }, { status: 500 });
  }
}