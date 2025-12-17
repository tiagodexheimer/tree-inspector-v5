
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { demandasTiposService } from "@/services/demandas-tipos-service";

// Listar Tipos
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const orgId = Number((session.user as any).organizationId);
    const role = session.user.role;

    try {
        const data = await demandasTiposService.listAll(orgId, role);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ message: String(error) }, { status: 500 });
    }
}

// Criar Tipo
export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const orgId = Number((session.user as any).organizationId);
    const role = session.user.role;

    try {
        const body = await request.json();
        const created = await demandasTiposService.createTipo(body, orgId, role);
        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: String(error) }, { status: 400 });
    }
}

// Atualizar Tipo
export async function PUT(request: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const orgId = Number((session.user as any).organizationId);
    const role = session.user.role;

    try {
        const body = await request.json();
        const { id, ...data } = body;
        if (!id) return NextResponse.json({ message: "ID é obrigatório" }, { status: 400 });

        const updated = await demandasTiposService.updateTipo(id, data, orgId, role);
        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ message: String(error) }, { status: 400 });
    }
}

// Deletar Tipo
export async function DELETE(request: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const orgId = Number((session.user as any).organizationId);
    const role = session.user.role;
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    if (!id) return NextResponse.json({ message: "ID é obrigatório" }, { status: 400 });

    try {
        await demandasTiposService.deleteTipo(id, orgId, role);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ message: String(error) }, { status: 400 });
    }
}
