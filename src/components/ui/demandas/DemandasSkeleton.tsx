// src/components/ui/demandas/DemandasSkeleton.tsx
import React from 'react';
import { Box, Skeleton, Card, CardContent, CardHeader } from '@mui/material';

interface DemandasSkeletonProps {
  viewMode: 'card' | 'list';
}

export default function DemandasSkeleton({ viewMode }: DemandasSkeletonProps) {
  // Array dummy para gerar múltiplos skeletons
  const items = Array.from(new Array(8));

  if (viewMode === 'list') {
    return (
      <Box sx={{ width: '100%', p: 2 }}>
        {items.map((_, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
             {/* Imita as colunas da tabela */}
             <Skeleton variant="rectangular" width={40} height={40} />
             <Skeleton variant="text" width="30%" height={30} />
             <Skeleton variant="text" width="20%" height={30} />
             <Skeleton variant="text" width="15%" height={30} />
             <Skeleton variant="rounded" width={100} height={30} sx={{ borderRadius: 5 }} />
             <Skeleton variant="circular" width={40} height={40} sx={{ ml: 'auto' }} />
          </Box>
        ))}
      </Box>
    );
  }

  // Modo Card
  return (
    <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-start' }}>
      {items.map((_, index) => (
        <Card key={index} sx={{ width: 400, height: 500, display: 'flex', flexDirection: 'column' }}>
          <CardHeader
            avatar={<Skeleton variant="circular" width={40} height={40} />}
            title={<Skeleton variant="text" width="80%" height={30} />}
            subheader={<Skeleton variant="text" width="60%" />}
          />
          <CardContent sx={{ flexGrow: 1 }}>
            {/* Imita o Mapa */}
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1, mb: 2 }} />
            {/* Imita Descrição */}
            <Skeleton variant="text" />
            <Skeleton variant="text" />
            <Skeleton variant="text" width="80%" />
            {/* Imita Botão */}
            <Skeleton variant="rectangular" width={100} height={36} sx={{ mt: 2 }} />
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}