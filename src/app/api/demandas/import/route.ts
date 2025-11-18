import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { demandasService } from "@/services/demandas-service";

export async function POST(request: NextRequest) {
  console.log("[API /demandas/import] Recebido POST.");

  try {
    // 1. Ler arquivo do FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ message: "Nenhum arquivo enviado." }, { status: 400 });
    }

    // 2. Converter Excel para JSON
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Defval: null garante que células vazias não sejam undefined
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: null });

    // 3. Delegar processamento para o Serviço
    const result = await demandasService.importBatch(jsonData);

    console.log(`[API] Importação concluída. Sucesso: ${result.successCount}, Erros: ${result.errors.length}`);
    
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("[API /demandas/import] Erro:", error);
    const message = error instanceof Error ? error.message : "Erro interno ao processar arquivo.";
    return NextResponse.json({ message }, { status: 500 });
  }
}