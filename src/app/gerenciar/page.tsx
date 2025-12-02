// src/app/gerenciar/page.tsx
'use client';

import React from 'react';
import { Box, Typography, Grid, Card, CardContent, CardActionArea } from '@mui/material';
import Link from 'next/link';

// Ícones
import GroupIcon from '@mui/icons-material/Group';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FlagIcon from '@mui/icons-material/Flag';
import ForestIcon from '@mui/icons-material/Forest';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
// [NOVO] Importe o ícone de configurações
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest'; 

const manageItems = [
    { title: 'Usuários', icon: <GroupIcon fontSize="large" />, href: '/gerenciar/usuarios', desc: 'Gerenciar contas e acessos' },
    { title: 'Tipos de Demanda', icon: <AssignmentIcon fontSize="large" />, href: '/gerenciar/tipos-demanda', desc: 'Categorias de serviço' },
    { title: 'Status', icon: <FlagIcon fontSize="large" />, href: '/gerenciar/status', desc: 'Fluxo de trabalho' },
    { title: 'Espécies', icon: <ForestIcon fontSize="large" />, href: '/gerenciar/especies', desc: 'Catálogo de árvores' },
    { title: 'Formulários', icon: <FormatListBulletedIcon fontSize="large" />, href: '/gerenciar/formularios', desc: 'Campos personalizados' },
    
    // [NOVO] Adicione este item
    { 
        title: 'Configurações', 
        icon: <SettingsSuggestIcon fontSize="large" />, 
        href: '/gerenciar/configuracoes', 
        desc: 'Parâmetros globais do sistema' 
    },
];

export default function GerenciarPage() {
    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
                Gerenciamento do Sistema
            </Typography>
            
            <Grid container spacing={3}>
                {manageItems.map((item) => (
                    <Grid item xs={12} sm={6} md={4} key={item.title}>
                        <Card elevation={3} sx={{ height: '100%', transition: '0.3s', '&:hover': { transform: 'translateY(-5px)' } }}>
                            <CardActionArea component={Link} href={item.href} sx={{ height: '100%', p: 2 }}>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Box sx={{ color: 'primary.main', mb: 2 }}>
                                        {item.icon}
                                    </Box>
                                    <Typography variant="h6" component="div" gutterBottom>
                                        {item.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {item.desc}
                                    </Typography>
                                </CardContent>
                            </CardActionArea>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}