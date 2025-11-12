// src/app/demandas/importar/page.tsx
'use client';

import React, { useState, ChangeEvent } from 'react';
import {
    Box, Button, Typography, CircularProgress, Alert,
    List, ListItem, ListItemText, Paper,
    LinearProgress
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import * as XLSX from "xlsx";
// Importações de utilitários de terceiros seriam feitas aqui
// import pLimit from 'p-limit'; // Se estivesse instalado

// --- Interfaces Auxiliares ---
interface RowError {
    row: number;
    message: string;
    data: unknown;
}
interface CepResponse {
    logradouro: string; bairro: string; localidade: string; uf: string; erro?: boolean;
}
interface GeocodeApiResponse {
    coordinates?: [number, number]; // [lat, lng]
    message?: string;
    error?: string;
}
interface ProcessedRow extends Record<string, unknown> {
    "cep_raw"?: string;
    "coordinates"?: [number, number] | null;
    "__rowNum__"?: number;
}
// ----------------------------


// --- FUNÇÕES DE LÓGICA MOVIDAS PARA O FRONTEND ---

// Função de Geocodificação (usando o endpoint interno)
async function geocodeAddressViaBackend(logradouro?: string | null, numero?: string | null, cidade?: string | null, uf?: string | null): Promise<[number, number] | null> {
    if (!logradouro || !numero || !cidade || !uf) {
        throw new Error('Dados de endereço insuficientes para geocodificação.');
    }
    try {
        const response = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logradouro, numero, cidade, uf }),
        });
        const data: GeocodeApiResponse = await response.json(); 
        if (!response.ok) { throw new Error(data.message || data.error || `Erro ${response.status} ao chamar API interna.`); }
        if (data.coordinates) {
            return data.coordinates; 
        } else {
            throw new Error(data.message || 'Endereço não localizado pela API.');
        }
    } catch (error) {
        console.error('[FRONTEND /geocode] Erro ao chamar backend:', error);
        throw error;
    }
}

// Função de Busca ViaCEP (simples fetch)
async function fetchViaCep(cep: string): Promise<CepResponse> {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) throw new Error('Falha na requisição ao ViaCEP.');
    const data: CepResponse = await response.json();
    if (data.erro) throw new Error('CEP não encontrado.');
    return data;
}

// --- FIM FUNÇÕES DE LÓGICA ---


