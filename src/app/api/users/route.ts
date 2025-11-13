// src/app/api/admin/users/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajuste o caminho
import pool from "@/lib/db"; 

// --- GET (Listar todos os usuários - Apenas Admin) ---
export async function GET(request: NextRequest) {
  
  // 1. Verificação de Autenticação e Autorização (Role)
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }
  
  // Verifica se o papel do usuário é 'admin'
  if (session.user.role !== 'admin') {
    console.warn(`[API /admin/users] Tentativa de acesso não autorizado por usuário: ${session.user.email}`);
    return NextResponse.json({ message: "Não autorizado: Acesso restrito a administradores." }, { status: 403 });
  }
  // FIM da verificação de autorização
  
  try {
    const result = await pool.query(
      "SELECT id, name, email, role FROM users ORDER BY created_at DESC"
    );
    
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    console.error("[API /admin/users] Erro ao buscar usuários:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { message: "Erro interno ao buscar usuários.", error: errorMessage },
      { status: 500 }
    );
  }
}

// ... (Outros handlers como POST para criar novos usuários, se houver)