// src/app/api/admin/users/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";


// --- LISTAR TODOS OS USUÁRIOS (Admin) ---
export async function GET() {
  
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }
  
  // Verifica se o papel do usuário é 'admin'
  if (session.user.role !== 'admin') {
    return NextResponse.json({ message: "Não autorizado: Acesso restrito a administradores." }, { status: 403 });
  }
  
  try {
    // Seleciona todos os usuários, exceto a coluna de senha
    const result = await pool.query("SELECT id, name, email, role FROM users ORDER BY name");
    return NextResponse.json(result.rows, { status: 200 });

  } catch (error) { 
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ message: "Erro ao listar usuários", error: errorMessage }, { status: 500 });
  }
}


// --- CRIAR UM NOVO USUÁRIO (Admin) ---
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'admin') {
        return NextResponse.json({ message: "Não autorizado: Acesso restrito a administradores." }, { status: 403 });
    }

    try {
        const { name, email, password, role } = await request.json();

        if (!email || !password || !role) {
            return NextResponse.json({ message: "Email, senha e papel são obrigatórios." }, { status: 400 });
        }

        // Hash da senha ANTES de salvar
        const hashedPassword = await bcrypt.hash(password, 10);

        // CORRIGIDO: Mudar de 'hashed_password' para 'password' na instrução INSERT
        const newUser = await pool.query(
            "INSERT INTO users (id, name, email, password, role) VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id, name, email, role",
            [name, email, hashedPassword, role]
        );

        return NextResponse.json(newUser.rows[0], { status: 201 });

    } catch (error) { 
        let errorMessage = "Erro ao criar usuário";
        let status = 500;
        
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            errorMessage = "Email já cadastrado.";
            status = 409; 
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        
        return NextResponse.json({ message: errorMessage }, { status });
    }
}