// src/components/ui/layout/Body.tsx
'use client';

import React from 'react';
import { Box, Toolbar, useTheme, useMediaQuery } from '@mui/material';

const SIDEBAR_WIDTH = 240;

interface BodyProps {
  children: React.ReactNode;
}

export default function Body({ children }: BodyProps) {
    const theme = useTheme();
    const isMobileOrTablet = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Box
            component="main"
            sx={{
                flexGrow: 1,
                p: isMobileOrTablet ? 1 : 3,
                width: '100%',
                overflow: 'visible !important',  
                // ❌ não define margin-left aqui!
            }}
        >
            <Toolbar /> {/* Compensa o header fixo */}
            {children}
        </Box>
    );
}
