// src/app/gerenciar/configuracoes/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { 
    Box, Typography, Paper, TextField, Button, Divider, Alert, CircularProgress, Stack, IconButton, InputAdornment, Chip 
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import BusinessIcon from '@mui/icons-material/Business';
import GroupIcon from '@mui/icons-material/Group'; // NOVO: Ícone para Grupo
import GroupAddIcon from '@mui/icons-material/GroupAdd'; // NOVO: Ícone para Adicionar Grupo
import Link from 'next/link'; // NOVO: Importar Link
import dynamic from 'next/dynamic';

// Importação Dinâmica do Mapa
const ConfigMap = dynamic(() => import('@/components/ui/configuracoes/ConfigMap'), {
    ssr: false,
    loading: () => <Box sx={{ height: '100%', minHeight: 400, bgcolor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>
});

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

    // [NOVO] Estados da Organização
    const [orgName, setOrgName] = useState('');
    const [planType, setPlanType] = useState('Free'); // Assume 'Free' como padrão

    // Estados auxiliares para os campos de endereço (Visualização)
    const [endInicio, setEndInicio] = useState<EnderecoState>({ cep: '', numero: '', logradouro: '', cidade: '', uf: '' });
    const [endFim, setEndFim] = useState<EnderecoState>({ cep: '', numero: '', logradouro: '', cidade: '', uf: '' });

    // Carregar configurações iniciais
    useEffect(() => {
        // [ALTERADO] Busca dados de config, incluindo orgName e planType
        fetch('/api/gerenciar/configuracoes')
            .then(res => res.json())
            .then(data => {
                const safeData = data || {};
                
                setConfig({
                    inicio: safeData.inicio || { lat: 0, lng: 0 },
                    fim: safeData.fim || { lat: 0, lng: 0 }
                });

                setOrgName(safeData.orgName || 'Minha Organização');
                setPlanType(safeData.planType || 'Free');
            })
            .catch(() => setMessage({ type: 'error', text: 'Erro ao carregar configurações.' }))
            .finally(() => setLoading(false));
    }, []);

    // ... (funções handleChangeCoord, handleChangeAddress, buscarCep, buscarCoordenadas, handleSave - MANTIDAS IGUAIS) ...
    // Note: Mantive as funções auxiliares pois você já as tinha, mas o espaço para elas foi omitido por brevidade.

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

    const handleChangeAddress = (section: 'inicio' | 'fim', field: keyof EnderecoState, value: string) => {
        if (section === 'inicio') {
            setEndInicio(prev => ({ ...prev, [field]: value }));
        } else {
            setEndFim(prev => ({ ...prev, [field]: value }));
        }
    };

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
                body: JSON.stringify({
                    ...config,
                    orgName 
                })
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
    
    const isFreePlan = planType === 'Free';

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

            {/* NOVO: LINK PARA GERENCIAMENTO DE MEMBROS */}
            <Paper elevation={3} sx={{ p: 4, mb: 4, borderLeft: '6px solid #1976d2' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                    <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <GroupIcon /> Gerenciamento de Membros
                    </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                    Gerencie os membros da sua organização e envie convites por e-mail, de acordo com o seu plano atual ({planType}).
                </Typography>

                <Link href="/gerenciar/usuarios" passHref style={{ textDecoration: 'none' }}>
                    <Button variant="contained" startIcon={<GroupAddIcon />} size="medium" sx={{ mt: 1 }}>
                        Acessar Membros e Convites
                    </Button>
                </Link>
            </Paper>
            
            {/* SEÇÃO DA ORGANIZAÇÃO (MANTIDA) */}
            <Paper elevation={3} sx={{ p: 4, mb: 4, borderLeft: '6px solid #1976d2' }}>
                {/* ... (Conteúdo da Organização) ... */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                    <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BusinessIcon /> Dados da Organização
                    </Typography>
                    <Chip 
                        label={planType} 
                        color={isFreePlan ? 'default' : 'success'} 
                        variant={isFreePlan ? 'outlined' : 'filled'}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                    />
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                    Identificação da sua empresa nos relatórios e sistema.
                </Typography>

                <Box sx={{ maxWidth: 600 }}>
                    <TextField
                        label="Nome da Organização"
                        fullWidth
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        disabled={isFreePlan}
                        helperText={isFreePlan ? "Usuários do plano Free não podem alterar o nome da organização." : "Este nome aparecerá nos relatórios."}
                        InputProps={{
                            endAdornment: isFreePlan ? <Typography variant="caption" color="text.disabled">Somente Leitura</Typography> : null
                        }}
                    />
                </Box>
            </Paper>

            {/* SEÇÃO DE ROTAS (MANTIDA) */}
            <Paper elevation={3} sx={{ p: 4 }}>
                {/* ... (Conteúdo de Padrões de Rota e Mapa) ... */}
                <Typography variant="h6" gutterBottom color="primary">
                    Padrões de Rota
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                    Defina os pontos de início e fim. Você pode buscar pelo endereço (CEP + Número) ou inserir coordenadas manualmente.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Box 
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        gap: 4,
                    }}
                >
                    {/* COLUNA DA ESQUERDA: Formulários */}
                    <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 40%' } }}>
                        <Stack spacing={5}>
                            
                            {/* BLOCO INÍCIO */}
                            <Box sx={{ p: 2, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px solid #eee' }}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'success.main', mb: 2 }}>
                                    📍 Ponto de Início (Garagem)
                                </Typography>
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
                                <Box mb={2} minHeight="24px">
                                    {endInicio.logradouro ? (
                                        <Typography variant="caption" display="block" color="text.primary" fontWeight="500">
                                            {endInicio.logradouro} - {endInicio.cidade}/{endInicio.uf}
                                        </Typography>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">Digite o CEP para buscar o endereço...</Typography>
                                    )}
                                </Box>
                                <Stack direction="row" spacing={1}>
                                    <TextField label="Latitude" size="small" fullWidth type="number" value={config.inicio.lat || ''} onChange={(e) => handleChangeCoord('inicio', 'lat', e.target.value)} InputLabelProps={{ shrink: true }} />
                                    <TextField label="Longitude" size="small" fullWidth type="number" value={config.inicio.lng || ''} onChange={(e) => handleChangeCoord('inicio', 'lng', e.target.value)} InputLabelProps={{ shrink: true }} />
                                </Stack>
                            </Box>

                            {/* BLOCO FIM */}
                            <Box sx={{ p: 2, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px solid #eee' }}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'error.main', mb: 2 }}>
                                    🏁 Ponto de Chegada (Retorno)
                                </Typography>
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
                                <Box mb={2} minHeight="24px">
                                    {endFim.logradouro ? (
                                        <Typography variant="caption" display="block" color="text.primary" fontWeight="500">
                                            {endFim.logradouro} - {endFim.cidade}/{endFim.uf}
                                        </Typography>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">Digite o CEP para buscar o endereço...</Typography>
                                    )}
                                </Box>
                                <Stack direction="row" spacing={1}>
                                    <TextField label="Latitude" size="small" fullWidth type="number" value={config.fim.lat || ''} onChange={(e) => handleChangeCoord('fim', 'lat', e.target.value)} InputLabelProps={{ shrink: true }} />
                                    <TextField label="Longitude" size="small" fullWidth type="number" value={config.fim.lng || ''} onChange={(e) => handleChangeCoord('fim', 'lng', e.target.value)} InputLabelProps={{ shrink: true }} />
                                </Stack>
                            </Box>
                        </Stack>
                    </Box>

                    {/* COLUNA DA DIREITA: Mapa */}
                    <Box sx={{ flex: 1 }}>
                        <ConfigMap inicio={config.inicio} fim={config.fim} />
                    </Box>
                </Box>

                <Box mt={4} display="flex" justifyContent="flex-start">
                    <Button 
                        variant="contained" 
                        size="large"
                        startIcon={saving ? <CircularProgress size={20} color="inherit"/> : <SaveIcon />}
                        onClick={handleSave}
                        disabled={saving}
                        sx={{ minWidth: 200 }}
                    >
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}