
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { statusService } from "@/services/status-service";

// Listar Status (Pro/Premium verá os customizados se ativado)
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const orgId = Number((session.user as any).organizationId);
    const role = session.user.role;

    try {
        // O service já cuida da lógica de exibir Custom vs Global baseado na flag
        const data = await statusService.listStatus(orgId, role);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ message: String(error) }, { status: 500 });
    }
}

// Criar Status (Pro Only)
export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const orgId = Number((session.user as any).organizationId);
    const role = session.user.role;

    try {
        const body = await request.json();
        const created = await statusService.createStatus(body, orgId, role);
        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: String(error) }, { status: 400 });
    }
}

// Atualizar Status (Pro Only)
export async function PUT(request: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const orgId = Number((session.user as any).organizationId);
    const role = session.user.role;

    try {
        const body = await request.json();
        const { id, ...data } = body;
        if (!id) return NextResponse.json({ message: "ID é obrigatório" }, { status: 400 });

        const updated = await statusService.updateStatus(id, data, orgId, role);
        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ message: String(error) }, { status: 400 });
    }
}

// Deletar Status (Pro Only)
export async function DELETE(request: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const orgId = Number((session.user as any).organizationId);
    const role = session.user.role;
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    if (!id) return NextResponse.json({ message: "ID é obrigatório" }, { status: 400 });

    try {
        await statusService.deleteStatus(id, orgId, role);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ message: String(error) }, { status: 400 });
    }
}
