import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ConfiguracoesService } from "@/services/configuracoes-service";
import pool from "@/lib/db"; // Se você usa o pool para a query de organização (linha 22)

// --- GET: Obter Configurações ---
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const user = session.user as any;
    const organizationId = Number(user.organizationId);

    if (isNaN(organizationId) || organizationId <= 0) {
        return NextResponse.json({ message: "Organização não definida para o usuário." }, { status: 403 });
    }

    try {
        // ✅ CORREÇÃO 1: Passa organizationId para obter a configuração do tenant
        const configRota = await ConfiguracoesService.obterConfiguracaoRota(organizationId);

        // 2. Busca Dados da Organização (Nome e Plano) - Mantido aqui para compatibilidade
        // ⚠️ Nota: Esta lógica deve idealmente ser movida para um OrganizationRepository/Service.
        const orgQuery = `SELECT name, plan_type FROM organizations WHERE id = $1`;
        const orgRes = await pool.query(orgQuery, [organizationId]);
        
        const organizationData = orgRes.rows[0];
        if (!organizationData) {
            return NextResponse.json({ message: "Dados da organização não encontrados." }, { status: 404 });
        }

        return NextResponse.json({
            configuracaoRota: configRota,
            organization: organizationData,
        }, { status: 200 });

    } catch (error) {
        console.error("[API GET Configuracoes] Erro:", error);
        return NextResponse.json({ message: "Erro interno ao buscar configurações." }, { status: 500 });
    }
}


// --- PUT: Salvar Configurações ---
export async function PUT(request: NextRequest) {
    const session = await auth();
    if (!session || !session.user) {
        return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    
    // Extrai organizationId (necessário para o serviço)
    const organizationId = Number((session.user as any).organizationId);
    if (isNaN(organizationId) || organizationId <= 0) {
        return NextResponse.json({ message: "Organização não definida para o usuário." }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { configuracaoRota } = body;
        
        // ✅ CORREÇÃO 2: Passa organizationId para o serviço
        await ConfiguracoesService.salvarConfiguracaoRota(organizationId, configuracaoRota);

        return NextResponse.json({ message: "Configurações salvas com sucesso." }, { status: 200 });

    } catch (error) {
        console.error("[API PUT Configuracoes] Erro:", error);
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        return NextResponse.json({ message, error: message }, { status: 500 });
    }
}