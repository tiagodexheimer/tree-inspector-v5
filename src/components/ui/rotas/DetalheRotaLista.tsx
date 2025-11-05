// src/components/ui/rotas/DetalheRotaLista.tsx
'use client';

import React from 'react';
import {
    List, ListItem, ListItemText, Box, Typography, Chip, Paper,
    ListItemIcon
} from '@mui/material';
import { DemandaComOrdem } from '@/app/rotas/[id]/page'; // Importaremos o tipo da página

// Props que o componente receberá
interface DetalheRotaListaProps {
    demandas: DemandaComOrdem[];
}

// Função auxiliar para formatar endereço curto
const formatEnderecoCurto = (demanda: DemandaComOrdem): string => {
    const parts = [
        demanda.logradouro,
        demanda.numero ? `, ${demanda.numero}` : '',
        demanda.bairro ? ` - ${demanda.bairro}` : '',
    ];
    return parts.filter(Boolean).join('').trim() || 'Endereço não informado';
};

export default function DetalheRotaLista({ demandas }: DetalheRotaListaProps) {
    return (
        <Paper elevation={1} sx={{ maxHeight: '70vh', overflow: 'auto' }}>
            <List>
                {demandas.map((demanda, index) => (
                    <ListItem key={demanda.id} divider>
                        {/* Número da Ordem */}
                        <ListItemIcon sx={{ minWidth: 40, fontWeight: 'bold', color: 'primary.main', fontSize: '1.1rem' }}>
                           {index + 1}.
                        </ListItemIcon>

                        {/* Detalhes da Demanda */}
                        <ListItemText
                            primary={formatEnderecoCurto(demanda)}
                            secondary={demanda.tipo_demanda || 'Sem tipo'}
                        />

                        {/* Status Atual */}
                        <Chip
                            label={demanda.status_nome || 'N/D'}
                            size="small"
                            sx={{
                                backgroundColor: demanda.status_cor || '#bdbdbd',
                                color: '#fff',
                                fontWeight: 'bold',
                                minWidth: '90px',
                                ml: 1
                            }}
                        />
                    </ListItem>
                ))}
                {demandas.length === 0 && (
                     <ListItem>
                        <ListItemText primary="Nenhuma demanda nesta rota." />
                    </ListItem>
                )}
            </List>
        </Paper>
    );
}