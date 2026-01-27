// src/components/ui/dashboard/DashboardSkeleton.tsx
import React from 'react';
import { Box, Paper, Skeleton, Card, CardContent, Divider, Stack } from '@mui/material';

export default function DashboardSkeleton() {
    return (
        <Box sx={{ p: 3 }}>
            {/* Título Skeleton */}
            <Skeleton variant="text" width="300px" height={60} sx={{ mb: 4 }} />

            {/* 1. KPIs Skeletons */}
            <Box sx={{ mb: 4 }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} elevation={2} sx={{ height: '100%', display: 'flex', alignItems: 'center', p: 1 }}>
                            <Box sx={{ p: 2, borderRadius: '50%', mr: 2 }}>
                                <Skeleton variant="circular" width={40} height={40} />
                            </Box>
                            <CardContent sx={{ p: '16px !important', flexGrow: 1 }}>
                                <Skeleton variant="text" width="60%" height={20} />
                                <Skeleton variant="text" width="40%" height={40} />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </Box>

            {/* 2. Gráficos e Ações Skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Gráfico Skeleton */}
                <div className="md:col-span-2">
                    <Paper elevation={2} sx={{ p: 3, height: 400, display: 'flex', flexDirection: 'column' }}>
                        <Skeleton variant="text" width="200px" height={30} sx={{ mb: 1 }} />
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Skeleton variant="circular" width={250} height={250} />
                        </Box>
                    </Paper>
                </div>

                {/* Ações Rápidas Skeleton */}
                <div>
                    <Paper elevation={2} sx={{ p: 3, height: 400 }}>
                        <Skeleton variant="text" width="150px" height={30} sx={{ mb: 1 }} />
                        <Divider sx={{ mb: 3 }} />
                        <Stack spacing={2}>
                            <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: 1 }} />
                            <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: 1 }} />
                            <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: 1 }} />
                        </Stack>
                    </Paper>
                </div>
            </div>
        </Box>
    );
}
