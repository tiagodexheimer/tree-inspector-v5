'use client';

import React from 'react';
import { 
    Box, Typography, Card, CardContent, CardActionArea, Divider,
} from '@mui/material';
import Link from 'next/link';
import GroupIcon from '@mui/icons-material/Group';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FlagIcon from '@mui/icons-material/Flag';
import ForestIcon from '@mui/icons-material/Forest';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest'; 

const manageItems = [
    { title: 'Usuários', icon: <GroupIcon fontSize="large" />, href: '/gerenciar/usuarios', desc: 'Gerenciar contas e acessos' },
    { title: 'Tipos de Demanda', icon: <AssignmentIcon fontSize="large" />, href: '/gerenciar/tipos-demanda', desc: 'Categorias de serviço' },
    { title: 'Status', icon: <FlagIcon fontSize="large" />, href: '/gerenciar/status', desc: 'Fluxo de trabalho' },
    { title: 'Espécies', icon: <ForestIcon fontSize="large" />, href: '/gerenciar/especies', desc: 'Catálogo de árvores' },
    { title: 'Formulários', icon: <FormatListBulletedIcon fontSize="large" />, href: '/gerenciar/formularios', desc: 'Campos personalizados' },
    { 
        title: 'Configurações', 
        icon: <SettingsSuggestIcon fontSize="large" />, 
        href: '/gerenciar/configuracoes', 
        desc: 'Parâmetros globais do sistema' 
    },
];

export default function GerenciarPage() {
    
    const cardGap = 3; 

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
                Gerenciamento do Sistema
            </Typography>
            
            {/* --- LAYOUT FLEXÍVEL COM TAMANHO FIXO --- */}
            <Box 
                sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: theme => theme.spacing(cardGap)
                }}
            >
                {manageItems.map((item) => (
                    <Box 
                        key={item.title}
                        // [CORREÇÃO] Define a largura fixa de 250px (o flex-wrap cuida da quebra)
                        sx={{
                            width: 250, 
                            minWidth: 250,
                            maxWidth: 250, 
                            mb: theme => theme.spacing(cardGap) 
                        }}
                    >
                        <Card 
                            elevation={4} 
                            sx={{ 
                                // [CORREÇÃO] Define a altura fixa de 200px
                                height: 200, 
                                transition: '0.3s', 
                                '&:hover': { 
                                    transform: 'translateY(-5px)',
                                    boxShadow: theme => theme.shadows[10]
                                },
                            }}
                        >
                            <CardActionArea 
                                component={Link} 
                                href={item.href} 
                                sx={{ 
                                    p: 0, 
                                    height: '100%',
                                }}
                            >
                                <Box 
                                    sx={{
                                        width: '100%',
                                        height: '100%', // Ocupa os 200px
                                        position: 'relative',
                                    }}
                                >
                                    <CardContent 
                                        sx={{ 
                                            position: 'absolute', 
                                            width: '100%', 
                                            height: '100%', 
                                            display: 'flex', 
                                            flexDirection: 'column',
                                            justifyContent: 'center', 
                                            alignItems: 'center',
                                            textAlign: 'center',
                                            p: 2
                                        }}
                                    >
                                        <Box sx={{ color: 'primary.main', mb: 1 }}>
                                            {React.cloneElement(item.icon, { sx: { fontSize: 48 } })}
                                        </Box>
                                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                                            {item.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {item.desc}
                                        </Typography>
                                    </CardContent>
                                </Box>
                            </CardActionArea>
                        </Card>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}