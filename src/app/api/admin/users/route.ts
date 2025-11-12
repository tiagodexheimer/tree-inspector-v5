// src/app/api/admin/users/route.ts
import { NextResponse, NextRequest } from "next/server"; // Adicione NextRequest
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

// Função HELPER para verificar se o usuário é admin
async function isAdminSession() {
  const session = await getServerSession(authOptions);
  // Verifica se há sessão E se o papel é 'admin'
  if ((session?.user as any)?.role === 'admin') {
    return true;
  }
  return false;
}

// +++ INÍCIO DO NOVO CÓDIGO +++

// --- LISTAR TODOS OS USUÁRIOS (Admin) ---
export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }

  try {
    // Seleciona todos os usuários, exceto a senha
    const result = await pool.query("SELECT id, name, email, role FROM users ORDER BY name");
    return NextResponse.json(result.rows, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ message: "Erro ao listar usuários", error: error.message }, { status: 500 });
  }
}

// +++ FIM DO NOVO CÓDIGO +++


// --- CRIAR UM NOVO USUÁRIO (Admin) ---
// (Esta função POST deve permanecer como estava)
export async function POST(request: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }

  try {
    const { name, email, password, role } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json({ message: "Email, senha e papel são obrigatórios." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "INSERT INTO users (id, name, email, hashed_password, role) VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id, name, email, role",
      [name, email, hashedPassword, role]
    );

    return NextResponse.json(newUser.rows[0], { status: 201 });

  } catch (error: any) {
    if (error.code === '23505') { 
       return NextResponse.json({ message: "Email já cadastrado." }, { status: 409 });
    }
    return NextResponse.json({ message: "Erro ao criar usuário", error: error.message }, { status: 500 });
  }
}