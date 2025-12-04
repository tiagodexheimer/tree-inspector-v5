'use client';

import React, { useEffect, useState } from 'react';
import { 
    Box, Typography, Paper, TextField, Button, Divider, Alert, CircularProgress, Stack, IconButton, InputAdornment
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import dynamic from 'next/dynamic';

// Importação Dinâmica do Mapa
const ConfigMap = dynamic(() => import('@/components/ui/configuracoes/ConfigMap'), {
    ssr: false,
    loading: () => <Box sx={{ height: '100%', minHeight: 400, bgcolor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>
});

// Interface para o estado do endereço auxiliar
interface EnderecoState {
    cep: string;
    numero: string;
    logradouro: string;
    cidade: string;
    uf: string;
}

export default function ConfiguracoesPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

    // Estado principal (Lat/Lng que vai pro banco)
    const [config, setConfig] = useState({
        inicio: { lat: 0, lng: 0 },
        fim: { lat: 0, lng: 0 }
    });

    // Estados auxiliares para os campos de endereço (Visualização)
    const [endInicio, setEndInicio] = useState<EnderecoState>({ cep: '', numero: '', logradouro: '', cidade: '', uf: '' });
    const [endFim, setEndFim] = useState<EnderecoState>({ cep: '', numero: '', logradouro: '', cidade: '', uf: '' });

    // Carregar configurações iniciais
    useEffect(() => {
        fetch('/api/gerenciar/configuracoes')
            .then(res => res.json())
            .then(data => {
                const safeData = data || { inicio: { lat: 0, lng: 0 }, fim: { lat: 0, lng: 0 } };
                setConfig(safeData);
            })
            .catch(() => setMessage({ type: 'error', text: 'Erro ao carregar configurações.' }))
            .finally(() => setLoading(false));
    }, []);

    // Atualiza Lat/Lng manualmente
    const handleChangeCoord = (section: 'inicio' | 'fim', field: 'lat' | 'lng', value: string) => {
        const cleanValue = value.replace(',', '.');
        setConfig(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: parseFloat(cleanValue) || 0
            }
        }));
    };

    // Atualiza campos de endereço (CEP, Número)
    const handleChangeAddress = (section: 'inicio' | 'fim', field: keyof EnderecoState, value: string) => {
        if (section === 'inicio') {
            setEndInicio(prev => ({ ...prev, [field]: value }));
        } else {
            setEndFim(prev => ({ ...prev, [field]: value }));
        }
    };

    // Busca endereço pelo CEP (ViaCEP)
    const buscarCep = async (section: 'inicio' | 'fim') => {
        const cep = section === 'inicio' ? endInicio.cep : endFim.cep;
        const cleanCep = cep.replace(/\D/g, '');

        if (cleanCep.length !== 8) {
            if (cleanCep.length > 0) setMessage({ type: 'error', text: 'CEP inválido. Digite 8 números.' });
            return;
        }

        try {
            const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await res.json();

            if (data.erro) {
                setMessage({ type: 'error', text: 'CEP não encontrado.' });
                return;
            }

            const novoEndereco = {
                cep: data.cep,
                logradouro: data.logradouro,
                cidade: data.localidade,
                uf: data.uf,
                numero: section === 'inicio' ? endInicio.numero : endFim.numero
            };

            if (section === 'inicio') setEndInicio(novoEndereco);
            else setEndFim(novoEndereco);

        } catch (error) {
            setMessage({ type: 'error', text: 'Erro ao buscar CEP.' });
        }
    };

    // Busca Coordenadas usando sua API (/api/geocode)
    const buscarCoordenadas = async (section: 'inicio' | 'fim') => {
        const dados = section === 'inicio' ? endInicio : endFim;

        if (!dados.logradouro || !dados.numero || !dados.cidade) {
            setMessage({ type: 'error', text: 'Preencha CEP e Número para buscar coordenadas.' });
            return;
        }

        try {
            setLoading(true);
            const res = await fetch('/api/geocode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    logradouro: dados.logradouro,
                    numero: dados.numero,
                    cidade: dados.cidade,
                    uf: dados.uf
                })
            });

            if (!res.ok) throw new Error('Falha na geocodificação');

            const data = await res.json();
            
            setConfig(prev => ({
                ...prev,
                [section]: {
                    lat: data.coordinates[0],
                    lng: data.coordinates[1]
                }
            }));
            
            setMessage({ type: 'success', text: `Localização de ${section} atualizada!` });

        } catch (error) {
            setMessage({ type: 'error', text: 'Endereço não encontrado no mapa.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/gerenciar/configuracoes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (!res.ok) throw new Error('Falha ao salvar');
            
            setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Erro ao salvar.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
                Configurações do Sistema
            </Typography>

            {message && (
                <Alert severity={message.type as any} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
                    {message.text}
                </Alert>
            )}

            <Paper elevation={3} sx={{ p: 4 }}>
                <Typography variant="h6" gutterBottom color="primary">
                    Padrões de Rota
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                    Defina os pontos de início e fim. Você pode buscar pelo endereço (CEP + Número) ou inserir coordenadas manualmente.
                </Typography>

                <Divider sx={{ my: 3 }} />

                {/* --- LAYOUT RESPONSIVO COM FLEX/STACK (SUBSTITUINDO GRID) --- */}
                <Box 
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' }, // Empilha no mobile
                        gap: 4,
                    }}
                >
                    {/* COLUNA DA ESQUERDA: Formulários (Ocupa 5/12 em desktop) */}
                    <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 40%' } }}>
                        <Stack spacing={5}>
                            
                            {/* === BLOCO INÍCIO === */}
                            <Box sx={{ p: 2, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px solid #eee' }}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'success.main', mb: 2 }}>
                                    📍 Ponto de Início (Garagem)
                                </Typography>
                                
                                {/* Linha 1: CEP e Número */}
                                <Stack direction="row" spacing={1} mb={1}>
                                    <TextField 
                                        label="CEP" size="small" sx={{ width: '130px' }}
                                        value={endInicio.cep}
                                        onChange={(e) => handleChangeAddress('inicio', 'cep', e.target.value)}
                                        onBlur={() => buscarCep('inicio')}
                                        placeholder="00000-000"
                                    />
                                    <TextField 
                                        label="Número" size="small" fullWidth
                                        value={endInicio.numero}
                                        onChange={(e) => handleChangeAddress('inicio', 'numero', e.target.value)}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton onClick={() => buscarCoordenadas('inicio')} color="primary" title="Buscar coordenadas no mapa">
                                                        <SearchIcon />
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </Stack>

                                {/* VISUALIZAÇÃO DO ENDEREÇO ENCONTRADO */}
                                <Box mb={2} minHeight="24px">
                                    {endInicio.logradouro ? (
                                        <Typography variant="caption" display="block" color="text.primary" fontWeight="500">
                                            {endInicio.logradouro} - {endInicio.cidade}/{endInicio.uf}
                                        </Typography>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">Digite o CEP para buscar o endereço...</Typography>
                                    )}
                                </Box>

                                {/* Linha 2: Coordenadas (Resultado) */}
                                <Stack direction="row" spacing={1}>
                                    <TextField
                                        label="Latitude" size="small" fullWidth
                                        type="number"
                                        value={config.inicio.lat || ''}
                                        onChange={(e) => handleChangeCoord('inicio', 'lat', e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                    <TextField
                                        label="Longitude" size="small" fullWidth
                                        type="number"
                                        value={config.inicio.lng || ''}
                                        onChange={(e) => handleChangeCoord('inicio', 'lng', e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Stack>
                            </Box>

                            {/* === BLOCO FIM === */}
                            <Box sx={{ p: 2, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px solid #eee' }}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'error.main', mb: 2 }}>
                                    🏁 Ponto de Chegada (Retorno)
                                </Typography>

                                {/* Linha 1: CEP e Número */}
                                <Stack direction="row" spacing={1} mb={1}>
                                    <TextField 
                                        label="CEP" size="small" sx={{ width: '130px' }}
                                        value={endFim.cep}
                                        onChange={(e) => handleChangeAddress('fim', 'cep', e.target.value)}
                                        onBlur={() => buscarCep('fim')}
                                        placeholder="00000-000"
                                    />
                                    <TextField 
                                        label="Número" size="small" fullWidth
                                        value={endFim.numero}
                                        onChange={(e) => handleChangeAddress('fim', 'numero', e.target.value)}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton onClick={() => buscarCoordenadas('fim')} color="primary" title="Buscar coordenadas no mapa">
                                                        <SearchIcon />
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </Stack>

                                {/* VISUALIZAÇÃO DO ENDEREÇO ENCONTRADO */}
                                <Box mb={2} minHeight="24px">
                                    {endFim.logradouro ? (
                                        <Typography variant="caption" display="block" color="text.primary" fontWeight="500">
                                            {endFim.logradouro} - {endFim.cidade}/{endFim.uf}
                                        </Typography>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">Digite o CEP para buscar o endereço...</Typography>
                                    )}
                                </Box>

                                {/* Linha 2: Coordenadas */}
                                <Stack direction="row" spacing={1}>
                                    <TextField
                                        label="Latitude" size="small" fullWidth
                                        type="number"
                                        value={config.fim.lat || ''}
                                        onChange={(e) => handleChangeCoord('fim', 'lat', e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                    <TextField
                                        label="Longitude" size="small" fullWidth
                                        type="number"
                                        value={config.fim.lng || ''}
                                        onChange={(e) => handleChangeCoord('fim', 'lng', e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Stack>
                            </Box>
                        </Stack>
                    </Box>

                    {/* COLUNA DA DIREITA: Mapa (Ocupa o restante) */}
                    <Box sx={{ flex: 1 }}>
                        <ConfigMap inicio={config.inicio} fim={config.fim} />
                    </Box>
                </Box>
                {/* --- FIM LAYOUT RESPONSIVO --- */}

                <Box mt={4} display="flex" justifyContent="flex-start">
                    <Button 
                        variant="contained" 
                        size="large"
                        startIcon={saving ? <CircularProgress size={20} color="inherit"/> : <SaveIcon />}
                        onClick={handleSave}
                        disabled={saving}
                        sx={{ minWidth: 200 }}
                    >
                        {saving ? 'Salvando...' : 'Salvar Padrões'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}