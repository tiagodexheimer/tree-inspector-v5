// src/app/demandas/importar/page.tsx
'use client';

import React, { useState } from 'react';
import {
    Box, Button, TextField, Typography, CircularProgress, Alert, Link as MuiLink, List, ListItem, ListItemText, Paper
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LinkIcon from '@mui/icons-material/Link';

// Interface para o resultado da importação
interface ImportResult {
    successCount: number;
    errors: { row: number; message: string; data: any }[];
}

export default function ImportarDemandasPage() {
    const [sheetLink, setSheetLink] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);

    const handleImport = async () => {
        if (!sheetLink.trim()) {
            setApiError('Por favor, insira o link da planilha Google Sheets.');
            return;
        }
        // Validação básica do link (pode ser mais robusta)
        if (!sheetLink.includes('docs.google.com/spreadsheets/d/')) {
             setApiError('Link inválido. Insira o link de compartilhamento da planilha.');
             return;
        }


        setIsLoading(true);
        setApiError(null);
        setResult(null);

        try {
            const response = await fetch('/api/demandas/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sheetLink: sheetLink.trim() }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `Erro ${response.status} ao importar.`);
            }

            setResult(data); // Assume que a API retorna { successCount: number, errors: [] }

        } catch (err) {
            console.error("Erro na importação:", err);
            setApiError(err instanceof Error ? err.message : 'Erro desconhecido durante a importação.');
        } finally {
            setIsLoading(false);
        }
    };

    // Substitua pelo link real da sua planilha modelo
    const templateLink = "https://docs.google.com/spreadsheets/d/SEU_ID_DA_PLANILHA_MODELO/edit?usp=sharing";

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>Importar Demandas via Google Sheets</Typography>

            <Typography paragraph>
                Para importar múltiplas demandas, preencha a planilha modelo e cole o link de compartilhamento abaixo.
            </Typography>

            <MuiLink href={templateLink} target="_blank" rel="noopener noreferrer" sx={{ mb: 3, display: 'inline-block' }}>
                <Button variant="outlined" startIcon={<LinkIcon />}>
                    Ver/Copiar Planilha Modelo
                </Button>
            </MuiLink>

            <TextField
                label="Link da Planilha Google Sheets (compartilhada)"
                variant="outlined"
                fullWidth
                value={sheetLink}
                onChange={(e) => { setSheetLink(e.target.value); setApiError(null); setResult(null); }}
                sx={{ mb: 2 }}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                disabled={isLoading}
            />

            <Button
                variant="contained"
                onClick={handleImport}
                disabled={isLoading || !sheetLink.trim()}
                startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' } }}
            >
                {isLoading ? 'Importando...' : 'Iniciar Importação'}
            </Button>

            {/* Feedback da Importação */}
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
                                            primary={`Linha ${err.row}: ${err.message}`}
                                            secondary={`Dados: ${JSON.stringify(err.data).substring(0, 150)}...`} // Mostra prévia dos dados com erro
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