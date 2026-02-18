'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
    CircularProgress, Alert, Stack, IconButton, Divider
} from "@mui/material";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { upload } from '@vercel/blob/client';

interface CriarNotificacaoAvulsaModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function CriarNotificacaoAvulsaModal({ open, onClose, onSuccess }: CriarNotificacaoAvulsaModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [cepLoading, setCepLoading] = useState(false);
    const [geocodingLoading, setGeocodingLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        numero_processo: '',
        numero_notificacao: '',
        descricao: '',
        data_emissao: new Date().toISOString().split('T')[0],
        prazo_dias: 15,
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
        uf: '',
        cep: '',
        lat: null as number | null,
        lng: null as number | null,
        fotos: [] as { url: string; nome: string }[]
    });

    const handleCepBlur = async () => {
        const cepRaw = formData.cep.replace(/\D/g, '');
        if (cepRaw.length !== 8) return;

        setCepLoading(true);
        setError(null);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`);
            const data = await res.json();
            if (data.erro) throw new Error('CEP não encontrado.');

            setFormData(prev => ({
                ...prev,
                logradouro: data.logradouro,
                bairro: data.bairro,
                cidade: data.localidade,
                uf: data.uf
            }));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCepLoading(false);
        }
    };

    // Geocodificação automática quando o endereço muda
    useEffect(() => {
        const attemptGeocode = async () => {
            if (formData.logradouro && formData.numero && formData.cidade && formData.uf) {
                setGeocodingLoading(true);
                try {
                    const res = await fetch('/api/geocode', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            logradouro: formData.logradouro,
                            numero: formData.numero,
                            cidade: formData.cidade,
                            uf: formData.uf
                        })
                    });
                    const data = await res.json();
                    if (data.coordinates) {
                        setFormData(prev => ({ ...prev, lat: data.coordinates[0], lng: data.coordinates[1] }));
                    }
                } catch (err) {
                    console.error('Erro na geocoficação:', err);
                } finally {
                    setGeocodingLoading(false);
                }
            }
        };

        const timer = setTimeout(attemptGeocode, 1000);
        return () => clearTimeout(timer);
    }, [formData.logradouro, formData.numero, formData.cidade, formData.uf]);

    const handleUploadFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        setIsLoading(true);
        const newFotos = [...formData.fotos];
        try {
            for (const file of Array.from(e.target.files)) {
                const blob = await upload(file.name, file, {
                    access: 'public',
                    handleUploadUrl: '/api/upload',
                });
                newFotos.push({ url: blob.url, nome: file.name });
            }
            setFormData(prev => ({ ...prev, fotos: newFotos }));
        } catch (err) {
            setError('Erro no upload.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.numero_processo || !formData.logradouro || !formData.numero) {
            setError('Preencha os campos obrigatórios (Processo, Logradouro, Número).');
            return;
        }

        setIsLoading(true);
        setError(null);

        // Calcula vencimento
        const emission = new Date(formData.data_emissao);
        emission.setDate(emission.getDate() + formData.prazo_dias);

        const payload = {
            ...formData,
            vencimento: emission.toISOString().split('T')[0],
        };

        try {
            const res = await fetch('/api/notificacoes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                if (onSuccess) onSuccess();
                onClose();
            } else {
                const data = await res.json();
                setError(data.message || 'Erro ao criar notificação.');
            }
        } catch (err) {
            setError('Erro de conexão.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Nova Notificação Avulsa (Sem Demanda)</DialogTitle>
            <DialogContent dividers>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">Dados da Fiscalização</Typography>
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Nº Processo"
                            required
                            fullWidth
                            size="small"
                            value={formData.numero_processo}
                            onChange={e => setFormData({ ...formData, numero_processo: e.target.value })}
                        />
                        <TextField
                            label="Nº Notificação"
                            fullWidth
                            size="small"
                            value={formData.numero_notificacao}
                            onChange={e => setFormData({ ...formData, numero_notificacao: e.target.value })}
                        />
                    </Stack>

                    <TextField
                        label="Descrição da Notificação"
                        fullWidth
                        multiline
                        rows={3}
                        value={formData.descricao}
                        onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                    />

                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Data Emissão"
                            type="date"
                            fullWidth
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            value={formData.data_emissao}
                            onChange={e => setFormData({ ...formData, data_emissao: e.target.value })}
                        />
                        <TextField
                            label="Prazo (Dias)"
                            type="number"
                            fullWidth
                            size="small"
                            value={formData.prazo_dias}
                            onChange={e => setFormData({ ...formData, prazo_dias: parseInt(e.target.value) || 0 })}
                        />
                    </Stack>

                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" fontWeight="bold">Endereço do Local</Typography>

                    <TextField
                        label="CEP"
                        fullWidth
                        size="small"
                        value={formData.cep}
                        onBlur={handleCepBlur}
                        onChange={e => setFormData({ ...formData, cep: e.target.value })}
                        InputProps={{ endAdornment: cepLoading ? <CircularProgress size={20} /> : null }}
                    />

                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Logradouro"
                            required
                            fullWidth
                            size="small"
                            value={formData.logradouro}
                            onChange={e => setFormData({ ...formData, logradouro: e.target.value })}
                        />
                        <TextField
                            label="Número"
                            required
                            sx={{ width: 120 }}
                            size="small"
                            value={formData.numero}
                            onChange={e => setFormData({ ...formData, numero: e.target.value })}
                        />
                    </Stack>

                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Bairro"
                            fullWidth
                            size="small"
                            value={formData.bairro}
                            onChange={e => setFormData({ ...formData, bairro: e.target.value })}
                        />
                        <TextField
                            label="Cidade"
                            fullWidth
                            size="small"
                            value={formData.cidade}
                            onChange={e => setFormData({ ...formData, cidade: e.target.value })}
                        />
                        <TextField
                            label="UF"
                            sx={{ width: 80 }}
                            size="small"
                            value={formData.uf}
                            onChange={e => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                        />
                    </Stack>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                        <MyLocationIcon color={formData.lat ? "primary" : "disabled"} />
                        <Typography variant="caption" sx={{ flexGrow: 1 }}>
                            {geocodingLoading ? 'Obtendo coordenadas...' :
                                formData.lat ? `Coordenadas: ${formData.lat.toFixed(6)}, ${formData.lng?.toFixed(6)}` :
                                    'Geolocalização pendente'}
                        </Typography>
                        {geocodingLoading && <CircularProgress size={16} />}
                    </Box>

                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" fontWeight="bold">Registro Fotográfico</Typography>

                    <Box>
                        <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} fullWidth>
                            Carregar Fotos
                            <input type="file" hidden multiple accept="image/*" onChange={handleUploadFotos} />
                        </Button>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                            {formData.fotos.map((f, i) => (
                                <Box key={i} sx={{ position: 'relative' }}>
                                    <Box component="img" src={f.url} sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1 }} />
                                    <IconButton
                                        size="small"
                                        sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}
                                        onClick={() => setFormData(prev => ({ ...prev, fotos: prev.fotos.filter((_, idx) => idx !== i) }))}
                                    >
                                        <Typography variant="caption">×</Typography>
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isLoading}>Cancelar</Button>
                <Button onClick={handleSave} variant="contained" disabled={isLoading || geocodingLoading}>
                    {isLoading ? <CircularProgress size={24} /> : 'Registrar Fiscalização'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
