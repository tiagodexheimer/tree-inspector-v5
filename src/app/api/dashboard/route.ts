// src/app/api/dashboard/route.ts
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import pool from "@/lib/db";

export async function GET() {
    const session = await auth();
    // Verifica organizationId
    if (!session || !session.user?.organizationId) {
        return NextResponse.json({ message: "Não autenticado ou sem organização" }, { status: 401 });
    }

    const orgId = session.user.organizationId;

    try {
        const client = await pool.connect();
        try {
            // [ALTERADO] Filtrando por organization_id
            const kpiQuery = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE id_status IN (
                        SELECT id FROM demandas_status 
                        WHERE (nome ILIKE 'Pendente' OR nome ILIKE 'Pendentes') 
                        AND (organization_id = $1 OR organization_id IS NULL)
                    )) as pendentes,
                    COUNT(*) FILTER (WHERE id_status IN (
                        SELECT id FROM demandas_status 
                        WHERE (nome ILIKE 'Concluído' OR nome ILIKE 'Concluída' OR nome ILIKE 'Concluídas' OR nome ILIKE 'Concluido' OR nome ILIKE 'Finalizado') 
                        AND (organization_id = $1 OR organization_id IS NULL)
                    )) as concluidas
                FROM demandas
                WHERE organization_id = $1;
            `;
            const kpiRes = await client.query(kpiQuery, [orgId]);

            const rotasRes = await client.query(
                'SELECT COUNT(*) as total FROM rotas WHERE organization_id = $1',
                [orgId]
            );

            // [ALTERADO] Query do gráfico filtrada
            const chartQuery = `
                SELECT 
                    s.nome as name, 
                    s.cor as color, 
                    COUNT(d.id) as value
                FROM demandas d
                JOIN demandas_status s ON d.id_status = s.id
                WHERE d.organization_id = $1 
                GROUP BY s.nome, s.cor
                ORDER BY value DESC
            `;
            const chartRes = await client.query(chartQuery, [orgId]);

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