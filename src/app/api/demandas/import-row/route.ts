// src/app/api/demandas/import-row/route.ts

import { NextRequest, NextResponse } from "next/server";
import { demandasService } from "@/services/demandas-service";
import { auth } from "@/auth"; // [FIX 1] Importar auth
import { UserRole } from "@/types/auth-types"; // [FIX 2] Importar UserRole

export const dynamic = 'force-dynamic';

// Helper de Segurança Multi-tenant (Padrão)
async function getAuthContext(request: NextRequest) {
    const session = await auth();
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


export async function POST(request: NextRequest) {
  // O frontend envia um objeto com os dados da linha processada + coordinates
  const rowData: Record<string, unknown> = await request.json();
  
  // Usado apenas para log de erro, se houver
  const rowNumberForLog = rowData["__rowNum__"] || "??";

  try {
    // 1. Obtém contexto de segurança
    const { organizationId, userRole } = await getAuthContext(request);

    // 2. Mapeamento: Converter chaves da planilha (Português) para o DTO do Serviço
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
      
      // Assumindo que a chave de importação é 'Tipo de Demanda'
      tipo_demanda: rowData["Tipo de Demanda"]?.toString().trim() ?? "Avaliação", 
      descricao: rowData["Descrição"]?.toString().trim() ?? "",
      
      // O frontend manda a data (se houver) como string ISO ou similar
      prazo: rowData["prazo"]?.toString() || null,
      
      // Coordenadas já processadas no front: [lat, lng]
      coordinates: (rowData["coordinates"] as [number, number] | null) || null
    };

    // 3. [FIX CRÍTICO] Chama o Serviço com os 3 argumentos exigidos
    const novaDemanda = await demandasService.createDemanda(
        createInput,
        organizationId,
        userRole
    );

    return NextResponse.json({ 
      success: true, 
      id: novaDemanda.id,
      protocolo: novaDemanda.protocolo 
    }, { status: 201 });

  } catch (error: any) {
    console.error(`[API /import-row] Erro na linha ${rowNumberForLog}:`, error);
    
    // Tratamento de Erro de Permissão
    if (error.message.includes("Não autenticado")) {
         return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }
    if (error.message.includes("Sessão inválida")) {
         return NextResponse.json({ success: false, message: "Acesso Proibido" }, { status: 403 });
    }
    
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido.";
    
    // Retornamos 400 para que o frontend registre como erro nesta linha específica
    return NextResponse.json(
      { success: false, message: errorMessage, data: rowData },
      { status: 400 } 
    );
  }
}