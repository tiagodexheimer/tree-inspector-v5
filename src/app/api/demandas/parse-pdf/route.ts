// src/app/api/demandas/parse-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { DemandasParser } from "@/services/demandas-parser";

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session || !session.user) {
        return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ message: "Nenhum arquivo enviado" }, { status: 400 });
        }

        // Validação básica de tipo
        if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
            return NextResponse.json({ message: "O arquivo deve ser um PDF" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const data = await DemandasParser.parsePdf(buffer);

        return NextResponse.json(data);
    } catch (error) {
        console.error("[API Parse PDF] Erro:", error);
        return NextResponse.json(
            { message: "Erro ao processar PDF. Verifique se o arquivo é válido." },
            { status: 500 }
        );
    }
}
