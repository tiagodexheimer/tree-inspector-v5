// src/app/relatorios/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    Box, Typography, Paper, Divider, Grid, Button, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';

// Estilos para impressão (esconde botões, ajusta margens)
const printStyles = `
  @media print {
    body { padding: 0; background: white; }
    .no-print { display: none !important; }
    .page-container { box-shadow: none !important; border: none !important; width: 100% !important; margin: 0 !important; }
    @page { margin: 2cm; }
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

    // Cruzamento: Respostas (JSON) vs Definição (Schema do Form)
    // Para exibir o "Label" da pergunta e não o ID técnico
    const renderRespostas = () => {
        if (!data.respostas) return null;

        // Se tivermos a definição dos campos, usamos para pegar o Label correto
        const camposDefinidos = data.definicaoCampos || [];

        // Mapeia as respostas
        return Object.entries(data.respostas).map(([key, value]) => {
            // Tenta encontrar a definição do campo pelo 'name'
            const campoDef = camposDefinidos.find((c: any) => c.name === key);
            const label = campoDef ? campoDef.label : key; // Se não achar, usa a chave (fallback)

            // Formatação do valor
            let valorFormatado = String(value);
            if (typeof value === 'boolean') valorFormatado = value ? 'Sim' : 'Não';
            if (value === '') valorFormatado = '-';

            return (
                <TableRow key={key}>
                    <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>{label}</TableCell>
                    <TableCell>{valorFormatado}</TableCell>
                </TableRow>
            );
        });
    };

    return (
        <Box sx={{ bgcolor: '#eee', minHeight: '100vh', py: 4, display: 'flex', justifyContent: 'center' }}>
            <style>{printStyles}</style>

            {/* Container A4 Simulado */}
            <Paper
                className="page-container"
                sx={{
                    width: '210mm', // Largura A4
                    minHeight: '297mm', // Altura A4
                    p: 5,
                    bgcolor: 'white',
                    position: 'relative'
                }}
            >
                {/* Botão Flutuante de Imprimir */}
                <Box sx={{ position: 'absolute', top: 20, right: 20 }} className="no-print">
                    <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
                        Imprimir / Salvar PDF
                    </Button>
                </Box>

                {/* Cabeçalho do Laudo */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>LAUDO DE VISTORIA TÉCNICA</Typography>
                    <Typography variant="subtitle1">Tree Inspector - Gestão de Arborização</Typography>
                    <Divider sx={{ mt: 2, borderBottomWidth: 2, borderColor: 'black' }} />
                </Box>

                {/* Dados da Demanda */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ bgcolor: '#f0f0f0', p: 1, mb: 2, fontWeight: 'bold' }}>1. DADOS DA SOLICITAÇÃO</Typography>
                    <div className="grid grid-cols-12 gap-4 p-2">
                        {/* xs={6} -> col-span-6 */}
                        <div className="col-span-6">
                            <Typography><strong>Protocolo:</strong> {data.protocolo}</Typography>
                        </div>

                        {/* xs={6} -> col-span-6 */}
                        <div className="col-span-6">
                            <Typography><strong>Data Vistoria:</strong> {new Date(data.data_realizacao).toLocaleDateString()}</Typography>
                        </div>

                        {/* xs={12} -> col-span-12 */}
                        <div className="col-span-12">
                            <Typography><strong>Endereço:</strong> {data.logradouro}, {data.numero} - {data.bairro}</Typography>
                        </div>

                        {/* xs={6} -> col-span-6 */}
                        <div className="col-span-6">
                            <Typography><strong>Cidade:</strong> {data.cidade}/{data.uf}</Typography>
                        </div>
                    </div>
                </Box>

                {/* Descrição Original */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ bgcolor: '#f0f0f0', p: 1, mb: 2, fontWeight: 'bold' }}>2. MOTIVO DA SOLICITAÇÃO</Typography>
                    <Typography paragraph sx={{ textAlign: 'justify' }}>
                        {data.descricao_demanda}
                    </Typography>
                </Box>

                {/* Respostas do Formulário (Laudo Técnico) */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ bgcolor: '#f0f0f0', p: 1, mb: 0, fontWeight: 'bold' }}>3. PARECER TÉCNICO</Typography>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Item Avaliado</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Resultado / Observação</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {renderRespostas()}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>

                {/* Assinatura */}
                <Box sx={{ mt: 10, textAlign: 'center', pageBreakInside: 'avoid' }}>
                    <Divider sx={{ width: '50%', mx: 'auto', mb: 1, borderColor: 'black' }} />
                    <Typography fontWeight="bold">Responsável Técnico</Typography>
                    <Typography variant="caption">Gerado eletronicamente em {new Date().toLocaleString()}</Typography>
                </Box>

            </Paper>
        </Box>
    );
}