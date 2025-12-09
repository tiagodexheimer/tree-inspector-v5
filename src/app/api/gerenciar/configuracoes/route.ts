import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ConfiguracoesService } from "@/services/configuracoes-service";
import pool from "@/lib/db"; // Importamos o pool para acesso direto à tabela de organizações

export async function GET() {
    const session = await auth();
    // [SEGURANÇA] Verifica se tem organizationId na sessão
    if (!session || !session.user || !session.user.organizationId) {
        return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    // Cast para número, garantindo tipagem
    const orgId = parseInt(session.user.organizationId as any, 10);

    try {
        // 1. Busca Configuração de Rota (Service Existente)
        // Nota: O ideal seria o service receber o orgId também, mas focaremos na organização aqui
        const configRota = await ConfiguracoesService.obterConfiguracaoRota();

        // 2. Busca Dados da Organização (Nome e Plano)
        const orgQuery = `SELECT name, plan_type FROM organizations WHERE id = $1`;
        const orgRes = await pool.query(orgQuery, [orgId]);
        const orgData = orgRes.rows[0];

        // Retorna tudo mesclado
        return NextResponse.json({
            ...configRota,
            orgName: orgData?.name || '',
            planType: orgData?.plan_type || 'Free'
        });

    } catch (error) {
        console.error("Erro API Config GET:", error);
        return NextResponse.json({ message: "Erro ao buscar configurações" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const session = await auth();
    if (!session || !session.user || !session.user.organizationId) {
        return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const orgId = parseInt(session.user.organizationId as any, 10);

    try {
        const body = await request.json();
        const { inicio, fim, orgName } = body; // Extrai o novo nome também

        // 1. Salva Configuração de Rota (Service Existente)
        await ConfiguracoesService.salvarConfiguracaoRota({ inicio, fim });

        // 2. Atualiza Nome da Organização (Se enviado e Se permitido)
        if (orgName) {
            // Verifica o plano antes de permitir alteração
            const planQuery = `SELECT plan_type FROM organizations WHERE id = $1`;
            const planRes = await pool.query(planQuery, [orgId]);
            const currentPlan = planRes.rows[0]?.plan_type;

            // REGRA DE NEGÓCIO: Somente não-Free pode alterar
            if (currentPlan !== 'Free') {
                await pool.query(
                    `UPDATE organizations SET name = $1 WHERE id = $2`,
                    [orgName, orgId]
                );
            }
            // Se for Free, ignoramos a alteração de nome silenciosamente ou poderíamos retornar erro
        }

        return NextResponse.json({ message: "Configurações salvas com sucesso!" });
    } catch (error: any) {
        console.error("Erro API Config PUT:", error);
        return NextResponse.json({ message: error.message || "Erro ao salvar" }, { status: 500 });
    }
}