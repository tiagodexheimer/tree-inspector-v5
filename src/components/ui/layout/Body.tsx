// src/components/ui/layout/Body.tsx
'use client';

import React from 'react';
import { Box, Toolbar, useTheme, useMediaQuery } from '@mui/material'; // <--- NOVOS IMPORTS

const SIDEBAR_WIDTH = 240;

interface BodyProps {
  children: React.ReactNode;
}

export default function Body({ children }: BodyProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // <--- NOVO
    
    // O padding deve ser ajustado apenas em telas desktop
    const mainContentSx = {
        flexGrow: 1,
        p: isMobile ? 1 : 3, // <--- MODIFICADO: Reduzir padding em mobile
        width: isMobile ? '100%' : `calc(100% - ${SIDEBAR_WIDTH}px)`, // <--- MODIFICADO: 100% de largura em mobile
    };

    return (
        <Box component="main" sx={mainContentSx}>
            <Toolbar /> {/* Para compensar o Header fixo */}
            {children}
        </Box>
    );
}