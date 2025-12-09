import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import pool from "@/lib/db";

export async function GET() {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    try {
        const client = await pool.connect();

        try {
            // 1. Busca KPIs Gerais
            // Contamos total, e usamos FILTER para contar status específicos numa única query
            const kpiQuery = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE id_status = (SELECT id FROM demandas_status WHERE nome = 'Pendente' LIMIT 1)) as pendentes,
                    COUNT(*) FILTER (WHERE id_status = (SELECT id FROM demandas_status WHERE nome = 'Concluído' LIMIT 1)) as concluidas
                FROM demandas;
            `;
            const kpiRes = await client.query(kpiQuery);
            
            // Contagem de rotas
            const rotasRes = await client.query('SELECT COUNT(*) as total FROM rotas');

            // 2. Busca Distribuição por Status para o Gráfico
            const chartQuery = `
                SELECT 
                    s.nome as name, 
                    s.cor as color, 
                    COUNT(d.id) as value
                FROM demandas d
                JOIN demandas_status s ON d.id_status = s.id
                GROUP BY s.nome, s.cor
                ORDER BY value DESC
            `;
            const chartRes = await client.query(chartQuery);

            const data = {
                kpis: {
                    totalDemandas: parseInt(kpiRes.rows[0].total, 10) || 0,
                    totalPendentes: parseInt(kpiRes.rows[0].pendentes, 10) || 0,
                    totalConcluidas: parseInt(kpiRes.rows[0].concluidas, 10) || 0,
                    totalRotas: parseInt(rotasRes.rows[0].total, 10) || 0,
                },
                statusDistribution: chartRes.rows.map(row => ({
                    name: row.name,
                    value: parseInt(row.value, 10),
                    color: row.color || '#8884d8'
                }))
            };

            return NextResponse.json(data, { status: 200 });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error("[API Dashboard] Erro:", error);
        return NextResponse.json({ message: "Erro ao carregar dados do dashboard" }, { status: 500 });
    }
}