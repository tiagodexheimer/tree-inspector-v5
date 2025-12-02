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
            return (
                <Card variant="outlined" sx={{ maxWidth: '100%', width: 'fit-content' }}>
                    <CardMedia
                        component="img"
                        image={valor}
                        alt="Evidência Fotográfica"
                        sx={{ 
                            height: 200, 
                            width: 'auto', 
                            minWidth: 150,
                            objectFit: 'contain', 
                            bgcolor: '#f0f0f0',
                            cursor: 'pointer'
                        }}
                        onClick={() => window.open(valor, '_blank')} // Abre em nova aba ao clicar
                    />
                </Card>
            );
        }
    }

    // 3. Caso padrão: Texto ou Número
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

    // Prepara os campos para exibição (mescla campos dinâmicos com fixos se necessário)
    const camposParaExibir = [
        ...(relatorio.definicaoCampos || []).map((c: any) => ({
            label: c.label,
            key: c.name
        })),
        // Garante que as fotos gerais apareçam mesmo se não estiverem na definição do formulário
        { label: "Evidências Fotográficas (Geral)", key: "fotos_evidencia" },
        // Campos fixos legados (caso existam no JSON)
        { label: "Observações Gerais", key: "observacoes" }
    ];

    return (
        <Box sx={{ p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
            {/* Barra de Ações Superior */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} maxWidth="lg" mx="auto">
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

            <Container maxWidth="lg">
                <Paper elevation={3} sx={{ p: 5, mb: 5 }}>
                    
                    {/* CABEÇALHO DO RELATÓRIO */}
                    <Stack spacing={1} mb={4}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                                <Typography variant="overline" color="text.secondary">RELATÓRIO TÉCNICO DE VISTORIA</Typography>
                                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                                    {relatorio.tipo_demanda}
                                </Typography>
                            </Box>
                            <Chip label={relatorio.protocolo} color="primary" variant="outlined" />
                        </Stack>
                        
                        <Typography variant="subtitle1">
                            <strong>Data da Vistoria:</strong> {new Date(relatorio.data_realizacao).toLocaleDateString('pt-BR')} às {new Date(relatorio.data_realizacao).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
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
                            {camposParaExibir.map((campo: any) => {
                                const valor = relatorio.respostas ? relatorio.respostas[campo.key] : null;
                                
                                // Pula campos vazios ou nulos para deixar o relatório limpo
                                if (!valor || (Array.isArray(valor) && valor.length === 0)) return null;

                                return (
                                    <Box key={campo.key} sx={{ breakInside: 'avoid' }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                            {campo.label}
                                        </Typography>
                                        <Box sx={{ pl: 1, borderLeft: '3px solid #eee' }}>
                                            <RenderizarResposta valor={valor} />
                                        </Box>
                                    </Box>
                                );
                            })}
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