// src/app/api/demandas/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../lib/db"; // Ajuste o caminho
import * as XLSX from "xlsx"; // Importa a biblioteca para ler planilhas

// --- (Funções auxiliares geocodeAddress, getStatusId, etc. permanecem iguais) ---
async function geocodeAddress(
  req: NextRequest,
  logradouro?: string | null,
  numero?: string | null,
  cidade?: string | null,
  uf?: string | null
): Promise<[number, number] | null> {
    // ... (código da função geocodeAddress) ...
  const addressString = [numero, logradouro, cidade, uf]
    .filter(Boolean)
    .join(", "); 
  console.log(`[IMPORT API - FILE] Geocoding attempt: ${addressString}`);
  if (logradouro && numero && cidade && uf) {
    try {
      const apiBaseUrl = new URL(req.url).origin; 
      const geocodeUrl = `${apiBaseUrl}/api/geocode`;

      console.log(
        `[IMPORT API - FILE] Calling internal geocode API: ${geocodeUrl}`
      );
      const response = await fetch(geocodeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logradouro, numero, cidade, uf }),
      });
      const data = await response.json();
      if (response.ok && data.coordinates) {
        const [lat, lon] = data.coordinates; 
        console.log(
          `[IMPORT API - FILE] Geocoding success: Lat=${lat}, Lon=${lon}`
        );
        return [lon, lat]; 
      } else {
        console.warn(
          `[IMPORT API - FILE] Geocoding failed: ${
            data.message || "API interna não retornou coordenadas."
          }`
        );
      }
    } catch (geoErr) {
      console.error(`[IMPORT API - FILE] Error calling geocode API:`, geoErr);
    }
  } else {
    console.warn(
      "[IMPORT API - FILE] Geocoding skipped: Dados de endereço insuficientes."
    );
  }
  return null; 
}

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
  // ... (código da função parseDate) ...
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
    } catch (e) {
      console.warn("Erro ao parsear data string:", dateString, e);
    }
  }
  if (typeof dateInput === "number") {
    console.warn(
      "Tratamento de data numérica (Excel S/N) não implementado:",
      dateInput
    );
    return null;
  }
  return null;
}
// ... 

