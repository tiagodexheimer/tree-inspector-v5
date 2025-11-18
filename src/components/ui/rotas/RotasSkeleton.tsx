import React from 'react';
import { Box, Skeleton, Paper } from '@mui/material';

export default function RotasSkeleton() {
  // Gera um array para simular 5 linhas de tabela
  const rows = Array.from(new Array(5));

  return (
    <Box sx={{ height: '70vh', width: '100%', p: 0 }}>
      <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
        {/* Cabeçalho da Tabela (Simulado) */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, borderBottom: '1px solid #eee', pb: 1 }}>
           <Skeleton variant="text" width={50} height={30} /> {/* ID */}
           <Skeleton variant="text" sx={{ flex: 1 }} height={30} /> {/* Nome */}
           <Skeleton variant="text" width={150} height={30} /> {/* Responsável */}
           <Skeleton variant="text" width={100} height={30} /> {/* Status */}
           <Skeleton variant="text" width={100} height={30} /> {/* Ações */}
        </Box>

        {/* Linhas da Tabela */}
        {rows.map((_, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
             <Skeleton variant="rectangular" width={50} height={40} sx={{ borderRadius: 1 }} />
             <Skeleton variant="rectangular" sx={{ flex: 1, borderRadius: 1 }} height={40} />
             <Skeleton variant="text" width={150} height={40} />
             <Skeleton variant="rounded" width={100} height={32} sx={{ borderRadius: 10 }} /> {/* Chip simulação */}
             <Box sx={{ display: 'flex', gap: 1 }}>
                <Skeleton variant="circular" width={30} height={30} />
                <Skeleton variant="circular" width={30} height={30} />
             </Box>
          </Box>
        ))}
      </Paper>
    </Box>
  );
}