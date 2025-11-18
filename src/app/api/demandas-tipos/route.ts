// src/app/api/demandas-tipos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
// [CORREÇÃO v5] Importar 'auth' em vez de 'getServerSession/authOptions'
import { auth } from "@/auth";

interface TipoBody {
    nome?: string;
}

// --- Handler para GET (Listar todos os Tipos) ---
export async function GET() {
    console.log('[API /demandas-tipos] Recebido GET.');
    try {
        const result = await pool.query('SELECT id, nome FROM demandas_tipos ORDER BY nome');
        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        console.error('[API /demandas-tipos] Erro ao buscar tipos (GET):', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ message: 'Erro interno ao buscar tipos de demanda', error: errorMessage }, { status: 500 });
    }
}

// --- Handler para POST (Criar novo Tipo) ---
export async function POST(request: NextRequest) {
    console.log('[API /demandas-tipos] Recebido POST.');

    // [CORREÇÃO v5] Usar auth()
    const session = await auth();
    
    // Verificação de Admin (agora usamos session.user.role diretamente se tipado, ou verificamos existência)
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
    }

    try {
        const body = await request.json() as TipoBody;
        const { nome } = body;

        if (!nome || nome.trim() === '') {
            return NextResponse.json({ message: 'O nome do tipo de demanda é obrigatório.' }, { status: 400 });
        }

        const queryText = 'INSERT INTO demandas_tipos (nome) VALUES ($1) RETURNING id, nome';
        const queryParams = [nome.trim()];

        const result = await pool.query(queryText, queryParams);

        if (result.rows.length === 0) {
            throw new Error('Falha ao inserir o tipo, nenhum registo retornado.');
        }

        return NextResponse.json(result.rows[0], { status: 201 });

    } catch (error) {
        console.error('[API /demandas-tipos] Erro ao criar tipo (POST):', error);
        let errorMessage = 'Erro desconhecido';
        let status = 500;
        
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            status = 409;
            errorMessage = 'Erro: Já existe um tipo de demanda com este nome.';
        }
        else if (error instanceof Error) {
            errorMessage = error.message;
        }

        return NextResponse.json({ message: 'Erro interno ao criar tipo de demanda.', error: errorMessage }, { status });
    }
}