// src/app/relatorios/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    Box, Typography, Paper, Divider, Button, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Card, CardMedia
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import Grid from '@mui/material/Grid';

// --- CSS DE IMPRESSÃO ROBUSTO ---
const printStyles = `
  @media print {
    /* 1. Esconde TUDO no site inicialmente */
    body * {
      visibility: hidden;
    }

    /* 2. Zera margens do navegador */
    @page { 
      margin: 0;
      size: auto; 
    }

    /* 3. Configura o Body */
    body {
      margin: 0;
      padding: 0;
      background: white;
    }

    /* 4. Torna VISÍVEL apenas o nosso container de papel (e seus filhos) */
    .page-container, .page-container * {
      visibility: visible !important;
    }

    /* 5. Posiciona o papel absolutamente sobre todo o resto */
    .page-container {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 2cm !important; /* Margem interna do papel */
      box-shadow: none !important;
      border: none !important;
      background: white !important;
      z-index: 9999; /* Garante que fique por cima de tudo */
    }

    /* 6. Esconde botões que não devem sair na impressão */
    .no-print {
      display: none !important;
    }

    /* 7. Evita quebras indesejadas */
    .image-container, tr, td {
      page-break-inside: avoid;
    }
  }
`;

export default function DetalheRelatorioPage() {
    const params = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            fetch(`/api/relatorios/${params.id}`)
                .then(res => res.json())
                .then(result => {
                    setData(result);
                    setLoading(false);
                });
        }
    }, [params.id]);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
    if (!data) return <Typography>Relatório não encontrado.</Typography>;

    const isImageList = (value: any) => {
        return Array.isArray(value) && value.length > 0 && typeof value[0] === 'string';
    };

    const getImageSrc = (imgStr: string) => {
        if (imgStr.startsWith('http')) return imgStr;
        if (imgStr.startsWith('data:image')) return imgStr;
        if (imgStr.length > 200 && !imgStr.includes('/')) {
            return `data:image/jpeg;base64,${imgStr}`;
        }
        return imgStr;
    };

    const renderRespostas = () => {
        if (!data.respostas) return null;

        const camposDefinidos = data.definicaoCampos || [];

        return Object.entries(data.respostas).map(([key, value]) => {
            if (value === null || value === undefined) return null;

            const campoDef = camposDefinidos.find((c: any) => c.name === key);
            const label = key === 'fotos_evidencia' ? 'Evidências Fotográficas' : (campoDef ? campoDef.label : key);

            // RENDERIZAÇÃO DE IMAGENS
            if (isImageList(value)) {
                const images = value as string[];
                return (
                    <TableRow key={key} className="image-container">
                        <TableCell colSpan={2} sx={{ py: 3, borderBottom: 'none' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, color: '#333' }}>
                                📸 {label}
                            </Typography>
                            <Box
                                sx={{
                                    display: 'grid',
                                    // xs={6} significa 50% (2 por linha). sm={4} significa 33% (3 por linha).
                                    gridTemplateColumns: {
                                        xs: 'repeat(2, 1fr)', // Mobile: 2 colunas
                                        sm: 'repeat(3, 1fr)'  // Tablet/Desktop: 3 colunas
                                    },
                                    gap: 2, // Espaçamento (spacing={2})
                                    width: '100%'
                                }}
                            >
                                {images.map((imgStr, idx) => (
                                    // A key fica aqui no elemento pai direto do map
                                    <Box key={idx} sx={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                                        <Card variant="outlined">
                                            <CardMedia
                                                component="img"
                                                image={imgStr} // Certifique-se de que imgStr é a URL/Base64
                                                alt={`Foto ${idx + 1}`}
                                                sx={{
                                                    height: 200, // Defina uma altura fixa ou ajustável para não quebrar o layout
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        </Card>
                                    </Box>
                                ))}
                            </Box>
                        </TableCell>
                    </TableRow>
                );
            }

            // RENDERIZAÇÃO DE TEXTO/BOOLEAN
            let valorFormatado = String(value);
            if (typeof value === 'boolean') valorFormatado = value ? 'Sim' : 'Não';
            if (value === '') valorFormatado = '-';

            return (
                <TableRow key={key}>
                    <TableCell sx={{ fontWeight: 'bold', width: '30%', verticalAlign: 'top', borderBottom: '1px solid #eee' }}>{label}</TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #eee' }}>{valorFormatado}</TableCell>
                </TableRow>
            );
        });
    };

    return (
        <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 4, display: 'flex', justifyContent: 'center' }}>
            {/* Injeta os estilos globais de impressão apenas nesta página */}
            <style jsx global>{printStyles}</style>

            <Paper
                className="page-container"
                elevation={3}
                sx={{
                    width: '210mm',
                    minHeight: '297mm',
                    p: 5,
                    bgcolor: 'white',
                    position: 'relative',
                    mx: 'auto'
                }}
            >
                {/* Botão de Imprimir (Classe no-print esconde ele na impressão) */}
                <Box sx={{ position: 'absolute', top: 20, right: 20 }} className="no-print">
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<PrintIcon />}
                        onClick={() => window.print()}
                    >
                        Imprimir / PDF
                    </Button>
                </Box>

                {/* Cabeçalho */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant="h5" fontWeight="900" gutterBottom sx={{ textTransform: 'uppercase' }}>
                        Laudo de Vistoria Técnica
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">Tree Inspector - Gestão de Arborização</Typography>
                    <Divider sx={{ mt: 2, borderBottomWidth: 2, borderColor: '#000' }} />
                </Box>

                {/* Seção 1 */}
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr', // Cria 2 colunas de 50% cada
                    gap: 2,
                    px: 1
                }}>

                    {/* Item: Protocolo (Ocupa 1 coluna) */}
                    <Box>
                        <Typography><strong>Protocolo:</strong> {data.protocolo}</Typography>
                    </Box>

                    {/* Item: Data Vistoria (Ocupa 1 coluna) */}
                    <Box>
                        <Typography><strong>Data Vistoria:</strong> {new Date(data.data_realizacao).toLocaleDateString()}</Typography>
                    </Box>

                    {/* Item: Endereço (Ocupa as 2 colunas - span 2) - Equivalente ao xs={12} */}
                    <Box sx={{ gridColumn: 'span 2' }}>
                        <Typography><strong>Endereço:</strong> {data.logradouro}, {data.numero} - {data.bairro}</Typography>
                    </Box>

                    {/* Item: Cidade (Ocupa 1 coluna) */}
                    <Box>
                        <Typography><strong>Cidade:</strong> {data.cidade}/{data.uf}</Typography>
                    </Box>

                    {/* Se houver mais itens abaixo que precisem ocupar a linha toda, use sx={{ gridColumn: 'span 2' }} neles também */}

                </Box>

                {/* Seção 2 */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ bgcolor: '#eee', p: 1, pl: 2, mb: 2, fontWeight: 'bold', borderRadius: 1 }}>
                        2. DESCRIÇÃO DA DEMANDA
                    </Typography>
                    <Typography paragraph sx={{ textAlign: 'justify', px: 1 }}>
                        {data.descricao_demanda}
                    </Typography>
                </Box>

                {/* Seção 3 */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ bgcolor: '#eee', p: 1, pl: 2, mb: 1, fontWeight: 'bold', borderRadius: 1 }}>
                        3. PARECER TÉCNICO E EVIDÊNCIAS
                    </Typography>
                    <TableContainer>
                        <Table size="small">
                            <TableBody>
                                {renderRespostas()}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>

                {/* Rodapé / Assinatura */}
                <Box sx={{ mt: 8, textAlign: 'center', pageBreakInside: 'avoid' }}>
                    <Box sx={{ height: 50 }} /> {/* Espaço para assinatura */}
                    <Divider sx={{ width: '60%', mx: 'auto', mb: 1, borderColor: '#000' }} />
                    <Typography fontWeight="bold">Responsável Técnico</Typography>
                    <Typography variant="caption" display="block">Documento gerado eletronicamente em {new Date().toLocaleString()}</Typography>
                </Box>
            </Paper>
        </Box>
    );
}