import { NextRequest, NextResponse } from "next/server";
import { demandasService } from "@/services/demandas-service";

export async function POST(request: NextRequest) {
  // O frontend envia um objeto com os dados da linha processada + coordinates
  const rowData: Record<string, unknown> = await request.json();
  
  // Usado apenas para log de erro, se houver
  const rowNumberForLog = rowData["__rowNum__"] || "??";

  try {
    // 1. Mapeamento: Converter chaves da planilha (Português) para o DTO do Serviço
    // O frontend já nos envia 'cep_raw' limpo e 'coordinates' se encontrou.
    const createInput = {
      nome_solicitante: rowData["Nome do Solicitante"]?.toString().trim() ?? "",
      telefone_solicitante: rowData["Telefone do Solicitante"]?.toString() || null,
      email_solicitante: rowData["E-mail do Solicitante"]?.toString() || null,
      
      cep: rowData["cep_raw"]?.toString() ?? "",
      logradouro: rowData["Rua"]?.toString().trim() || null,
      numero: rowData["Número"]?.toString().trim() ?? "",
      complemento: rowData["Complemento"]?.toString() || null,
      bairro: rowData["Bairro"]?.toString().trim() || null,
      cidade: rowData["Cidade"]?.toString().trim() || null,
      uf: rowData["uf"]?.toString().trim() || null,
      
      tipo_demanda: rowData["tipo_demanda"]?.toString().trim() ?? "Avaliação",
      descricao: rowData["Descrição"]?.toString().trim() ?? "",
      
      // O frontend manda a data (se houver) como string ISO ou similar
      prazo: rowData["prazo"]?.toString() || null,
      
      // Coordenadas já processadas no front: [lat, lng]
      coordinates: (rowData["coordinates"] as [number, number] | null) || null
    };

    // 2. Delegação para o Serviço
    // Isso garante que todas as regras (status pendente, geração de protocolo, etc.) sejam aplicadas
    const novaDemanda = await demandasService.createDemanda(createInput);

    return NextResponse.json({ 
      success: true, 
      id: novaDemanda.id,
      protocolo: novaDemanda.protocolo 
    }, { status: 201 });

  } catch (error) {
    console.error(`[API /import-row] Erro na linha ${rowNumberForLog}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido.";
    
    // Retornamos 400 para que o frontend registre como erro nesta linha específica
    return NextResponse.json(
      { success: false, message: errorMessage, data: rowData },
      { status: 400 } 
    );
  }
}