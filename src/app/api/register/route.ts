// src/app/api/register/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db'; // <-- CORREÇÃO 1: Importa o pool como default
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, password } = body;

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Faltam campos obrigatórios (nome, email, senha).' }, { status: 400 });
        }
        
        // 1. CHECAGEM PARA O PRIMEIRO USUÁRIO
        // CORREÇÃO 2: Usa pool.query()
        const userCountResult = await pool.query('SELECT COUNT(*) FROM users');
        const count = parseInt(userCountResult.rows[0].count as string, 10);
        
        // Se a contagem for zero, este é o primeiro usuário = ADMIN
        const userRole = count === 0 ? 'admin' : 'user';

        // 2. HASHEAR A SENHA
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // 3. INSERIR O NOVO USUÁRIO
        // CORREÇÃO 3: Usa pool.query() com sintaxe segura ($1, $2, ...)
        const newUserResult = await pool.query(
            `INSERT INTO users (name, email, password, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email, role`,
            [name, email, hashedPassword, userRole]
        );

        const newUser = newUserResult.rows[0];

        if (!newUser) {
             return NextResponse.json({ error: 'Falha ao criar o usuário.' }, { status: 500 });
        }
        
        console.log(`Novo usuário criado: ${newUser.email} com role: ${newUser.role}`);

        return NextResponse.json({ 
            message: 'Usuário criado com sucesso!',
            user: { id: newUser.id, name: newUser.name, role: newUser.role }
        }, { status: 201 });

    } catch (error) {
        console.error('Erro no registro:', error);
        
        if (error instanceof Error && error.message.includes('unique constraint')) {
            return NextResponse.json({ error: 'Este email já está em uso.' }, { status: 409 });
        }
        
        return NextResponse.json({ error: 'Erro interno do servidor no registro.' }, { status: 500 });
    }
}