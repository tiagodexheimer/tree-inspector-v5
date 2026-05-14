'use client';

import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Divider,
    CircularProgress,
    Stack,
    Button,
    Chip,
    Container,
    Card,
    CardMedia
} from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { usePageTitle } from '@/contexts/PageTitleContext';

// --- COMPONENTE AUXILIAR PARA RENDERIZAR RESPOSTAS (TEXTO OU IMAGEM) ---
const RenderizarResposta = ({ valor }: { valor: any }) => {
    if (!valor) return <Typography color="text.secondary" variant="body2">-</Typography>;

    // 1. Verifica se é uma LISTA (Array) de imagens (Novo padrão do Android)
    if (Array.isArray(valor)) {
        if (valor.length === 0) return <Typography color="text.secondary" variant="body2">Sem imagens</Typography>;

        return (
            <Stack direction="row" flexWrap="wrap" gap={2} mt={1}>
                {valor.map((item, index) => (
                    <Box key={index} sx={{ border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden', maxWidth: 200 }}>
                        {/* Recursividade para renderizar cada item da lista */}
                        <RenderizarResposta valor={item} />
                    </Box>
                ))}
            </Stack>
        );
    }

    // 2. Verifica se é uma STRING que parece uma IMAGEM (URL ou Base64)
    if (typeof valor === 'string') {
        const isUrlVercel = valor.includes('vercel-storage.com');
        const isImagemExtensao = valor.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
        const isBase64 = valor.startsWith('data:image');

        if (isUrlVercel || isImagemExtensao || isBase64) {
            const jpgUrl = `/api/images/convert?url=${encodeURIComponent(valor)}`;
            const downloadUrl = `${jpgUrl}&download=1`;

            return (
                <Card variant="outlined" sx={{ maxWidth: '100%', width: 'fit-content' }}>
                    <CardMedia
                        component="img"
                        image={jpgUrl}
                        alt="Evidência Fotográfica"
                        sx={{
                            height: 200,
                            width: 'auto',
                            minWidth: 150,
                            objectFit: 'contain',
                            bgcolor: '#f0f0f0',
                            cursor: 'pointer',
                            borderRadius: 1
                        }}
                        onClick={() => window.open(jpgUrl, '_blank')}
                        title="Clique para abrir imagem em JPG"
                    />
                </Card>
            );
        }
    }

    // 3. Caso padrão: Texto
    return <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{String(valor)}</Typography>;
};

// --- PÁGINA PRINCIPAL ---
export default function RelatorioDetalhePage() {
    const params = useParams();
    const router = useRouter();
    const [relatorio, setRelatorio] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (params?.id) {
            fetch(`/api/relatorios/${params.id}`)
                .then(async (res) => {
                    if (!res.ok) throw new Error('Falha ao carregar dados');
                    return res.json();
                })
                .then(data => {
                    console.log('[RelatorioPage] Dados recebidos:', data);
                    setRelatorio(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setErro('Erro ao carregar o relatório. Tente novamente.');
                    setLoading(false);
                });
        }
    }, [params?.id]);

    usePageTitle(relatorio?.tipo_demanda || 'Relatório de Vistoria', <AssessmentIcon />);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (erro || !relatorio) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Typography color="error" variant="h6">{erro || 'Relatório não encontrado.'}</Typography>
                <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mt: 2 }}>
                    Voltar
                </Button>
            </Container>
        );
    }

    // --- FUNÇÃO HELPER PARA MAPEAR VALORES ---
    const mapearValor = (campo: any, valor: any): { display: React.ReactNode; isMulti: boolean } => {
        // Campos com opções (checkbox_group, select, radio)
        if (campo.options && Array.isArray(campo.options)) {
            // Multi-valor (ex: "op1,valor_2")
            if (typeof valor === 'string' && valor.includes(',')) {
                const ids = valor.split(',').map((s: string) => s.trim());
                const labels = ids.map((id: string) => {
                    const opt = campo.options.find((o: any) => o.value === id || o.id === id);
                    return opt ? opt.label : id;
                });
                return {
                    display: (
                        <Stack direction="column" spacing={0.5}>
                            {labels.map((txt: string, idx: number) => (
                                <Typography key={idx} variant="body1" sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2e7d32', mr: 1, display: 'inline-block' }} />
                                    {txt}
                                </Typography>
                            ))}
                        </Stack>
                    ),
                    isMulti: true
                };
            }
            // Valor único
            const opt = campo.options.find((o: any) => o.value === valor || o.id === valor);
            if (opt) return { display: <Typography variant="body1">{opt.label}</Typography>, isMulti: false };
        }

        // Booleanos (switch, checkbox single)
        if (campo.type === 'switch' || campo.type === 'checkbox') {
            const texto = (valor === true || valor === 'true' || valor === 'on') ? 'Sim' : 'Não';
            return { display: <Typography variant="body1">{texto}</Typography>, isMulti: false };
        }

        // Data
        if (campo.type === 'date' && typeof valor === 'string' && valor.includes('-')) {
            try {
                const [y, m, d] = valor.split('-');
                if (y.length === 4) {
                    return { display: <Typography variant="body1">{`${d}/${m}/${y}`}</Typography>, isMulti: false };
                }
            } catch (e) { /* fallback */ }
        }

        // Default: usa RenderizarResposta
        return { display: <RenderizarResposta valor={valor} />, isMulti: false };
    };

    return (
        <Box className="report-container" sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh', '@media print': { p: 0, backgroundColor: 'white' } }}>
            {/* Barra de Ações Superior */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} maxWidth="lg" mx="auto" className="no-print">
                <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()}>
                    Voltar
                </Button>
                <Button
                    variant="contained"
                    startIcon={<PrintIcon />}
                    onClick={() => window.print()}
                >
                    Imprimir / PDF
                </Button>
            </Stack>

            <Container maxWidth="lg" sx={{ '@media print': { maxWidth: '100% !important', p: 0 } }}>
                <Paper elevation={3} sx={{ p: 5, mb: 5, '@media print': { boxShadow: 'none', p: 0, mb: 0 } }}>

                    {/* CABEÇALHO DO RELATÓRIO */}
                    <Stack spacing={1} mb={4}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                                <Typography variant="overline" color="text.secondary">RELATÓRIO TÉCNICO DE VISTORIA</Typography>
                            </Box>
                            <Chip label={relatorio.protocolo} color="primary" variant="outlined" />
                        </Stack>

                        <Typography variant="subtitle1">
                            <strong>Data da Vistoria:</strong> {new Date(relatorio.data_realizacao).toLocaleDateString('pt-BR')} às {new Date(relatorio.data_realizacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                    </Stack>

                    <Divider sx={{ mb: 4 }} />

                    {/* DADOS DA SOLICITAÇÃO (ESTÁTICOS) */}
                    <Box mb={4}>
                        <Typography variant="h6" gutterBottom sx={{ bgcolor: '#e8f5e9', p: 1, pl: 2, borderRadius: 1 }}>
                            1. Dados da Solicitação
                        </Typography>

                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} mt={2}>
                            <Box flex={1}>
                                <Typography variant="caption" color="text.secondary">Solicitante</Typography>
                                <Typography variant="body1" gutterBottom>{relatorio.nome_solicitante || 'Não informado'}</Typography>
                            </Box>
                            <Box flex={1}>
                                <Typography variant="caption" color="text.secondary">Endereço</Typography>
                                <Typography variant="body1" gutterBottom>
                                    {relatorio.logradouro}, {relatorio.numero}
                                    {relatorio.bairro ? ` - ${relatorio.bairro}` : ''}
                                    {relatorio.cidade ? `, ${relatorio.cidade}` : ''}
                                </Typography>
                            </Box>
                        </Stack>

                        <Box mt={2}>
                            <Typography variant="caption" color="text.secondary">Descrição da Demanda</Typography>
                            <Typography variant="body1" sx={{ fontStyle: 'italic', color: '#555' }}>
                                "{relatorio.descricao_demanda || 'Sem descrição'}"
                            </Typography>
                        </Box>
                    </Box>

                    {/* DADOS DO LAUDO TÉCNICO (DINÂMICOS) */}
                    <Box mb={4}>
                        <Typography variant="h6" gutterBottom sx={{ bgcolor: '#e8f5e9', p: 1, pl: 2, borderRadius: 1 }}>
                            2. Laudo Técnico
                        </Typography>

                        <Stack spacing={3} mt={2}>
                            {(() => {
                                const respostas = relatorio.respostas || {};
                                const definicao = relatorio.definicaoCampos || [];
                                const chavesProcessadas = new Set(definicao.map((c: any) => c.name));

                                // 1. Renderiza campos definidos pelo formulário
                                const camposDefinidos = definicao.map((campo: any) => {
                                    const valor = respostas[campo.name];

                                    // Debug
                                    if (campo.options) {
                                        console.log(`[RelatorioPage] Campo '${campo.label}': valor='${valor}'`, campo.options);
                                    }

                                    // Layout: Header
                                    if (campo.type === 'header') {
                                        return (
                                            <Box key={campo.id} sx={{ mt: 3, mb: 1, borderBottom: '2px solid #2e7d32', pb: 0.5 }}>
                                                <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                                                    {campo.label}
                                                </Typography>
                                            </Box>
                                        );
                                    }

                                    // Layout: Separator
                                    if (campo.type === 'separator') {
                                        return <Divider key={campo.id} sx={{ my: 3, borderColor: '#ddd' }} />;
                                    }

                                    // Pular campos vazios
                                    if (valor === null || valor === undefined || valor === "" || (Array.isArray(valor) && valor.length === 0)) {
                                        return null;
                                    }

                                    // Mapear valor para exibição
                                    const { display } = mapearValor(campo, valor);

                                    return (
                                        <Box key={campo.id} sx={{ breakInside: 'avoid', mb: 2 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#555', mb: 0.5, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                                {campo.label}
                                            </Typography>
                                            <Box sx={{ pl: 1, borderLeft: '4px solid #e0e0e0', ml: 0.5 }}>
                                                {display}
                                            </Box>
                                        </Box>
                                    );
                                });

                                // 2. Fallback para campos extras
                                const camposExtras = Object.keys(respostas)
                                    .filter(k => !chavesProcessadas.has(k) && k !== 'fotos_evidencia' && k !== 'observacoes')
                                    .map(k => (
                                        <Box key={k} sx={{ breakInside: 'avoid', mb: 2, opacity: 0.8 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#777', mb: 0.5, fontStyle: 'italic' }}>
                                                {k} (Campo Adicional)
                                            </Typography>
                                            <Box sx={{ pl: 1, borderLeft: '4px solid #eee', ml: 0.5 }}>
                                                <RenderizarResposta valor={respostas[k]} />
                                            </Box>
                                        </Box>
                                    ));

                                if (camposDefinidos.filter(Boolean).length === 0 && camposExtras.length === 0) {
                                    return <Typography color="text.secondary" fontStyle="italic">Nenhum dado técnico registrado.</Typography>;
                                }

                                return [...camposDefinidos, ...camposExtras];
                            })()}

                            {/* Evidências Fotográficas */}
                            {relatorio.respostas && relatorio.respostas['fotos_evidencia'] && (
                                <Box sx={{ breakInside: 'avoid', mt: 2 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                        Evidências Fotográficas
                                    </Typography>
                                    <RenderizarResposta valor={relatorio.respostas['fotos_evidencia']} />
                                </Box>
                            )}

                            {/* Observações Gerais */}
                            {relatorio.observacoes && (
                                <Box sx={{ breakInside: 'avoid', mt: 2 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                        Observações Gerais
                                    </Typography>
                                    <Box sx={{ pl: 1, borderLeft: '3px solid #eee' }}>
                                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{relatorio.observacoes}</Typography>
                                    </Box>
                                </Box>
                            )}
                        </Stack>
                    </Box>

                    {/* RODAPÉ */}
                    <Divider sx={{ mt: 6, mb: 2 }} />
                    <Typography variant="caption" align="center" display="block" color="text.secondary">
                        Relatório gerado automaticamente pelo sistema TreeInspector em {new Date().toLocaleDateString()}.
                    </Typography>

                </Paper>
            </Container>
        </Box>
    );
}