// src/app/api/signup/route.ts
import { NextResponse, NextRequest } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs"; // Importe bcryptjs

// --- CRIAR UM NOVO USUÁRIO (Público - Auto-registro) ---
export async function POST(request: NextRequest) {
  // ATENÇÃO: Esta rota é pública. Nenhuma verificação de isAdminSession é necessária.

  try {
    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Email e senha são obrigatórios." }, { status: 400 });
    }

    // 1. FORÇAR O PAPEL (ROLE) PARA NÃO ADMINISTRADOR
    const role = 'free_user'; 
    // Usamos `name || null` porque o campo `name` na sua API de usuários aceita nulo.
    const userName = name || null; 

    // 2. Hash da senha ANTES de salvar
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "INSERT INTO users (id, name, email, hashed_password, role) VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id, name, email, role",
      [userName, email, hashedPassword, role]
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