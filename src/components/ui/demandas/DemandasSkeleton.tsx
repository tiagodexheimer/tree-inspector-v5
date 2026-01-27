// src/components/ui/demandas/DemandasSkeleton.tsx
import React from 'react';
import {
  Box, Skeleton, Card, CardContent, Divider, Stack,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper
} from '@mui/material';

interface DemandasSkeletonProps {
  viewMode: 'card' | 'list';
}

export default function DemandasSkeleton({ viewMode }: DemandasSkeletonProps) {
  // Array dummy para gerar múltiplos skeletons
  const items = Array.from(new Array(8));

  if (viewMode === 'list') {
    return (
      <TableContainer component={Paper} sx={{ boxShadow: 'none', overflowX: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Protocolo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Endereço Completo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Prazo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((_, index) => (
              <TableRow key={index}>
                <TableCell><Skeleton variant="text" width={100} /></TableCell>
                <TableCell><Skeleton variant="text" width="80%" /></TableCell>
                <TableCell><Skeleton variant="text" width={120} /></TableCell>
                <TableCell><Skeleton variant="text" width={80} /></TableCell>
                <TableCell><Skeleton variant="rounded" width={100} height={28} sx={{ borderRadius: 4 }} /></TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="circular" width={32} height={32} />
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  // Modo Card
  return (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 2,
        justifyContent: 'flex-start',
        width: '100%'
      }}
    >
      {items.map((_, index) => (
        <Box
          key={index}
          sx={{
            width: {
              xs: '100%',
              sm: 'calc(50% - 16px)',
              md: 'calc(33.333% - 16px)',
              lg: 'calc(25% - 16px)',
              xl: 'calc(20% - 16px)'
            },
            minWidth: 250
          }}
        >
          <Card
            elevation={2}
            sx={{
              width: '100%',
              minHeight: '380px',
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '6px solid #eee',
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              {/* CABEÇALHO */}
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Box flex={1}>
                  <Skeleton variant="text" width="40%" height={20} sx={{ mb: 0.5 }} />
                  <Skeleton variant="text" width="80%" height={30} />
                </Box>
                <Skeleton variant="rectangular" width={24} height={24} sx={{ borderRadius: 1 }} />
              </Box>

              {/* BARRA DE AÇÕES E STATUS */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Skeleton variant="rounded" width={100} height={28} sx={{ borderRadius: 4 }} />
                <Stack direction="row" spacing={1}>
                  <Skeleton variant="circular" width={30} height={30} />
                  <Skeleton variant="circular" width={30} height={30} />
                  <Skeleton variant="circular" width={30} height={30} />
                </Stack>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              {/* CORPO */}
              <Stack spacing={1.5} sx={{ flexGrow: 1 }}>
                <Box>
                  <Skeleton variant="rounded" width={80} height={20} sx={{ mb: 0.5, borderRadius: 1 }} />
                  <Box display="flex" alignItems="center" gap={1}>
                    <Skeleton variant="circular" width={20} height={20} />
                    <Skeleton variant="text" width="60%" />
                  </Box>
                </Box>

                <Box display="flex" alignItems="flex-start" gap={1}>
                  <Skeleton variant="circular" width={20} height={20} sx={{ mt: 0.5 }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="90%" />
                    <Skeleton variant="text" width="50%" />
                  </Box>
                </Box>

                <Box sx={{ bgcolor: '#fafafa', p: 1, borderRadius: 2, mt: 'auto', border: '1px solid #eee' }}>
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="60%" />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      ))}
    </Box>
  );
}
