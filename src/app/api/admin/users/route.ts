// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route"; // Importe suas opções
import pool from "@/lib/db";
import bcrypt from "bcrypt";

// Função HELPER para verificar se o usuário é admin
async function isAdminSession() {
  const session = await getServerSession(authOptions);
  // Verifica se há sessão E se o papel é 'admin'
  if ((session?.user as any)?.role === 'admin') {
    return true;
  }
  return false;
}

// --- CRIAR UM NOVO USUÁRIO (Admin) ---
export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
  }

  try {
    const { name, email, password, role } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json({ message: "Email, senha e papel são obrigatórios." }, { status: 400 });
    }

    // Hash da senha ANTES de salvar
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "INSERT INTO users (name, email, hashed_password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
      [name, email, hashedPassword, role]
    );

    return NextResponse.json(newUser.rows[0], { status: 201 });

  } catch (error: any) {
    if (error.code === '23505') { // Erro de email duplicado
       return NextResponse.json({ message: "Email já cadastrado." }, { status: 409 });
    }
    return NextResponse.json({ message: "Erro ao criar usuário", error: error.message }, { status: 500 });
  }
}

// --- (Você pode adicionar um GET aqui para listar todos os usuários) ---
export async function GET() {
   if (!(await isAdminSession())) {
     return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
   }
   // Lógica para 'SELECT id, name, email, role FROM users'
}