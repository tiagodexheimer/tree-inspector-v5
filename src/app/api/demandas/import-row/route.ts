// src/app/api/demandas/import-row/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../lib/db";

// --- (As funções auxiliares podem ser movidas para um arquivo 'lib' ou duplicadas) ---

async function geocodeAddress(
  req: NextRequest,
  logradouro?: string | null,
  numero?: string | null,
  cidade?: string | null,
  uf?: string | null
): Promise<[number, number] | null> {
    // ... (código da função geocodeAddress - copiado da sua API 'import') ...
  if (logradouro && numero && cidade && uf) {
    try {
      const apiBaseUrl = new URL(req.url).origin; 
      const geocodeUrl = `${apiBaseUrl}/api/geocode`;
      const response = await fetch(geocodeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logradouro, numero, cidade, uf }),
      });
      const data = await response.json();
      if (response.ok && data.coordinates) {
        const [lat, lon] = data.coordinates; 
        return [lon, lat]; 
      }
    } catch (geoErr) {
      console.error(`[API /import-row] Error calling geocode API:`, geoErr);
    }
  }
  return null; 
}

async function getStatusId(nomeStatus: string): Promise<number | null> {
    // ... (código da função getStatusId - copiado da sua API 'import') ...
  try {
    const result = await pool.query(
      "SELECT id FROM demandas_status WHERE nome ILIKE $1 LIMIT 1",
      [nomeStatus]
    ); 
    return (result.rowCount ?? 0) > 0 ? result.rows[0].id : null;
  } catch (err) {
    console.error(`Erro ao buscar ID do status "${nomeStatus}":`, err);
    return null;
  }
}

async function checkTipoDemandaExists(nomeTipo: string): Promise<boolean> {
    // ... (código da função checkTipoDemandaExists - copiado da sua API 'import') ...
  try {
    const result = await pool.query(
      "SELECT 1 FROM demandas_tipos WHERE nome ILIKE $1 LIMIT 1",
      [nomeTipo]
    ); 
    return (result.rowCount ?? 0) > 0;
  } catch (err) {
    console.error(`Erro ao verificar tipo de demanda "${nomeTipo}":`, err);
    return false;
  }
}

function parseDate(dateInput: unknown): Date | null {
    // ... (código da função parseDate - copiado da sua API 'import') ...
  if (!dateInput) return null;
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return new Date(
      Date.UTC(
        dateInput.getFullYear(),
        dateInput.getMonth(),
        dateInput.getDate()
      )
    );
  }
  if (typeof dateInput === "string") {
    const dateString = dateInput.trim();
    try {
      let date: Date | null = null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        date = new Date(dateString + "T00:00:00Z");
      } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        const parts = dateString.split("/");
        date = new Date(
          Date.UTC(
            parseInt(parts[2], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[0], 10)
          )
        );
      }
      if (date && !isNaN(date.getTime())) {
        return date;
      }
    } catch {}
  }
  return null;
}
// --- Fim das Funções Auxiliares ---


// --- Handler POST para UMA LINHA ---
export async function POST(request: NextRequest) {
  const rowData: Record<string, unknown> = await request.json();
  const rowNumberForLog = rowData["__rowNum__"] || "??"; // O frontend enviará isso

  try {
    // 1. Validar e extrair dados (lógica de 'import/route.ts')
    const nome_solicitante = rowData["Nome do Solicitante"]?.toString().trim() ?? "";
    const telefone_solicitante = rowData["Telefone do Solicitante"]?.toString() || null;
    const email_solicitante = rowData["E-mail do Solicitante"]?.toString() || null;
    let logradouro = rowData["Rua"]?.toString().trim() ?? "";
    let bairro = rowData["Bairro"]?.toString().trim() ?? "";
    let cidade = rowData["Cidade"]?.toString().trim() ?? "";
    let uf = rowData["uf"]?.toString().trim() ?? null;
    
    const cepOriginal = rowData["cep"]?.toString() ?? ""; 
    const cepRaw = cepOriginal.trim().replace(/\D/g, "");
    
    const numero = rowData["Número"]?.toString().trim() ?? ""; 
    const descricao = rowData["Descrição"]?.toString().trim() ?? ""; 
    
    const tipo_demanda_csv = rowData["tipo_demanda"]?.toString().trim() ?? null;
    const tipo_demanda = tipo_demanda_csv || "Avaliação"; // Padrão

    if (!cepRaw || cepRaw.length !== 8) throw new Error(`Coluna "cep" (${cepOriginal}) obrigatória e deve ter 8 dígitos.`);
    if (!numero) throw new Error('Coluna "Número" é obrigatória.');
    if (!descricao) throw new Error('Coluna "Descrição" é obrigatória.');

    const tipoExists = await checkTipoDemandaExists(tipo_demanda);
    if (!tipoExists) throw new Error(`Tipo de demanda "${tipo_demanda}" não encontrado. Cadastre-o primeiro.`);

    // 2. Processamento (lógica de 'import/route.ts')
    const protocolo = `DEM-UPL-${Date.now()}-${rowNumberForLog}`;
    const complemento = rowData["Complemento"]?.toString() || null; 
    
    const pendenteStatusId = await getStatusId("Pendente");
    if (!pendenteStatusId) {
        console.warn('[API /import-row] Status "Pendente" não encontrado no banco.');
    }

    // 3. ViaCEP (se necessário)
    if (!logradouro || !bairro || !cidade || !uf) {
      try {
        const cepResponse = await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`);
        if (cepResponse.ok) {
          const cepData = await cepResponse.json();
          if (!cepData.erro) {
            logradouro = logradouro || cepData.logradouro;
            bairro = bairro || cepData.bairro;
            cidade = cidade || cepData.localidade;
            uf = uf || cepData.uf;
          }
        }
      } catch (cepErr) {
        console.warn(`[API /import-row] Falha no ViaCEP para ${cepRaw}:`, cepErr);
      }
    }

    // 4. Geocodificação
    const coordinates = await geocodeAddress(request, logradouro, numero, cidade, uf);

    // 5. Inserção no Banco
    const prazoDate = parseDate(rowData["prazo"]); 
    const queryText = `
        INSERT INTO demandas (
            protocolo, nome_solicitante, telefone_solicitante, email_solicitante,
            cep, logradouro, numero, complemento, bairro, cidade, uf,
            tipo_demanda, descricao, id_status, geom, prazo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, ${
          coordinates ? "ST_SetSRID(ST_MakePoint($15, $16), 4326)" : "NULL"
        }, $${coordinates ? 17 : 15})
        RETURNING id;`;
    const queryParams = [
      protocolo, nome_solicitante, telefone_solicitante, email_solicitante,
      cepRaw, logradouro || null, numero, complemento, bairro || null, cidade || null,
      uf ? uf.toUpperCase() : null, tipo_demanda, descricao, pendenteStatusId,
      ...(coordinates ? [coordinates[0], coordinates[1]] : []), 
      prazoDate, 
    ];
    
    const result = await pool.query(queryText, queryParams);

    if ((result.rowCount ?? 0) > 0) {
      // Sucesso!
      return NextResponse.json({ success: true, id: result.rows[0].id }, { status: 201 });
    } else {
      throw new Error("Falha ao inserir no banco (query não retornou linha).");
    }

  } catch (error) {
    // Erro!
    console.error(`[API /import-row] Erro ao processar linha ${rowNumberForLog}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido.";
    return NextResponse.json(
      { success: false, message: errorMessage, data: rowData },
      { status: 400 } // Retorna 400 (Bad Request) para erros de processamento de linha
    );
  }
}