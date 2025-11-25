// src/components/ui/layout/Sidebar.tsx
'use client';

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
    Dashboard, // <--- Ícone Importado
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
    const [openGerenciar, setOpenGerenciar] = useState(false);

    const handleGerenciarClick = () => {
        setOpenGerenciar(!openGerenciar);
    };

    const itemColor = '#f5f5f5';
    const iconColor = '#e0e0e0';

    return (
       <aside 
            className="w-56 h-full p-4 text-white"
            style={{ backgroundColor: '#714b42' }}
        >
            <List component="nav">
                
                {/* --- NOVO BOTÃO: DASHBOARD --- */}
                <ListItemButton component={Link} href="/dashboard">
                    <ListItemIcon sx={{ color: iconColor }}>
                        <Dashboard />
                    </ListItemIcon>
                    <ListItemText primary="Dashboard" sx={{ color: itemColor }} />
                </ListItemButton>
                {/* ----------------------------- */}

                <ListItemButton component={Link} href="/demandas">
                    <ListItemIcon sx={{ color: iconColor }}>
                        <Assignment />
                    </ListItemIcon>
                    <ListItemText primary="Demandas" sx={{ color: itemColor }} />
                </ListItemButton>

                <ListItemButton component={Link} href="/rotas">
                    <ListItemIcon sx={{ color: iconColor }}>
                        <Route />
                    </ListItemIcon>
                    <ListItemText primary="Rotas" sx={{ color: itemColor }} />
                </ListItemButton>

                <ListItemButton onClick={handleGerenciarClick}>
                    <ListItemIcon sx={{ color: iconColor }}>
                        <Settings />
                    </ListItemIcon>
                    <ListItemText primary="Gerenciar" sx={{ color: itemColor }} />
                    {openGerenciar ? <ExpandLess sx={{ color: iconColor }} /> : <ExpandMore sx={{ color: iconColor }} />}
                </ListItemButton>

                <Collapse in={openGerenciar} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <ListItemButton component={Link} href="/gerenciar/usuarios" sx={{ pl: 4 }}>
                            <ListItemIcon sx={{ color: iconColor, minWidth: '40px' }}>
                                <People fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Usuários" sx={{ color: itemColor }} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                        </ListItemButton>

                        <ListItemButton component={Link} href="/gerenciar/especies" sx={{ pl: 4 }}>
                            <ListItemIcon sx={{ color: iconColor, minWidth: '40px' }}>
                                <Forest fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Espécies" sx={{ color: itemColor }} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                        </ListItemButton>
                        
                        <ListItemButton component={Link} href="/gerenciar/status" sx={{ pl: 4 }}>
                            <ListItemIcon sx={{ color: iconColor, minWidth: '40px' }}>
                                <PlaylistAddCheck fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Status" sx={{ color: itemColor }} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                        </ListItemButton>

                        <ListItemButton component={Link} href="/gerenciar/tipos-demanda" sx={{ pl: 4 }}>
                            <ListItemIcon sx={{ color: iconColor, minWidth: '40px' }}>
                                <Category fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Tipos" sx={{ color: itemColor }} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                        </ListItemButton>

                        <ListItemButton component={Link} href="/gerenciar/formularios" sx={{ pl: 4 }}>
                            <ListItemIcon sx={{ color: iconColor, minWidth: '40px' }}>
                                <Description fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Formulários" sx={{ color: itemColor }} primaryTypographyProps={{ fontSize: '0.9rem' }} />
                        </ListItemButton>
                    </List>
                </Collapse>

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