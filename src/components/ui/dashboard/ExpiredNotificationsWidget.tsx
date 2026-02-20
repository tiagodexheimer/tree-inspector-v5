'use client';

import React from 'react';
import {
    Box, Typography, List, ListItem, ListItemText, Divider,
    Chip, Button, Card, CardContent, IconButton, Tooltip
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Link from 'next/link';

interface ExpiredNotificacao {
    id: number;
    numero_processo: string;
    vencimento: string;
    demanda_id?: number;
    demanda_protocolo?: string;
    logradouro?: string;
    numero?: string;
}

interface ExpiredNotificationsWidgetProps {
    notifications: ExpiredNotificacao[];
}

export default function ExpiredNotificationsWidget({ notifications }: ExpiredNotificationsWidgetProps) {
    if (notifications.length === 0) return null;

    return (
        <Card elevation={3} sx={{ borderLeft: '6px solid #d32f2f' }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <WarningIcon color="error" sx={{ mr: 1 }} />
                    <Typography variant="h6" fontWeight="bold" color="error">
                        Prazos de Fiscalização Expirados
                    </Typography>
                    <Chip
                        label={notifications.length}
                        color="error"
                        size="small"
                        sx={{ ml: 2, fontWeight: 'bold' }}
                    />
                </Box>

                <Typography variant="body2" color="text.secondary" paragraph>
                    As notificações abaixo venceram o prazo e requerem re-vistoria.
                </Typography>

                <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {notifications.map((n, idx) => (
                        <React.Fragment key={n.id}>
                            <ListItem
                                disablePadding
                                sx={{ py: 1 }}
                                secondaryAction={
                                    <Tooltip title="Ver Detalhes">
                                        <IconButton
                                            component={Link}
                                            href={n.demanda_id ? `/demandas?id=${n.demanda_id}` : '/demandas'}
                                            size="small"
                                        >
                                            <ArrowForwardIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                }
                            >
                                <ListItemText
                                    primary={
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                            Proc: {n.numero_processo} {n.demanda_protocolo ? `(Demanda: ${n.demanda_protocolo})` : '(Avulsa)'}
                                        </Typography>
                                    }
                                    secondary={
                                        <>
                                            <Typography variant="caption" display="block">
                                                {n.logradouro}, {n.numero}
                                            </Typography>
                                            <Typography variant="caption" color="error" fontWeight="bold">
                                                Vencido em: {new Date(n.vencimento).toLocaleDateString('pt-BR')}
                                            </Typography>
                                        </>
                                    }
                                />
                            </ListItem>
                            {idx < notifications.length - 1 && <Divider component="li" />}
                        </React.Fragment>
                    ))}
                </List>

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        color="error"
                        size="small"
                        component={Link}
                        href="/demandas?filter=expired_notifications"
                    >
                        Criar Rota de Re-vistoria
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
}
