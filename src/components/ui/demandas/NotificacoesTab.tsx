'use client';

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, TextField, List, ListItem, ListItemText,
    Divider, CircularProgress, Alert, Stack, IconButton, Card, CardContent,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AddIcon from '@mui/icons-material/Add';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import { upload } from '@vercel/blob/client';
import { DemandaComIdStatus } from '@/types/demanda';

interface Notificacao {
    id: number;
    numero_processo: string;
    numero_notificacao?: string;
    descricao?: string;
    data_emissao: string;
    prazo_dias: number;
    vencimento: string;
    status: string;
    fotos: { url: string; nome: string }[];
}

interface NotificacoesTabProps {
    demanda: DemandaComIdStatus;
}

export default function NotificacoesTab({ demanda }: NotificacoesTabProps) {
    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Estado do formulário
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        numero_processo: '',
        numero_notificacao: '',
        descricao: '',
        data_emissao: new Date().toISOString().split('T')[0],
        prazo_dias: 15,
        fotos: [] as { url: string; nome: string }[]
    });

    const fetchNotificacoes = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/notificacoes?demanda_id=${demanda.id}`);
            if (res.ok) {
                const data = await res.json();
                setNotificacoes(data);
            }
        } catch (err) {
            console.error('Erro ao buscar notificações:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (demanda.id) fetchNotificacoes();
    }, [demanda.id]);

    const handleUploadFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        setIsSaving(true);
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
            setError('Erro ao fazer upload das fotos.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (!formData.numero_processo) {
            setError('Número do processo é obrigatório.');
            return;
        }

        setIsSaving(true);
        setError(null);

        // Calcula vencimento
        const emission = new Date(formData.data_emissao);
        emission.setDate(emission.getDate() + formData.prazo_dias);

        const payload = {
            ...formData,
            demanda_id: demanda.id,
            vencimento: emission.toISOString().split('T')[0],
        };

        try {
            const res = await fetch('/api/notificacoes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowForm(false);
                setFormData({
                    numero_processo: '',
                    numero_notificacao: '',
                    descricao: '',
                    data_emissao: new Date().toISOString().split('T')[0],
                    prazo_dias: 15,
                    fotos: []
                });
                fetchNotificacoes();
            } else {
                const data = await res.json();
                setError(data.message || 'Erro ao salvar notificação.');
            }
        } catch (err) {
            setError('Erro de conexão.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja remover esta notificação?')) return;
        try {
            const res = await fetch(`/api/notificacoes/${id}`, { method: 'DELETE' });
            if (res.ok) fetchNotificacoes();
        } catch (err) {
            console.error('Erro ao deletar:', err);
        }
    };

    if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

    return (
        <Box sx={{ mt: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Notificações / Fiscalização</Typography>
                {!showForm && (
                    <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={() => setShowForm(true)}>
                        Relacionar Notificação
                    </Button>
                )}
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {showForm && (
                <Card sx={{ mb: 3, bgcolor: '#fbfbfb', border: '1px dashed #ccc' }}>
                    <CardContent>
                        <Typography variant="subtitle2" gutterBottom>Nova Notificação Externa</Typography>
                        <Stack spacing={2}>
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    label="Nº Processo (Manual)"
                                    fullWidth
                                    size="small"
                                    value={formData.numero_processo}
                                    onChange={e => setFormData({ ...formData, numero_processo: e.target.value })}
                                />
                                <TextField
                                    label="Nº Notificação (Sistema Externo)"
                                    fullWidth
                                    size="small"
                                    value={formData.numero_notificacao}
                                    onChange={e => setFormData({ ...formData, numero_notificacao: e.target.value })}
                                />
                            </Stack>
                            <TextField
                                label="Descrição / Motivo da Notificação"
                                fullWidth
                                multiline
                                rows={2}
                                size="small"
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
                                    onChange={e => setFormData({ ...formData, prazo_dias: parseInt(e.target.value) })}
                                />
                            </Stack>

                            <Box>
                                <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} size="small">
                                    Anexar Fotos / PDF
                                    <input type="file" hidden multiple accept="image/*,application/pdf" onChange={handleUploadFotos} />
                                </Button>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                    {formData.fotos.map((f, i) => (
                                        <Typography key={i} variant="caption" sx={{ bgcolor: '#eee', px: 1, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            {f.nome.toLowerCase().endsWith('.pdf') ? <PictureAsPdfIcon sx={{ fontSize: 12 }} /> : <ImageIcon sx={{ fontSize: 12 }} />}
                                            {f.nome}
                                        </Typography>
                                    ))}
                                </Box>
                            </Box>

                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button size="small" onClick={() => setShowForm(false)}>Cancelar</Button>
                                <Button size="small" variant="contained" onClick={handleSave} disabled={isSaving}>
                                    {isSaving ? <CircularProgress size={20} /> : 'Salvar Notificação'}
                                </Button>
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {notificacoes.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Nenhuma notificação relacionada a esta demanda.
                </Typography>
            ) : (
                <List>
                    {notificacoes.map((n) => (
                        <React.Fragment key={n.id}>
                            <ListItem
                                secondaryAction={
                                    <IconButton edge="end" onClick={() => handleDelete(n.id)} color="error">
                                        <DeleteIcon />
                                    </IconButton>
                                }
                            >
                                <ListItemText
                                    primary={`Processo: ${n.numero_processo} | Notificação: ${n.numero_notificacao || 'N/A'}`}
                                    secondary={
                                        <>
                                            <Typography component="span" variant="body2" display="block">
                                                {n.descricao}
                                            </Typography>
                                            <Typography component="span" variant="caption" color={new Date(n.vencimento) < new Date() ? 'error.main' : 'text.secondary'} sx={{ fontWeight: 'bold' }}>
                                                Vencimento: {new Date(n.vencimento).toLocaleDateString('pt-BR')} ({n.prazo_dias} dias)
                                            </Typography>
                                        </>
                                    }
                                />
                            </ListItem>
                            {n.fotos && n.fotos.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 1, px: 2, pb: 2, flexWrap: 'wrap' }}>
                                    {n.fotos.map((foto: any, idx: number) => (
                                        foto.url.toLowerCase().endsWith('.pdf') ? (
                                            <Box
                                                key={idx}
                                                onClick={() => window.open(foto.url, '_blank')}
                                                sx={{
                                                    width: 60, height: 60, bgcolor: '#f9f9f9',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    borderRadius: 1, border: '1px solid #ddd', cursor: 'pointer',
                                                    '&:hover': { bgcolor: '#f0f0f0' }
                                                }}
                                            >
                                                <PictureAsPdfIcon color="error" />
                                            </Box>
                                        ) : (
                                            <Box
                                                key={idx}
                                                component="img"
                                                src={foto.url}
                                                sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1, border: '1px solid #ddd', cursor: 'pointer' }}
                                                onClick={() => window.open(foto.url, '_blank')}
                                            />
                                        )
                                    ))}
                                </Box>
                            )}
                            <Divider />
                        </React.Fragment>
                    ))}
                </List>
            )}
        </Box>
    );
}
