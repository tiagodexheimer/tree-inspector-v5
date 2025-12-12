// src/app/api/gerenciar/formularios/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { FormulariosRepository } from '@/repositories/formularios-repository'; 
import { formulariosService } from '@/services/formularios-service';
import { UpdateFormularioDTO } from '@/types/formularios';
import { UserRole } from '@/types/auth-types';

export const dynamic = 'force-dynamic';

function getAuthContext(session: any) {
    if (!session || !session.user) {
        throw new Error("Não autenticado");
    }
    const user = session.user as any;
    const organizationId = parseInt(user.organizationId || "0", 10);
    const userRole = user.role as UserRole;
    
    if (isNaN(organizationId) || organizationId === 0) {
        throw new Error("Sessão inválida: ID da organização ausente.");
    }
    return { organizationId, userRole };
}

// [FIX] Define o tipo correto para o contexto da rota (Next.js 15+)
type RouteContext = { params: Promise<{ id: string }> };

// --- GET: Buscar detalhes do formulário ---
export async function GET(req: NextRequest, context: RouteContext) {
    
    try {
        // [FIX CRÍTICO] Aguarda a resolução dos parâmetros
        const params = await context.params;
        const formId = Number(params.id);
        
        const session = await auth();
        const { organizationId } = getAuthContext(session); 
        
        if (isNaN(formId) || formId <= 0) {
            return NextResponse.json({ message: 'ID inválido (deve ser um número positivo).' }, { status: 400 });
        }

        // 1. Busca o formulário completo
        const form = await FormulariosRepository.findById(formId); 

        if (!form) {
            return NextResponse.json({ message: 'Formulário não encontrado.' }, { status: 404 });
        }

        // 2. Multi-tenant check
        if (form.organization_id !== organizationId && form.organization_id !== null) {
             return NextResponse.json({ message: "Acesso negado. O formulário não pertence à sua organização." }, { status: 403 });
        }
        
        return NextResponse.json(form, { status: 200 });

    } catch (error) {
        if (error instanceof Error && error.message === "Não autenticado") {
             return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
        }
        console.error('[API GET Form]', error);
        return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
    }
}

// --- PUT: Atualizar Formulário ---
export async function PUT(req: NextRequest, context: RouteContext) {
    try {
        const params = await context.params;
        const formId = Number(params.id);
    
        const session = await auth();
        const { organizationId, userRole } = getAuthContext(session); 
        const body: UpdateFormularioDTO = await req.json();

        if (isNaN(formId) || formId <= 0) {
            return NextResponse.json({ message: 'ID inválido.' }, { status: 400 });
        }

        const updatedForm = await formulariosService.updateFormulario(
            formId,
            body,
            organizationId,
            userRole
        );
        
        return NextResponse.json(updatedForm, { status: 200 });

    } catch (error: any) {
        return handleError(error);
    }
}

// --- DELETE: Deletar Formulário ---
export async function DELETE(req: NextRequest, context: RouteContext) {
    try {
        const params = await context.params;
        const formId = Number(params.id);
    
        const session = await auth();
        const { organizationId, userRole } = getAuthContext(session); 

        if (isNaN(formId) || formId <= 0) {
            return NextResponse.json({ message: 'ID inválido.' }, { status: 400 });
        }

        await formulariosService.deleteFormulario(
            formId,
            organizationId,
            userRole
        );
        
        return NextResponse.json({ message: 'Formulário deletado com sucesso.' }, { status: 200 });

    } catch (error: any) {
        return handleError(error);
    }
}

// Helper para tratamento de erros padronizado
function handleError(error: any) {
    if (error.message.includes("Não autorizado")) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
    if (error.message.includes("Acesso negado") || error.message.includes("não tem permissão")) {
        return NextResponse.json({ message: error.message }, { status: 403 });
    }
    if (error.message.includes("não encontrado")) {
        return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error.message.includes("associado")) {
        return NextResponse.json({ message: error.message }, { status: 409 });
    }
    console.error('[API Form Error]', error);
    return NextResponse.json({ message: 'Falha na operação.' }, { status: 500 });
}