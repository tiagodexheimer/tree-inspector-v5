// src/app/api/demandas/import-row/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../lib/db";

// --- Funções Auxiliares (Simplificadas ou Removidas) ---

// Esta função de geocodificação foi movida para o frontend.
// Aqui, apenas mantemos as funções de apoio ao banco.

async function getStatusId(nomeStatus: string): Promise<number | null> {
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
  if (!dateInput) return null;
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    // Preservar data como UTC
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

// --- Handler POST para UMA LINHA PROCESSADA ---
export async function POST(request: NextRequest) {
  // Esperamos que o frontend nos envie dados JÁ processados, incluindo coordinates
  const rowData: Record<string, unknown> = await request.json();
  const rowNumberForLog = rowData["__rowNum__"] || "??"; 

  try {
    // 1. Extrair dados
    const nome_solicitante = rowData["Nome do Solicitante"]?.toString().trim() ?? "";
    const telefone_solicitante = rowData["Telefone do Solicitante"]?.toString() || null;
    const email_solicitante = rowData["E-mail do Solicitante"]?.toString() || null;
    const logradouro = rowData["Rua"]?.toString().trim() || null;
    const bairro = rowData["Bairro"]?.toString().trim() || null;
    const cidade = rowData["Cidade"]?.toString().trim() || null;
    const uf = rowData["uf"]?.toString().trim() || null;
    const cepRaw = rowData["cep_raw"]?.toString() ?? ""; // Esperamos o CEP limpo
    const numero = rowData["Número"]?.toString().trim() ?? "";
    const descricao = rowData["Descrição"]?.toString().trim() ?? "";
    const complemento = rowData["Complemento"]?.toString() || null;
    
    // Coordenadas que VIERAM do frontend
    const coordinates = rowData["coordinates"] as [number, number] | null; // [lat, lng]

    const tipo_demanda = rowData["tipo_demanda"]?.toString().trim() ?? "Avaliação"; 

    // 2. Validações finais (já assumindo que ViaCEP e Geocodificação foram feitos no frontend)
    if (!cepRaw || cepRaw.length !== 8) throw new Error(`CEP (${cepRaw}) obrigatório e deve ter 8 dígitos.`);
    if (!numero) throw new Error('Coluna "Número" é obrigatória.');
    if (!descricao) throw new Error('Coluna "Descrição" é obrigatória.');

    // 3. Checagem do Tipo de Demanda (Ainda necessária no backend)
    const tipoExists = await checkTipoDemandaExists(tipo_demanda);
    if (!tipoExists) throw new Error(`Tipo de demanda "${tipo_demanda}" não encontrado. Cadastre-o primeiro.`);

    // 4. Buscar ID do status "Pendente"
    const pendenteStatusId = await getStatusId("Pendente");
    if (!pendenteStatusId) {
        console.warn('[API /import-row] Status "Pendente" não encontrado no banco.');
    }

    // 5. Inserção no Banco
    const prazoDate = parseDate(rowData["prazo"]);

    // ST_MakePoint espera (longitude, latitude). O Google API retorna (latitude, longitude).
    // O frontend envia [lat, lng], então usamos $16, $15 (lng, lat) no ST_MakePoint.
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
      `DEM-UPL-${Date.now()}-${rowNumberForLog}`, // Protocolo gerado aqui
      nome_solicitante, telefone_solicitante, email_solicitante,
      cepRaw, logradouro, numero, complemento, bairro, cidade,
      uf ? uf.toUpperCase() : null, tipo_demanda, descricao, pendenteStatusId,
      // Se coordinates existe, adiciona Longitude e Latitude
      ...(coordinates ? [coordinates[1], coordinates[0]] : []), // [lng, lat]
      prazoDate,
    ];
    
    // Corrige o índice do prazo se não houver coordenadas
    if (!coordinates) {
        queryParams.splice(14, 0, prazoDate);
    }
    
    // A queryParams final contém [..., id_status, (lng, lat), prazo] ou [..., id_status, prazo]

    const result = await pool.query(queryText, queryParams);

    if ((result.rowCount ?? 0) > 0) {
      return NextResponse.json({ success: true, id: result.rows[0].id }, { status: 201 });
    } else {
      throw new Error("Falha ao inserir no banco (query não retornou linha).");
    }

  } catch (error) {
    console.error(`[API /import-row] Erro ao processar linha ${rowNumberForLog}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido.";
    return NextResponse.json(
      { success: false, message: errorMessage, data: rowData },
      { status: 400 } 
    );
  }
}