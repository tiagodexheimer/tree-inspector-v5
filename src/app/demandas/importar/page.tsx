// src/app/demandas/importar/page.tsx
'use client';

import React, { useState, ChangeEvent } from 'react'; // Adicionar ChangeEvent
import {
    Box, Button, Typography, CircularProgress, Alert,
    List, ListItem, ListItemText, Paper
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
// Remover LinkIcon se não for mais usado
// import LinkIcon from '@mui/icons-material/Link';

// Interface para o resultado da importação (mantida)
interface ImportResult {
    successCount: number;
    errors: { row: number; message: string; data: unknown }[];
}

export default function ImportarDemandasPage() {
    // Estados atualizados: remover sheetLink, adicionar selectedFile
    const [selectedFile, setSelectedFile] = useState<File | null>(null); // Estado para o arquivo selecionado
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);

    // Nova função para lidar com a seleção do arquivo
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            // Validação opcional do tipo de arquivo aqui (ex: verificar extensão ou MIME type)
            const allowedTypes = [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
                'application/vnd.ms-excel', // .xls
                'application/vnd.oasis.opendocument.spreadsheet', // .ods
                'text/csv' // .csv
            ];
            if (!allowedTypes.includes(file.type)) {
                setApiError('Tipo de arquivo inválido. Por favor, selecione um arquivo .xlsx, .xls, .ods ou .csv.');
                setSelectedFile(null);
                event.target.value = ''; // Limpa o input file
                return;
            }

            setSelectedFile(file);
            setApiError(null); // Limpa erros ao selecionar novo arquivo válido
            setResult(null); // Limpa resultado anterior
        } else {
            setSelectedFile(null);
        }
    };

    // Função handleImport atualizada para enviar FormData
    const handleImport = async () => {
        if (!selectedFile) {
            setApiError('Por favor, selecione um arquivo de planilha.');
            return;
        }

        setIsLoading(true);
        setApiError(null);
        setResult(null);

        const formData = new FormData();
        formData.append('file', selectedFile); // Adiciona o arquivo ao FormData com a chave 'file'

        try {
            // Envia para a mesma rota de API (que será atualizada no backend)
            const response = await fetch('/api/demandas/import', {
                method: 'POST',
                // Não defina Content-Type, o navegador faz isso automaticamente para FormData
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                // Usa a mensagem de erro da API ou um erro genérico
                throw new Error(data.message || `Erro ${response.status} ao importar.`);
            }

            setResult(data); // Define o resultado do backend

        } catch (err) {
            console.error("Erro na importação:", err);
            setApiError(err instanceof Error ? err.message : 'Erro desconhecido durante a importação.');
        } finally {
            setIsLoading(false);
        }
    };

    // Link para planilha modelo pode ser removido ou adaptado para download
    // const templateLink = "SEU_LINK_PARA_DOWNLOAD_DO_MODELO";

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>Importar Demandas via Arquivo</Typography>

            <Typography paragraph>
                Para importar múltiplas demandas, utilize um arquivo de planilha (.xlsx, .xls, .ods, .csv)
                seguindo a estrutura de colunas esperada. Selecione o arquivo abaixo.
            </Typography>

            {/* Opcional: Link para download do modelo, se tiver um */}
            {/*
            <MuiLink href={templateLink} download="modelo_importacao_demandas.xlsx" sx={{ mb: 3, display: 'inline-block' }}>
                <Button variant="outlined" startIcon={<DownloadIcon />}>
                    Baixar Planilha Modelo (.xlsx)
                </Button>
            </MuiLink>
            */}

            {/* Input para selecionar arquivo */}
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
                        accept=".xlsx, .xls, .ods, .csv" // Tipos aceitos pelo navegador
                    />
                </Button>
                {selectedFile && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Arquivo: {selectedFile.name}
                    </Typography>
                )}
            </Box>


            <Button
                variant="contained"
                onClick={handleImport}
                disabled={isLoading || !selectedFile} // Desabilita se carregando ou sem arquivo
                startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}
            >
                {isLoading ? 'Importando...' : 'Importar Arquivo'}
            </Button>

            {/* Feedback da Importação (mesma lógica de antes) */}
            {apiError && <Alert severity="error" sx={{ mt: 3 }}>{apiError}</Alert>}

            {result && (
                <Paper sx={{ mt: 3, p: 2 }}>
                    <Typography variant="h6">Resultado da Importação:</Typography>
                    <Alert severity={result.errors.length === 0 ? "success" : "warning"} sx={{ mt: 1, mb: 2 }}>
                        {result.successCount} demanda(s) importada(s) com sucesso.
                        {result.errors.length > 0 && ` ${result.errors.length} linha(s) com erro.`}
                    </Alert>

                    {result.errors.length > 0 && (
                        <>
                            <Typography variant="subtitle1">Detalhes dos Erros:</Typography>
                            <List dense sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ccc', borderRadius: 1, mt: 1 }}>
                                {result.errors.map((err, index) => (
                                    <ListItem key={index} divider>
                                        <ListItemText
                                            primary={`Linha ${err.row} (arquivo): ${err.message}`}
                                            // Limita a exibição dos dados para não poluir
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