// src/components/ui/layout/Sidebar.tsx
'use client'; // Necessário para usar o estado (useState)

import { useState } from 'react';
import Link from 'next/link';
import { 
    List, 
    ListItemButton, 
    ListItemIcon, 
    ListItemText, 
    Collapse 
} from '@mui/material';
import { 
    Assignment, 
    Route, 
    Settings, 
    BarChart, 
    ExpandLess, 
    ExpandMore,
    People,
    Forest,
    PlaylistAddCheck,
    Category,
    Description
} from '@mui/icons-material';

export default function Sidebar() {
    // Estado para controlar se o menu "Gerenciar" está aberto
    const [openGerenciar, setOpenGerenciar] = useState(false);

    // Função para inverter o estado ao clicar
    const handleGerenciarClick = () => {
        setOpenGerenciar(!openGerenciar);
    };

    // Estilos para os ícones e texto, para combinar com seu sidebar
    const itemColor = '#f5f5f5'; // Texto principal
    const iconColor = '#e0e0e0'; // Ícones

    return (
       <aside 
            className="w-56 h-full p-4 text-white"
            style={{ backgroundColor: '#714b42' }}
        >
            <List component="nav">
                
                {/* 1. Link de Demandas (agora como ListItemButton) */}
                <ListItemButton component={Link} href="/demandas">
                    <ListItemIcon sx={{ color: iconColor }}>
                        <Assignment />
                    </ListItemIcon>
                    <ListItemText primary="Demandas" sx={{ color: itemColor }} />
                </ListItemButton>

                {/* 2. Link de Rotas (agora como ListItemButton) */}
                <ListItemButton component={Link} href="/rotas">
                    <ListItemIcon sx={{ color: iconColor }}>
                        <Route />
                    </ListItemIcon>
                    <ListItemText primary="Rotas" sx={{ color: itemColor }} />
                </ListItemButton>

                {/* 3. Botão "Gerenciar" (que abre o menu) */}
                <ListItemButton onClick={handleGerenciarClick}>
                    <ListItemIcon sx={{ color: iconColor }}>
                        <Settings />
                    </ListItemIcon>
                    <ListItemText primary="Gerenciar" sx={{ color: itemColor }} />
                    {/* Ícone de seta que muda */}
                    {openGerenciar ? <ExpandLess sx={{ color: iconColor }} /> : <ExpandMore sx={{ color: iconColor }} />}
                </ListItemButton>

                {/* 4. O Menu Suspenso (Collapse) */}
                <Collapse in={openGerenciar} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        
                        {/* Sub-item: Usuários */}
                        <ListItemButton component={Link} href="/gerenciar/usuarios" sx={{ pl: 4 }}>
                            <ListItemIcon sx={{ color: iconColor, minWidth: '40px' }}>
                                <People fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Usuários" sx={{ color: itemColor }} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                        </ListItemButton>

                        {/* Sub-item: Espécies */}
                        <ListItemButton component={Link} href="/gerenciar/especies" sx={{ pl: 4 }}>
                            <ListItemIcon sx={{ color: iconColor, minWidth: '40px' }}>
                                <Forest fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Espécies" sx={{ color: itemColor }} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                        </ListItemButton>
                        
                        {/* Sub-item: Status */}
                        <ListItemButton component={Link} href="/gerenciar/status" sx={{ pl: 4 }}>
                            <ListItemIcon sx={{ color: iconColor, minWidth: '40px' }}>
                                <PlaylistAddCheck fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Status" sx={{ color: itemColor }} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                        </ListItemButton>

                        {/* Sub-item: Tipos */}
                        <ListItemButton component={Link} href="/gerenciar/tipos-demanda" sx={{ pl: 4 }}>
                            <ListItemIcon sx={{ color: iconColor, minWidth: '40px' }}>
                                <Category fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Tipos" sx={{ color: itemColor }} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                        </ListItemButton>

                        {/* Sub-item: Formulários */}
                        <ListItemButton component={Link} href="/gerenciar/formularios" sx={{ pl: 4 }}>
                            <ListItemIcon sx={{ color: iconColor, minWidth: '40px' }}>
                                <Description fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Formulários" sx={{ color: itemColor }} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                        </ListItemButton>

                    </List>
                </Collapse>

                {/* 5. Link de Relatórios (agora como ListItemButton) */}
                <ListItemButton component={Link} href="/relatorios">
                    <ListItemIcon sx={{ color: iconColor }}>
                        <BarChart />
                    </ListItemIcon>
                    <ListItemText primary="Relatórios" sx={{ color: itemColor }} />
                </ListItemButton>
            </List>
        </aside>
    );
}