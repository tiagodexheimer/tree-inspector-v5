import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { demandasService } from "@/services/demandas-service";

// --- GET: LISTAR DEMANDAS ---
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  
  // Extração de Parâmetros
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const filtro = searchParams.get("filtro") || undefined;
  
  // Filtros de Array (Status e Tipos)
  // Espera formato "1,2,3" na URL
  const statusIdsRaw = searchParams.get("statusIds");
  const statusIds = statusIdsRaw ? statusIdsRaw.split(',').map(Number).filter(n => !isNaN(n)) : undefined;
  
  const tipoNomesRaw = searchParams.get("tipoNomes");
  const tipoNomes = tipoNomesRaw ? tipoNomesRaw.split(',').filter(Boolean) : undefined;

  try {
    const result = await demandasService.listDemandas({
        page,
        limit,
        filtro,
        statusIds,
        tipoNomes
    }, session.user.role);

    return NextResponse.json({
        demandas: result.demandas,
        totalCount: result.totalCount,
        page,
        limit
    }, { status: 200 });

  } catch (error) {
    console.error("[API GET Demandas]", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ message: "Erro ao buscar demandas", error: message }, { status: 500 });
  }
}

// --- POST: CRIAR DEMANDA ---
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Delega para o serviço
    const novaDemanda = await demandasService.createDemanda(body);

    return NextResponse.json({
        message: "Demanda registrada com sucesso!",
        protocolo: novaDemanda.protocolo,
        demanda: novaDemanda
    }, { status: 201 });

  } catch (error) {
    console.error("[API POST Demanda]", error);
    
    let status = 500;
    let message = "Erro interno ao criar demanda.";

    if (error instanceof Error) {
        message = error.message;
        if (message.includes("obrigatórios")) status = 400;
        // Tratamento para erro de protocolo duplicado (raro com timestamp, mas possível)
        if ((error as any).code === "23505") {
            status = 409; 
            message = "Erro: Protocolo duplicado.";
        }
    }

    return NextResponse.json({ message, error: message }, { status });
  }
}