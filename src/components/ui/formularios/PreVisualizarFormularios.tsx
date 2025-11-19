// src/components/ui/formularios/PreVisualizarFormularios.tsx
import React, { useState } from 'react';
import {
    Box, Typography, SelectChangeEvent, Paper, AppBar, Toolbar, IconButton,
    CssBaseline, createTheme, ThemeProvider
} from '@mui/material';
import { Wifi, SignalCellularAlt, BatteryFull, ArrowBack, DragIndicator } from '@mui/icons-material';
import { CampoDef } from '@/types/formularios';
import CampoFormularios from './CampoFormularios';

// Imports do DND-Kit para arrastar e soltar
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Tema simulando Android
const phoneTheme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#4285F4' },
        secondary: { main: '#EA4335' },
        background: { default: '#f8f8f8', paper: '#ffffff' },
    },
    typography: { fontFamily: 'Roboto, Arial, sans-serif' },
    components: {
        MuiButton: { styleOverrides: { root: { textTransform: 'none' } } },
        MuiAppBar: { styleOverrides: { root: { boxShadow: 'none' } } },
    },
});

interface PreviaProps {
    campos: CampoDef[];
    onReorder: (oldIndex: number, newIndex: number) => void; // Nova prop para comunicar a mudança
}

type FormDataState = Record<string, string | boolean | number>;

// Componente wrapper para tornar cada campo arrastável
function SortableField({ id, children }: { id: string, children: React.ReactNode }) {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
        zIndex: isDragging ? 999 : 'auto',
        touchAction: 'none', // Importante para mobile/touch
    };

    return (
        <Box ref={setNodeRef} style={style} sx={{ position: 'relative', mb: 1 }}>
            {/* Manipulador de arrasto (o ícone de 6 pontinhos) */}
            <Box
                {...attributes}
                {...listeners}
                sx={{
                    position: 'absolute',
                    right: -10,
                    top: 16, // Ajuste conforme a altura do input
                    zIndex: 10,
                    cursor: 'grab',
                    color: 'action.disabled',
                    '&:hover': { color: 'primary.main' },
                    '&:active': { cursor: 'grabbing' }
                }}
            >
                <DragIndicator fontSize="small" />
            </Box>
            
            {/* O campo em si (com uma margem direita para não sobrepor o ícone) */}
            <Box sx={{ pr: 3 }}>
                {children}
            </Box>
        </Box>
    );
}

export default function PreVisualizarFormularios({ campos, onReorder }: PreviaProps) {
    const [formData, setFormData] = useState<FormDataState>({});

    // Configuração dos sensores do DndKit
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
        if (typeof event === 'object' && event && 'target' in event) {
            const target = event.target as HTMLInputElement;
            const { name, value, type, checked } = target;
            setFormData((prev) => ({ ...prev, [name]: (type === 'checkbox' || type === 'switch') ? checked : value }));
        }
    };

    // Lógica ao soltar o item
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = campos.findIndex((c) => c.id === active.id);
            const newIndex = campos.findIndex((c) => c.id === over.id);
            onReorder(oldIndex, newIndex); // Chama a função do pai
        }
    };

    return (
        <ThemeProvider theme={phoneTheme}>
            <CssBaseline />
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', py: 2 }}>
                <Paper
                    elevation={4}
                    sx={{
                        width: 360, height: 640, borderRadius: 4, overflow: 'hidden',
                        position: 'relative', display: 'flex', flexDirection: 'column',
                        bgcolor: 'background.default', border: '1px solid #ccc',
                    }}
                >
                    {/* Barra de Status */}
                    <AppBar position="static" sx={{ bgcolor: '#333', color: '#fff', minHeight: 25, height: 25 }}>
                        <Toolbar variant="dense" sx={{ minHeight: 25, px: 1, display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>10:00</Typography>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Wifi sx={{ fontSize: '0.8rem' }} />
                                <SignalCellularAlt sx={{ fontSize: '0.8rem' }} />
                                <BatteryFull sx={{ fontSize: '0.8rem' }} />
                            </Box>
                        </Toolbar>
                    </AppBar>

                    {/* Barra de Título */}
                    <AppBar position="static" color="primary" sx={{ bgcolor: 'primary.main', minHeight: 56 }}>
                        <Toolbar sx={{ minHeight: 56 }}>
                            <IconButton edge="start" color="inherit"><ArrowBack /></IconButton>
                            <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
                                {campos.length > 0 ? "Novo Formulário" : "App"}
                            </Typography>
                        </Toolbar>
                    </AppBar>

                    {/* Área de Conteúdo (Lista Sortable) */}
                    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: 'background.paper' }}>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={campos.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                <form onSubmit={(e) => e.preventDefault()}>
                                    {campos.length === 0 && (
                                        <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 8 }}>
                                            Adicione campos para ver o resultado.
                                        </Typography>
                                    )}
                                    
                                    {campos.map((campo) => (
                                        <SortableField key={campo.id} id={campo.id}>
                                            <CampoFormularios
                                                campo={campo}
                                                value={formData[campo.name] ?? ((campo.type === 'checkbox' || campo.type === 'switch') ? (campo.defaultValue ?? false) : '')}
                                                onChange={handleFormChange}
                                            />
                                        </SortableField>
                                    ))}
                                </form>
                            </SortableContext>
                        </DndContext>
                    </Box>
                </Paper>
            </Box>
        </ThemeProvider>
    );
}