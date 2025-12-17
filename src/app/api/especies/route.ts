
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        if (!query) {
            const result = await pool.query(
                `SELECT id, nome_comum, nome_cientifico, familia, origem
                 FROM especies 
                 ORDER BY nome_comum ASC
                 LIMIT $1 OFFSET $2`,
                [limit, offset]
            );

            const countResult = await pool.query('SELECT COUNT(*) FROM especies');
            const total = parseInt(countResult.rows[0].count);

            return NextResponse.json({
                results: result.rows,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            });
        }

        const searchTerm = `%${query}%`;

        // Search in both common and scientific names
        const result = await pool.query(
            `SELECT id, nome_comum, nome_cientifico 
       FROM especies 
       WHERE nome_comum ILIKE $1 OR nome_cientifico ILIKE $1 
       LIMIT 20`,
            [searchTerm]
        );

        return NextResponse.json({ results: result.rows });
    } catch (error) {
        console.error('Error searching species:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
