import React from 'react';
import { Box, Skeleton, Paper, Grid } from '@mui/material';

export default function RotaDetalhesSkeleton() {
  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
        {/* 1. Cabeçalho (Botões e Título) */}
        <Box sx={{ display: 'flex', mb: 2, gap: 2, alignItems: 'center' }}>
            <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
            <Skeleton variant="text" height={50} sx={{ flexGrow: 1 }} />
            <Skeleton variant="rectangular" width={140} height={36} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={140} height={36} sx={{ borderRadius: 1 }} />
        </Box>

        {/* 2. Barra de Informações */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, backgroundColor: '#f9f9f9', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ width: 200 }}><Skeleton variant="text" width="60%" /><Skeleton variant="text" width="90%" height={30} /></Box>
                <Box sx={{ width: 150 }}><Skeleton variant="text" width="60%" /><Skeleton variant="rounded" width={100} height={24} /></Box>
                <Box sx={{ width: 200 }}><Skeleton variant="text" width="60%" /><Skeleton variant="text" width="90%" height={30} /></Box>
            </Box>
        </Paper>

        {/* 3. Layout Dividido (Lista e Mapa) */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {/* Coluna Esquerda (Lista) */}
            <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: '40%' }, minWidth: '300px' }}>
                <Skeleton variant="text" width="70%" height={40} sx={{ mb: 1 }} />
                <Paper elevation={1} sx={{ p: 0, height: '500px' }}>
                    {Array.from(new Array(6)).map((_, i) => (
                        <Box key={i} sx={{ p: 2, display: 'flex', gap: 2, borderBottom: '1px solid #eee' }}>
                             <Skeleton variant="circular" width={30} height={30} />
                             <Box sx={{ flex: 1 }}>
                                 <Skeleton variant="text" width="90%" />
                                 <Skeleton variant="text" width="50%" />
                             </Box>
                        </Box>
                    ))}
                </Paper>
            </Box>

            {/* Coluna Direita (Mapa) */}
            <Box sx={{ flexGrow: 1, flexBasis: { xs: '100%', md: '55%' }, minWidth: '400px' }}>
                 <Skeleton variant="text" width="50%" height={40} sx={{ mb: 1 }} />
                 <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 1 }} />
            </Box>
        </Box>
    </Box>
  );
}