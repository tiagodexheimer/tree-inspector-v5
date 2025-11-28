// src/components/ui/layout/Sidebar.tsx
'use client';

import React from 'react';
import { 
    Box, Divider, List, ListItem, ListItemButton, 
    ListItemIcon, ListItemText, Toolbar, useTheme, useMediaQuery, 
    Drawer // <--- NOVO
} from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Ícones
import DashboardIcon from '@mui/icons-material/Dashboard';
import PinDropIcon from '@mui/icons-material/PinDrop';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import SettingsIcon from '@mui/icons-material/Settings';
import BarChartIcon from '@mui/icons-material/BarChart';

// Definição da largura (constante)
const SIDEBAR_WIDTH = 240;

const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, href: '/dashboard' },
    { text: 'Demandas', icon: <PinDropIcon />, href: '/demandas' },
    { text: 'Rotas', icon: <AltRouteIcon />, href: '/rotas' },
    { text: 'Relatórios', icon: <BarChartIcon />, href: '/relatorios' },
    { text: 'Gerenciar', icon: <SettingsIcon />, href: '/gerenciar' },
];

// Adicionamos as props de estado mobile
interface SidebarProps {
    mobileOpen: boolean; // <--- NOVO
    handleDrawerToggle: () => void; // <--- NOVO
}

// Modificado para aceitar as props
export default function Sidebar({ mobileOpen, handleDrawerToggle }: SidebarProps) {
    const pathname = usePathname();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm')); 

    const drawerContent = (
        <Box onClick={isMobile ? handleDrawerToggle : undefined}>
            <Toolbar />
            <Divider />
            <List>
                {navItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton 
                            component={Link} 
                            href={item.href}
                            selected={pathname === item.href}
                            // Corrigindo a cor do texto/ícone para contrastar com o fundo escuro
                            sx={{
                                '&.Mui-selected': { 
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Branco semi-transparente
                                },
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                },
                            }}
                        >
                            {/* Corrigindo a cor dos ícones e texto para branco/claro */}
                            <ListItemIcon sx={{ color: 'white' }}>{item.icon}</ListItemIcon> 
                            <ListItemText primary={item.text} sx={{ color: 'white' }} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );

    // Renderiza o Drawer temporário para Mobile
    if (isMobile) {
        return (
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }} 
                sx={{
                    '& .MuiDrawer-paper': { 
                        boxSizing: 'border-box', 
                        width: SIDEBAR_WIDTH,
                        // APLICAÇÃO DA COR MARROM (Secondary)
                        backgroundColor: theme.palette.secondary.main, 
                    },
                }}
            >
                {drawerContent}
            </Drawer>
        );
    }

    // Renderiza o Sidebar permanente para Desktop
    return (
        <Drawer
            variant="permanent"
            sx={{
                width: SIDEBAR_WIDTH,
                flexShrink: 0,
                [`& .MuiDrawer-paper`]: { 
                    width: SIDEBAR_WIDTH, 
                    boxSizing: 'border-box',
                    // APLICAÇÃO DA COR MARROM (Secondary)
                    backgroundColor: theme.palette.secondary.main, 
                },
            }}
        >
            {drawerContent}
        </Drawer>
    );
}