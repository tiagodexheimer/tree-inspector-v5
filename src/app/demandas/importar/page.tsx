// src/app/demandas/importar/page.tsx
'use client';

import React, { useState, ChangeEvent } from 'react';
import {
    Box, Button, Typography, CircularProgress, Alert,
    List, ListItem, ListItemText, Paper,
    LinearProgress // <-- Importar LinearProgress
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import * as XLSX from "xlsx"; // <-- Importar o leitor de XLSX

// Interface para o resultado de UMA LINHA
interface RowError {
    row: number;
    message: string;
    data: unknown;
}

export default function ImportarDemandasPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // --- (Estados de controle permanecem os mesmos) ---
    const [importStatus, setImportStatus] = useState<string>('');
    const [progress, setProgress] = useState<number>(0);
    const [rowErrors, setRowErrors] = useState<RowError[]>([]);
    const [successCount, setSuccessCount] = useState<number>(0);
    
    const [apiError, setApiError] = useState<string | null>(null);

    // Função para limpar estados antigos (sem alteração)
    const resetImport = () => {
        setIsLoading(false);
        setImportStatus('');
        setProgress(0);
        setRowErrors([]);
        setSuccessCount(0);
        setApiError(null);
    };

    // handleFileChange (sem alteração)
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        resetImport(); 
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            const allowedTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
                'application/vnd.ms-excel', // .xls
                'application/vnd.oasis.opendocument.spreadsheet', // .ods
                'text/csv' // .csv
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

    // --- FUNÇÃO handleImport CORRIGIDA ---
    const handleImport = async () => {
        if (!selectedFile) {
            setApiError('Por favor, selecione um arquivo de planilha.');
            return;
        }

        resetImport();
        setIsLoading(true); 

        let jsonData: Record<string, unknown>[] = [];

        // --- Etapa 1: Ler o arquivo no Frontend (sem alteração) ---
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
        } catch (err) {
            console.error("Erro ao ler o arquivo:", err);
            setApiError(err instanceof Error ? err.message : 'Não foi possível ler o arquivo.');
            setIsLoading(false);
            return;
        }

        const totalRows = jsonData.length;
        if (totalRows === 0) {
            setApiError('O arquivo está vazio ou não contém dados.');
            setIsLoading(false);
            return;
        }

        // --- Etapa 2: Fazer o loop e enviar linha por linha ---
        setImportStatus(`Iniciando importação de ${totalRows} linhas...`);
        
        let currentSuccessCount = 0;
        const currentErrors: RowError[] = [];

        for (let i = 0; i < totalRows; i++) {
            const rowData = jsonData[i];
            const rowNumberInSheet = i + 2; // +1 do header, +1 do índice 0
            
            // ***** INÍCIO DA CORREÇÃO *****
            // Criamos uma CÓPIA do objeto 'rowData' e adicionamos o '__rowNum__'
            const rowDataWithNum = {
                ...rowData,
                "__rowNum__": rowNumberInSheet
            };
            // ***** FIM DA CORREÇÃO *****

            // Atualiza o status e a barra de progresso
            const cep = rowData["cep"]?.toString() || '??';
            setImportStatus(`Processando linha ${i + 1}/${totalRows} (CEP: ${cep})...`);
            setProgress(Math.round(((i + 1) / totalRows) * 100));

            try {
                const response = await fetch('/api/demandas/import-row', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // Enviamos o novo objeto (a cópia) para o backend
                    body: JSON.stringify(rowDataWithNum),
                });

                const result = await response.json();

                if (!response.ok) {
                    // Erro de processamento da linha
                    throw new Error(result.message || `Erro HTTP ${response.status}`);
                }

                // Sucesso na linha
                currentSuccessCount++;
                
            } catch (err) {
                // Erro de rede ou erro lançado acima
                console.error(`Falha na linha ${rowNumberInSheet}:`, err);
                currentErrors.push({
                    row: rowNumberInSheet,
                    message: err instanceof Error ? err.message : 'Erro desconhecido.',
                    data: rowData, // Salva o 'rowData' original no log de erro
                });
            }
        } // --- Fim do loop ---

        // --- Etapa 3: Finalizar (sem alteração) ---
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
                seguindo a estrutura de colunas esperada. Selecione o arquivo abaixo.
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
                        {rowErrors.length > 0 && ` ${rowErrors.length} linha(s) com erro.`}
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