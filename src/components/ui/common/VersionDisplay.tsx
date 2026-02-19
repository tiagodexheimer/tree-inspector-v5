'use client';

import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, IconButton, Typography, Box, Chip, Divider
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AndroidIcon from '@mui/icons-material/Android';
import packageJson from '../../../../package.json';

interface ChangelogEntry {
    version: string;
    date: string;
    changes: { type: 'added' | 'fixed' | 'changed' | 'removed'; text: string }[];
}

const changelog: ChangelogEntry[] = [
    {
        version: '1.2.0',
        date: '19/02/2026',
        changes: [
            { type: 'added', text: 'Criação de demandas em campo via app Android com fotos e legenda automática' },
            { type: 'added', text: 'Botão "Nova Demanda" na tela de detalhes da rota' },
            { type: 'added', text: 'Notificações vinculadas às demandas com status e prazo de vencimento' },
            { type: 'fixed', text: 'Correção de segurança na exclusão de demandas (filtro por organização)' },
            { type: 'fixed', text: 'Correção do crash ao retornar da câmera no Android' },
            { type: 'changed', text: 'Refatoração da lógica de autenticação na API de demandas' },
            { type: 'changed', text: 'Refatoração da sincronização de rotas (merge de status local)' },
            { type: 'removed', text: 'Remoção de campos e métodos legados não utilizados' },
        ],
    },
    {
        version: '1.1.0',
        date: '09/02/2026',
        changes: [
            { type: 'added', text: 'Otimização da API de detalhe da árvore (Power Query)' },
            { type: 'added', text: 'Filtro alfabético por espécie com letras desabilitadas quando vazias' },
            { type: 'added', text: 'Sincronização do campo "árvore removida" entre app e servidor' },
            { type: 'fixed', text: 'Correção de filtros de ordens de serviço (status "Aguardando Revisão")' },
            { type: 'fixed', text: 'Correção de exibição de status "undefined" nas demandas' },
            { type: 'changed', text: 'Redesign da tela de detalhe da árvore no Android' },
            { type: 'changed', text: 'Melhoria na exibição de checklist nas ordens de serviço' },
        ],
    },
    {
        version: '1.0.0',
        date: '15/01/2026',
        changes: [
            { type: 'added', text: 'Lançamento inicial da plataforma Tree Inspector' },
            { type: 'added', text: 'Gestão de árvores com dados dendrométricos e fitossanitários' },
            { type: 'added', text: 'Sistema de vistorias com formulários dinâmicos' },
            { type: 'added', text: 'Módulo de demandas com criação, rotas e notificações' },
            { type: 'added', text: 'Ordens de serviço com checklist de execução' },
            { type: 'added', text: 'Aplicativo Android com sincronização offline' },
        ],
    },
];

const typeConfig: Record<string, { label: string; color: 'success' | 'error' | 'info' | 'warning' }> = {
    added: { label: 'Novo', color: 'success' },
    fixed: { label: 'Correção', color: 'error' },
    changed: { label: 'Alterado', color: 'info' },
    removed: { label: 'Removido', color: 'warning' },
};

const VersionDisplay: React.FC = () => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                href="/downloads/app-release-v1.2.apk"
                download
                startIcon={<AndroidIcon />}
                size="small"
                variant="outlined"
                sx={{
                    fontSize: '11px',
                    textTransform: 'none',
                    color: '#3ddc84',
                    borderColor: '#3ddc8444',
                    mx: 2,
                    mb: 0.5,
                    '&:hover': {
                        borderColor: '#3ddc84',
                        backgroundColor: '#3ddc8410',
                    },
                }}
            >
                Baixar App Android
            </Button>
            <div style={{
                fontSize: '11px',
                color: '#888',
                padding: '10px 20px',
                textAlign: 'center',
                borderTop: '1px solid #eee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
            }}>
                Versão v{packageJson.version}
                <IconButton
                    size="small"
                    onClick={() => setOpen(true)}
                    sx={{
                        padding: '2px',
                        color: '#aaa',
                        '&:hover': { color: '#666' },
                    }}
                    title="Changelog"
                >
                    <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                </IconButton>
            </div>

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3, maxHeight: '80vh' }
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h6" fontWeight={700}>
                        📋 Changelog
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Histórico de atualizações da plataforma
                    </Typography>
                </DialogTitle>

                <DialogContent dividers sx={{ p: 0 }}>
                    {changelog.map((entry, idx) => (
                        <Box key={entry.version}>
                            {idx > 0 && <Divider />}
                            <Box sx={{ px: 3, py: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        v{entry.version}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        — {entry.date}
                                    </Typography>
                                </Box>
                                <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none' }}>
                                    {entry.changes.map((change, i) => {
                                        const config = typeConfig[change.type];
                                        return (
                                            <Box
                                                component="li"
                                                key={i}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: 1,
                                                    mb: 0.8,
                                                    fontSize: '0.875rem',
                                                }}
                                            >
                                                <Chip
                                                    label={config.label}
                                                    color={config.color}
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: '0.65rem',
                                                        fontWeight: 700,
                                                        minWidth: 65,
                                                        mt: '1px',
                                                    }}
                                                />
                                                <Typography variant="body2">
                                                    {change.text}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>
                        </Box>
                    ))}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 1.5 }}>
                    <Button onClick={() => setOpen(false)} variant="outlined" size="small">
                        Fechar
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default VersionDisplay;
