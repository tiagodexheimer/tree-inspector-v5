// src/app/api/demandas-tipos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db'; // Ajuste o caminho
// Importações de Autenticação
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

interface TipoBody {
    nome?: string;
}

// --- Handler para GET (Listar todos os Tipos) ---
// (Esta rota permanece pública, pois é usada pelos filtros de demanda)
export async function GET() {
    console.log('[API /demandas-tipos] Recebido GET.');
    try {
        const result = await pool.query('SELECT id, nome FROM demandas_tipos ORDER BY nome'); // Ordena por nome
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

    // Verificação de Admin
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
    }

    try {
        const body = await request.json() as TipoBody;
        const { nome } = body;

        // Validação
        if (!nome || nome.trim() === '') {
            return NextResponse.json({ message: 'O nome do tipo de demanda é obrigatório.' }, { status: 400 });
        }

        const queryText = 'INSERT INTO demandas_tipos (nome) VALUES ($1) RETURNING id, nome';
        const queryParams = [nome.trim()];

        const result = await pool.query(queryText, queryParams);

        if (result.rows.length === 0) {
            throw new Error('Falha ao inserir o tipo, nenhum registo retornado.');
        }

        console.log('[API /demandas-tipos] Tipo criado com sucesso:', result.rows[0]);
        return NextResponse.json(result.rows[0], { status: 201 });

    } catch (error) { // <-- INÍCIO DO BLOCO CORRIGIDO
        console.error('[API /demandas-tipos] Erro ao criar tipo (POST):', error);
        let errorMessage = 'Erro desconhecido';
        let status = 500;
        
        // Lógica de verificação de erro segura
        //
        if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
            if ('message' in error && typeof error.message === 'string' && error.message.includes('demandas_tipos_nome_key')) {
               status = 409; // Conflict
               errorMessage = 'Erro: Já existe um tipo de demanda com este nome.';
            } else {
               status = 409;
               errorMessage = 'Erro: Valor duplicado.';
            }
        }
        else if (error instanceof Error) {
            errorMessage = error.message;
        }

        return NextResponse.json({ message: 'Erro interno ao criar tipo de demanda.', error: errorMessage }, { status });
    } // <-- FIM DO BLOCO CORRIGIDO
}