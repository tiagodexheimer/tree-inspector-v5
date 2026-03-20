// src/app/api/demandas/parse-pdf-debug/route.ts
// Temporary route to dump raw PDF text for analysis
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
// @ts-ignore
import pdf from 'pdf-parse/lib/pdf-parse';

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

        const buffer = Buffer.from(await file.arrayBuffer());
        const data = await pdf(buffer);

        return NextResponse.json({ rawText: data.text });
    } catch (error) {
        console.error("[API Parse PDF Debug] Erro:", error);
        return NextResponse.json({ message: "Erro ao processar PDF." }, { status: 500 });
    }
}
