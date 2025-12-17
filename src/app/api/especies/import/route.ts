
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet) as any[];

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });
        }

        const client = await pool.connect();
        let importedCount = 0;

        try {
            await client.query('BEGIN');

            for (const item of data) {
                const nomeComum = item['nome_comum'];
                const nomeCientifico = item['nome_cientifico'];
                // Optional fields
                const familia = item['familia'] || null;
                const origem = item['origem'] || null;


                if (nomeComum && nomeCientifico) {
                    // Upsert logic (checking duplicates by name pair for simplicity)
                    // Or just INSERT IGNORE logic if ID implies uniqueness.
                    // For now, strict INSERT.
                    await client.query(`
                    INSERT INTO especies (nome_comum, nome_cientifico, familia, origem)
                    VALUES ($1, $2, $3, $4)
                 `, [nomeComum, nomeCientifico, familia, origem]);
                    importedCount++;
                }
            }

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        return NextResponse.json({ success: true, count: importedCount });
    } catch (error) {
        console.error('Error importing species:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