// --- Handler POST Atualizado ---
export async function POST(request: NextRequest) {
  console.log("[API /demandas/import-file] Recebido POST.");
  let successCount = 0;
  const errors: {
    row: number;
    message: string;
    data: Record<string, unknown>;
  }[] = [];

  try {
    // ... (código de leitura do arquivo) ...
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ message: "Nenhum arquivo enviado." }, { status: 400 });
    }
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
      worksheet,
      { raw: false, defval: null } 
    );
    // ... (fim da leitura) ...

    const pendenteStatusId = await getStatusId("Pendente");
    if (!pendenteStatusId) {
      console.warn(
        '[IMPORT API - FILE] Status "Pendente" não encontrado no banco. Novas demandas terão id_status NULL.'
      );
    }

    for (let i = 0; i < jsonData.length; i++) {
      const rowData: Record<string, unknown> = jsonData[i];
      const rowNumberInSheet = i + 2; 

      try {
        // Leitura dos campos (usando os nomes do CSV)
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
        
        // Se a coluna 'tipo_demanda' não existir, usa 'Avaliação'.
        const tipo_demanda_csv = rowData["tipo_demanda"]?.toString().trim() ?? null;
        const tipo_demanda = tipo_demanda_csv || "Avaliação"; 

        // Validações OBRIGATÓRIAS
        if (!cepRaw || cepRaw.length !== 8)
          throw new Error(
            `Coluna "cep" (${
              cepOriginal
            }) obrigatória e deve ter 8 dígitos numéricos.`
          );
        if (!numero) throw new Error('Coluna "Número" é obrigatória.');
        if (!descricao) throw new Error('Coluna "Descrição" é obrigatória.');
        
        // Validação do Tipo
        const tipoExists = await checkTipoDemandaExists(tipo_demanda);
        if (!tipoExists) {
          throw new Error(
            `Tipo de demanda "${tipo_demanda}" (da coluna 'tipo_demanda' ou padrão 'Avaliação') não encontrado no sistema. Por favor, cadastre-o primeiro.`
          );
        }

        // --- Processamento ---
        const protocolo = `DEM-UPL-${Date.now()}-${i}`;
        const complemento = rowData["Complemento"]?.toString() || null; 
        
        // Busca ViaCEP (se necessário)
        if (!logradouro || !bairro || !cidade || !uf) {
          console.log(
            `[IMPORT API - FILE] Linha ${rowNumberInSheet}: Buscando endereço via CEP ${cepRaw}...`
          );
          try {
            const cepResponse = await fetch(
              `https://viacep.com.br/ws/${cepRaw}/json/`
            );
            if (cepResponse.ok) {
              const cepData = await cepResponse.json();
              if (!cepData.erro) {
                logradouro = logradouro || cepData.logradouro;
                bairro = bairro || cepData.bairro;
                cidade = cidade || cepData.localidade;
                uf = uf || cepData.uf;
              } else {
                 console.warn(
                  `[IMPORT API - FILE] Linha ${rowNumberInSheet}: ViaCEP retornou erro para CEP ${cepRaw}.`
                );
              }
            }
          } catch (cepErr) {
            console.warn(
              `[IMPORT API - FILE] Linha ${rowNumberInSheet}: Erro na requisição ViaCEP: ${cepErr}`
            );
          }
        }

        const coordinates = await geocodeAddress(
          request,
          logradouro,
          numero,
          cidade,
          uf
        );
        const prazoDate = parseDate(rowData["prazo"]); 
        const queryText = `
                    INSERT INTO demandas (
                        protocolo, nome_solicitante, telefone_solicitante, email_solicitante,
                        cep, logradouro, numero, complemento, bairro, cidade, uf,
                        tipo_demanda, descricao, id_status, geom, prazo
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, ${
                      coordinates
                        ? "ST_SetSRID(ST_MakePoint($15, $16), 4326)"
                        : "NULL"
                    }, $${coordinates ? 17 : 15})
                    RETURNING id;`;

        // ***** INÍCIO DA CORREÇÃO *****
        const queryParams = [
          protocolo, // $1
          nome_solicitante, // $2 (Envia "" em vez de null)
          telefone_solicitante, // $3
          email_solicitante, // $4
          cepRaw, // $5
          logradouro || null, // $6
          numero, // $7
          complemento, // $8
          bairro || null, // $9
          cidade || null, // $10
          uf ? uf.toUpperCase() : null, // $11
          tipo_demanda, // $12
          descricao, // $13
          pendenteStatusId, // $14
          ...(coordinates ? [coordinates[0], coordinates[1]] : []), // $15, $16
          prazoDate, // $17
        ];
        // ***** FIM DA CORREÇÃO *****
        
        console.log(
          `[IMPORT API - FILE] Inserindo linha ${rowNumberInSheet} no banco...`
        );
        const result = await pool.query(queryText, queryParams);

        if ((result.rowCount ?? 0) > 0) {
          successCount++;
        } else {
          throw new Error(
            "Falha ao inserir no banco de dados (query não retornou linha)."
          );
        }
      } catch (rowError) {
        console.error(
          `[IMPORT API - FILE] Erro na linha ${rowNumberInSheet} do arquivo:`,
          rowError
        );
        errors.push({
          row: rowNumberInSheet,
          message:
            rowError instanceof Error
              ? rowError.message
              : "Erro desconhecido ao processar linha.",
          data: rowData,
        });
      }
    } // Fim do loop for

    console.log(
      `[IMPORT API - FILE] Importação de arquivo concluída. Sucesso: ${successCount}, Erros: ${errors.length}`
    );
    return NextResponse.json({ successCount, errors }, { status: 200 });
  } catch (error) {
    console.error(
      "[API /demandas/import-file] Erro geral na importação do arquivo:",
      error
    );
    let message = "Erro interno do servidor ao processar o arquivo.";
    if (error instanceof Error) {
      message = error.message;
    }
    return NextResponse.json(
      { message, successCount, errors },
      { status: 500 }
    );
  }
}