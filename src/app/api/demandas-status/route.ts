// src/app/api/demandas-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db'; // Ajuste o caminho se necessário

interface StatusBody {
    nome?: string;
    cor?: string;
}

// --- Handler para GET (Listar todos os Status) ---
export async function GET(_request: NextRequest) {
    console.log('[API /demandas-status] Recebido GET.');
    try {
        const result = await pool.query('SELECT id, nome, cor FROM demandas_status ORDER BY id');
        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        console.error('[API /demandas-status] Erro ao buscar status (GET):', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        return NextResponse.json({ message: 'Erro interno ao buscar status', error: errorMessage }, { status: 500 });
    }
}

// --- Handler para POST (Criar novo Status) ---
export async function POST(request: NextRequest) {
    console.log('[API /demandas-status] Recebido POST.');
    try {
        const body = await request.json() as StatusBody;
        const { nome, cor } = body;

        // Validação
        if (!nome || nome.trim() === '') {
            return NextResponse.json({ message: 'O nome do status é obrigatório.' }, { status: 400 });
        }
        if (!cor || !/^#[0-9A-F]{6}$/i.test(cor)) {
             return NextResponse.json({ message: 'A cor é obrigatória e deve estar no formato #RRGGBB.' }, { status: 400 });
        }

        const queryText = 'INSERT INTO demandas_status (nome, cor) VALUES ($1, $2) RETURNING id, nome, cor';
        const queryParams = [nome.trim(), cor];

        const result = await pool.query(queryText, queryParams);

        if (result.rows.length === 0) {
            throw new Error('Falha ao inserir o status, nenhum registo retornado.');
        }

        console.log('[API /demandas-status] Status criado com sucesso:', result.rows[0]);
        return NextResponse.json(result.rows[0], { status: 201 });

    } catch (error) {
        console.error('[API /demandas-status] Erro ao criar status (POST):', error);
        let errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        let status = 500;
         // Trata erro de nome duplicado (UNIQUE constraint)
        if (error instanceof Error && 'code' in error && error.code === '23505' && error.message.includes('demandas_status_nome_key')) {
           status = 409; // Conflict
           errorMessage = 'Erro: Já existe um status com este nome.';
        }
        return NextResponse.json({ message: 'Erro interno ao criar status.', error: errorMessage }, { status });
    }
}