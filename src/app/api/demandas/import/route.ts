// src/app/api/demandas/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../lib/db"; // Ajuste o caminho
import * as XLSX from "xlsx"; // Importa a biblioteca para ler planilhas

// --- Funções Auxiliares (mantidas e adaptadas) ---

// **IMPORTANTE**: Substitua esta simulação pela sua lógica real de geocodificação
async function geocodeAddress(
  req: NextRequest, // <-- O nome do parâmetro é 'req'
  logradouro?: string | null,
  numero?: string | null,
  cidade?: string | null,
  uf?: string | null
): Promise<[number, number] | null> {
  const addressString = [numero, logradouro, cidade, uf]
    .filter(Boolean)
    .join(", "); // Constrói endereço para log
  console.log(`[IMPORT API - FILE] Geocoding attempt: ${addressString}`);
  if (logradouro && numero && cidade && uf) {
    try {
      // Tenta obter a URL base da requisição original para chamadas internas
      // NOTA: Em Route Handlers, 'request.url' pode ser a URL completa da API.
      // Construir a URL absoluta pode ser mais seguro. Verifique a documentação do Next.js para a melhor abordagem.
      // Para simplicidade, vamos assumir que está no mesmo host/porta por enquanto.
      // Em produção, considere usar uma URL absoluta ou variável de ambiente.
      const apiBaseUrl = new URL(req.url).origin; // Tenta obter a base da URL da requisição
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
        const [lat, lon] = data.coordinates; // Assume que a API retorna [lat, lon]
        console.log(
          `[IMPORT API - FILE] Geocoding success: Lat=${lat}, Lon=${lon}`
        );
        return [lon, lat]; // Retorna [longitude, latitude] para o banco
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
  return null; // Retorna null se falhar ou dados insuficientes
}

async function getStatusId(nomeStatus: string): Promise<number | null> {
  try {
    const result = await pool.query(
      "SELECT id FROM demandas_status WHERE nome ILIKE $1 LIMIT 1",
      [nomeStatus]
    ); // Usar ILIKE para case-insensitive
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
    ); // Usar ILIKE
    return (result.rowCount ?? 0) > 0;
  } catch (err) {
    console.error(`Erro ao verificar tipo de demanda "${nomeTipo}":`, err);
    return false;
  }
}

// Função para parsear data (mantida)
function parseDate(dateInput: unknown): Date | null {
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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "Nenhum arquivo enviado." },
        { status: 400 }
      );
    }

    console.log(
      `[IMPORT API - FILE] Processando arquivo: ${file.name}, Tamanho: ${file.size}, Tipo: ${file.type}`
    );

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(
      worksheet,
      { raw: false, defval: "" }
    );

    console.log(
      `[IMPORT API - FILE] Encontradas ${jsonData.length} linhas de dados no arquivo.`
    );

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
        // --- Validação CORRIGIDA ---
        // *** USA AS CHAVES COM ASTERISCO conforme o erro indicou ***
        const nome_solicitante =
          rowData["nome_solicitante*"]?.toString().trim() ?? "";
        const cepRaw = rowData["cep*"]?.toString().replace(/\D/g, "") ?? "";
        const numero = rowData["numero*"]?.toString().trim() ?? "";
        // Assumindo que tipo_demanda e descricao também podem ter asterisco (verifique sua planilha)
        const tipo_demanda = rowData["tipo_demanda*"]?.toString().trim() ?? "";
        const descricao = rowData["descricao*"]?.toString().trim() ?? "";

        // Validações usando as variáveis corrigidas
        if (!nome_solicitante)
          throw new Error('Coluna "nome_solicitante*" é obrigatória.');
        if (!cepRaw || cepRaw.length !== 8)
          throw new Error(
            `Coluna "cep*" (${
              rowData["cep*"] ?? ""
            }) obrigatória e deve ter 8 dígitos numéricos.`
          );
        if (!numero) throw new Error('Coluna "numero*" é obrigatória.');
        if (!tipo_demanda)
          throw new Error('Coluna "tipo_demanda*" é obrigatória.'); // Assumindo asterisco
        if (!descricao) throw new Error('Coluna "descricao*" é obrigatória.'); // Assumindo asterisco

        const tipoExists = await checkTipoDemandaExists(tipo_demanda);
        if (!tipoExists) {
          throw new Error(
            `Tipo de demanda "${tipo_demanda}" não encontrado no sistema. Por favor, cadastre-o primeiro.`
          );
        }

        // --- Processamento ---
        const protocolo = `DEM-UPL-${Date.now()}-${i}`;

        // Acessa colunas OPCIONAIS sem asterisco (ajuste se necessário)
        let logradouro = rowData["logradouro"]?.toString().trim() ?? "";
        let bairro = rowData["bairro"]?.toString().trim() ?? "";
        let cidade = rowData["cidade"]?.toString().trim() ?? "";
        let uf = rowData["uf"]?.toString().trim() ?? "";
        const telefone_solicitante =
          rowData["telefone_solicitante"]?.toString() || null;
        const email_solicitante =
          rowData["email_solicitante"]?.toString() || null;
        const complemento = rowData["complemento"]?.toString() || null;

        // Busca ViaCEP (sem alterações)
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
                console.log(
                  `[IMPORT API - FILE] Linha ${rowNumberInSheet}: Endereço encontrado via CEP.`
                );
              } else {
                console.warn(
                  `[IMPORT API - FILE] Linha ${rowNumberInSheet}: ViaCEP retornou erro para CEP ${cepRaw}.`
                );
              }
            } else {
              console.warn(
                `[IMPORT API - FILE] Linha ${rowNumberInSheet}: Falha ao buscar ViaCEP (${cepResponse.status}).`
              );
            }
          } catch (cepErr) {
            console.warn(
              `[IMPORT API - FILE] Linha ${rowNumberInSheet}: Erro na requisição ViaCEP: ${cepErr}`
            );
          }
        }

        // Geocodificação (sem alterações na chamada, mas a função foi ajustada acima)
        const coordinates = await geocodeAddress(
          request,
          logradouro,
          numero,
          cidade,
          uf
        );

        // Prazo (sem alterações)
        const prazoDate = parseDate(rowData["prazo"]); // Usa a coluna 'prazo' (sem asterisco, ajuste se necessário)

        // --- Inserção no Banco ---
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
                    RETURNING id;`; // Ajusta o índice do placeholder do prazo

        const queryParams = [
          protocolo,
          nome_solicitante,
          telefone_solicitante,
          email_solicitante,
          cepRaw,
          logradouro || null,
          numero,
          complemento,
          bairro || null,
          cidade || null,
          uf ? uf.toUpperCase() : null,
          tipo_demanda,
          descricao,
          pendenteStatusId,
          // Adiciona coordenadas condicionalmente
          ...(coordinates ? [coordinates[0], coordinates[1]] : []), // Longitude, Latitude
          prazoDate, // Prazo (será colocado na posição correta pelo ajuste de índice)
        ];
        // A linha abaixo para ajustar o índice do prazo não é mais necessária
        // pois o placeholder já foi ajustado na string da queryText.

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
