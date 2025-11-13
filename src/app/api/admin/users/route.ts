// src/app/api/admin/users/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route"; // Importe suas opções
import pool from "@/lib/db";
import bcrypt from "bcryptjs"; // Importe bcryptjs

// Função HELPER para verificar se o usuário é admin
// NOTE: Esta função não é mais usada, mas vou mantê-la no código anterior para compatibilidade
async function isAdminSession() {
  const session = await getServerSession(authOptions);
  // Verifica se há sessão E se o papel é 'admin'
  if (session?.user?.role === 'admin') { 
    return true;
  }
  return false;
}


// --- LISTAR TODOS OS USUÁRIOS (Admin) ---
export async function GET() {
  
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
    // Seleciona todos os usuários, exceto a senha
    const result = await pool.query("SELECT id, name, email, role FROM users ORDER BY name");
    return NextResponse.json(result.rows, { status: 200 });

  } catch (error) { 
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ message: "Erro ao listar usuários", error: errorMessage }, { status: 500 });
  }
}


// --- CRIAR UM NOVO USUÁRIO (Admin) ---
export async function POST(request: NextRequest) {
    // 1. Verificação de Autenticação e Autorização (Role)
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
        return NextResponse.json({ message: "Não autorizado: Acesso restrito a administradores." }, { status: 403 });
    }
    // FIM da verificação de autorização

    try {
        const { name, email, password, role } = await request.json();

        if (!email || !password || !role) {
            return NextResponse.json({ message: "Email, senha e papel são obrigatórios." }, { status: 400 });
        }

        // Hash da senha ANTES de salvar
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await pool.query(
            "INSERT INTO users (id, name, email, hashed_password, role) VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id, name, email, role",
            [name, email, hashedPassword, role]
        );

        return NextResponse.json(newUser.rows[0], { status: 201 });

    } catch (error) { 
        let errorMessage = "Erro ao criar usuário";
        let status = 500;
        
        // Verifica se é um erro de banco de dados com um código (ex: email duplicado)
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            errorMessage = "Email já cadastrado.";
            status = 409; // Conflict
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        
        return NextResponse.json({ message: errorMessage }, { status });
    }
}