export default function ImportarDemandasPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const [importStatus, setImportStatus] = useState<string>('');
    const [progress, setProgress] = useState<number>(0);
    const [rowErrors, setRowErrors] = useState<RowError[]>([]);
    const [successCount, setSuccessCount] = useState<number>(0);
    
    const [apiError, setApiError] = useState<string | null>(null);

    const resetImport = () => {
        setIsLoading(false);
        setImportStatus('');
        setProgress(0);
        setRowErrors([]);
        setSuccessCount(0);
        setApiError(null);
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        resetImport(); 
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            const allowedTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'application/vnd.oasis.opendocument.spreadsheet',
                'text/csv'
            ];
            if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv')) {
                setApiError('Tipo de arquivo inválido. Por favor, selecione um arquivo .xlsx, .xls, .ods ou .csv.');
                setSelectedFile(null);
                event.target.value = ''; 
                return;
            }
            setSelectedFile(file);
        } else {
            setSelectedFile(null);
        }
    };

    // --- FUNÇÃO handleImport ATUALIZADA (LÓGICA CLIENTE) ---
    const handleImport = async () => {
        if (!selectedFile) {
            setApiError('Por favor, selecione um arquivo de planilha.');
            return;
        }

        resetImport();
        setIsLoading(true); 

        let jsonData: Record<string, unknown>[] = [];
        let totalRows = 0;

        // --- Etapa 1: Leitura do arquivo no Frontend ---
        try {
            setImportStatus('Lendo arquivo...');
            const data = await selectedFile.arrayBuffer();
            const workbook = XLSX.read(data, { type: "buffer", cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            jsonData = XLSX.utils.sheet_to_json(
                worksheet,
                { raw: false, defval: null } 
            );
            totalRows = jsonData.length;

            if (totalRows === 0) {
                setApiError('O arquivo está vazio ou não contém dados.');
                setIsLoading(false);
                return;
            }
        } catch (err) {
            console.error("Erro ao ler o arquivo:", err);
            setApiError(err instanceof Error ? err.message : 'Não foi possível ler o arquivo.');
            setIsLoading(false);
            return;
        }
        
        // --- Etapa 2: Pré-processamento e Geocodificação (usando concorrência) ---
        setImportStatus(`Iniciando pré-processamento e geocodificação de ${totalRows} linhas...`);
        setProgress(0);
        
        // Limite para chamadas concorrentes (importante para APIs externas como Google Maps)
        // Usaremos um limite de 5 requisições concorrentes como exemplo seguro.
        const CONCURRENCY_LIMIT = 5; 
        
        const processRow = async (rowData: Record<string, unknown>, index: number): Promise<ProcessedRow | RowError> => {
            const rowNumberInSheet = index + 2; 
            const processedRow: ProcessedRow = { ...rowData, "__rowNum__": rowNumberInSheet };
            
            try {
                // 2.1. Extração e Validação Inicial
                const cepOriginal = rowData["cep"]?.toString() ?? ""; 
                const cepRaw = cepOriginal.trim().replace(/\D/g, "");
                const numero = rowData["Número"]?.toString().trim() ?? ""; 
                const descricao = rowData["Descrição"]?.toString().trim() ?? ""; 
                
                if (!cepRaw || cepRaw.length !== 8) throw new Error(`Coluna "cep" (${cepOriginal}) obrigatória e deve ter 8 dígitos.`);
                if (!numero) throw new Error('Coluna "Número" é obrigatória.');
                if (!descricao) throw new Error('Coluna "Descrição" é obrigatória.');
                
                processedRow["cep_raw"] = cepRaw; 

                let logradouro = rowData["Rua"]?.toString().trim() ?? "";
                let bairro = rowData["Bairro"]?.toString().trim() ?? "";
                let cidade = rowData["Cidade"]?.toString().trim() ?? "";
                let uf = rowData["uf"]?.toString().trim() ?? null;
                
                // 2.2. Busca ViaCEP (se dados de endereço estiverem incompletos)
                if (!logradouro || !bairro || !cidade || !uf) {
                    const cepData = await fetchViaCep(cepRaw);
                    logradouro = logradouro || cepData.logradouro;
                    bairro = bairro || cepData.bairro;
                    cidade = cidade || cepData.localidade;
                    uf = uf || cepData.uf;
                }
                
                // Atualiza os dados processados
                processedRow["Rua"] = logradouro;
                processedRow["Bairro"] = bairro;
                processedRow["Cidade"] = cidade;
                processedRow["uf"] = uf;

                // 2.3. Geocodificação (usando o endpoint interno do backend)
                if (logradouro && numero && cidade && uf) {
                    const coordinates = await geocodeAddressViaBackend(logradouro, numero, cidade, uf);
                    processedRow["coordinates"] = coordinates; // [lat, lng]
                } else {
                    processedRow["coordinates"] = null;
                }

                return processedRow;

            } catch (err) {
                 // Captura erros de CEP/Geocoding/Validação
                return {
                    row: rowNumberInSheet,
                    message: err instanceof Error ? err.message : 'Erro desconhecido no pré-processamento.',
                    data: rowData,
                } as RowError;
            }
        };

        // Simulação de limite de concorrência com Promises (substitui 'p-limit')
        const allProcessedPromises: Promise<ProcessedRow | RowError>[] = jsonData.map((row, index) => 
            processRow(row, index)
        );

        const results: (ProcessedRow | RowError)[] = [];
        let completedCount = 0;
        
        // Loop manual para limitar a concorrência e atualizar o progresso
        for (let i = 0; i < totalRows; i += CONCURRENCY_LIMIT) {
            const batch = allProcessedPromises.slice(i, i + CONCURRENCY_LIMIT);
            const batchResults = await Promise.all(batch);
            
            results.push(...batchResults);
            
            completedCount += batch.length;
            setProgress(Math.round((completedCount / totalRows) * 50)); // A primeira metade é o pré-processamento
        }


        // --- Etapa 3: Envio de Linha por Linha (para o backend simplificado) ---
        setImportStatus(`Pré-processamento completo. Enviando ${results.length} linhas para o banco...`);
        
        const processedRows = results.filter((r): r is ProcessedRow => !('message' in r));
        const currentErrors: RowError[] = results.filter((r): r is RowError => 'message' in r);
        let currentSuccessCount = 0;

        for (let i = 0; i < processedRows.length; i++) {
            const rowData = processedRows[i];
            const rowNumberInSheet = rowData["__rowNum__"] || 0;
            
            setImportStatus(`Salvando linha ${i + 1}/${processedRows.length}...`);
            // Progresso de 50 a 100%
            setProgress(50 + Math.round(((i + 1) / processedRows.length) * 50)); 

            try {
                const response = await fetch('/api/demandas/import-row', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(rowData),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || `Erro HTTP ${response.status}`);
                }

                currentSuccessCount++;
                
            } catch (err) {
                // Erro de inserção no banco (FK, validação final)
                console.error(`Falha na linha ${rowNumberInSheet} (salvamento):`, err);
                currentErrors.push({
                    row: rowNumberInSheet,
                    message: err instanceof Error ? err.message : 'Erro desconhecido no salvamento.',
                    data: rowData,
                });
            }
        } 

        // --- Etapa 4: Finalizar ---
        setIsLoading(false);
        setImportStatus('Importação concluída.');
        setProgress(100);
        setSuccessCount(currentSuccessCount);
        setRowErrors(currentErrors);
    };


    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>Importar Demandas via Arquivo</Typography>

            <Typography paragraph>
                Para importar múltiplas demandas, utilize um arquivo de planilha (.xlsx, .xls, .ods, .csv)
                seguindo a estrutura de colunas esperada. O geocodificação e busca de CEP serão realizados no seu navegador de forma paralela, tornando o processo mais rápido e menos propenso a falhas de rede do servidor.
            </Typography>

            {/* Input para selecionar arquivo (sem alteração) */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Button
                    component="label"
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    disabled={isLoading} 
                >
                    Selecionar Arquivo
                    <input
                        type="file"
                        hidden
                        onChange={handleFileChange}
                        accept=".xlsx, .xls, .ods, .csv" 
                    />
                </Button>
                {selectedFile && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Arquivo: {selectedFile.name}
                    </Typography>
                )}
            </Box>

            {/* Botão de Importar (sem alteração) */}
            <Button
                variant="contained"
                onClick={handleImport}
                disabled={isLoading || !selectedFile} 
                startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}
            >
                {isLoading ? 'Importando...' : 'Importar Arquivo'}
            </Button>

            {/* Feedback de Progresso (sem alteração) */}
            {isLoading && (
                <Box sx={{ width: '100%', mt: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {importStatus}
                    </Typography>
                    <LinearProgress variant="determinate" value={progress} />
                </Box>
            )}

            {/* Feedback de Erro de Setup (sem alteração) */}
            {apiError && <Alert severity="error" sx={{ mt: 3 }}>{apiError}</Alert>}

            {/* Feedback de Resultado (sem alteração) */}
            {!isLoading && (successCount > 0 || rowErrors.length > 0) && (
                <Paper sx={{ mt: 3, p: 2 }}>
                    <Typography variant="h6">Resultado da Importação:</Typography>
                    <Alert severity={rowErrors.length === 0 ? "success" : "warning"} sx={{ mt: 1, mb: 2 }}>
                        {successCount} demanda(s) importada(s) com sucesso.
                        {rowErrors.length > 0 && ` ${rowErrors.length} linha(s) com erro (incluindo pré-processamento).`}
                    </Alert>

                    {rowErrors.length > 0 && (
                        <>
                            <Typography variant="subtitle1">Detalhes dos Erros:</Typography>
                            <List dense sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ccc', borderRadius: 1, mt: 1 }}>
                                {rowErrors.map((err, index) => (
                                    <ListItem key={index} divider>
                                        <ListItemText
                                            primary={`Linha ${err.row} (arquivo): ${err.message}`}
                                            secondary={`Dados: ${JSON.stringify(err.data).substring(0, 150)}...`}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </>
                    )}
                </Paper>
            )}
        </Box>
    );
}