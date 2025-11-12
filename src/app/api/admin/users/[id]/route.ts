// src/app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import pool from "@/lib/db";

async function isAdminSession() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.role === 'admin';
}

// --- APAGAR UM USUÁRIO (Admin) ---
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }

  // --- CORREÇÃO AQUI ---
  // O ID é texto, não precisamos de parseInt
  const id = params.id; 
  if (!id) {
    return NextResponse.json({ message: "ID inválido" }, { status: 400 });
  }
  
  const session = await getServerSession(authOptions);
  // A verificação de auto-deleção continua funcionando
  if ((session?.user as any)?.id === id) { 
     return NextResponse.json({ message: "Não pode apagar a si mesmo." }, { status: 400 });
  }

  try {
    // A query do banco já espera um texto, então $1 funciona
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [id]); 
    if (result.rowCount === 0) {
      return NextResponse.json({ message: "Usuário não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ message: `Usuário ${id} deletado.` }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ message: "Erro ao deletar usuário", error: error.message }, { status: 500 });
  }
}