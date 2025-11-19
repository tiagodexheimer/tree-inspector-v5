// src/components/ui/formularios/PreVisualizarFormularios.tsx
import React, { useState } from 'react';
import {
    Box, Typography, SelectChangeEvent, Paper, AppBar, Toolbar, IconButton,
    CssBaseline, createTheme, ThemeProvider, Button
} from '@mui/material';
import { Wifi, SignalCellularAlt, BatteryFull, ArrowBack, DragIndicator, Menu as MenuIcon } from '@mui/icons-material';
import { CampoDef } from '@/types/formularios';
import CampoFormularios from './CampoFormularios';

// Imports do DND-Kit
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const phoneTheme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#1976d2' }, // Azul padrão Android
        secondary: { main: '#EA4335' },
        background: { default: '#f8f8f8', paper: '#ffffff' },
    },
    typography: { fontFamily: 'Roboto, Arial, sans-serif' },
    components: {
        MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 8 } } },
        MuiAppBar: { styleOverrides: { root: { boxShadow: 'none' } } },
        MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } }
    },
});

interface PreviaProps {
    campos: CampoDef[];
    onReorder?: (oldIndex: number, newIndex: number) => void;
    readOnly?: boolean; // [NOVO] Modo apenas leitura (sem drag & drop)
    formName?: string;  // [NOVO] Nome para exibir no cabeçalho do app
}

type FormDataState = Record<string, string | boolean | number>;

// Componente de Item Arrastável (usado apenas no modo edição)
function SortableField({ id, children }: { id: string, children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
        zIndex: isDragging ? 999 : 'auto',
        touchAction: 'none',
    };

    return (
        <Box ref={setNodeRef} style={style} sx={{ position: 'relative', mb: 2 }}>
            <Box
                {...attributes}
                {...listeners}
                sx={{
                    position: 'absolute', right: -6, top: 12, zIndex: 10, cursor: 'grab',
                    color: 'action.disabled', '&:hover': { color: 'primary.main' }
                }}
            >
                <DragIndicator fontSize="small" />
            </Box>
            <Box sx={{ pr: 3 }}>{children}</Box>
        </Box>
    );
}

export default function PreVisualizarFormularios({ 
    campos, 
    onReorder, 
    readOnly = false, 
    formName = "Novo Formulário" 
}: PreviaProps) {
    const [formData, setFormData] = useState<FormDataState>({});

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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id && onReorder) {
            const oldIndex = campos.findIndex((c) => c.id === active.id);
            const newIndex = campos.findIndex((c) => c.id === over.id);
            onReorder(oldIndex, newIndex);
        }
    };

    // Renderização da lista de campos
    const renderFields = () => (
        <form onSubmit={(e) => e.preventDefault()}>
            {campos.length === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8, opacity: 0.6 }}>
                    <Typography variant="body2">Sem campos</Typography>
                </Box>
            )}
            
            {campos.map((campo) => (
                <React.Fragment key={campo.id}>
                    {readOnly ? (
                        // Modo Leitura: Renderiza direto, sem wrapper de Drag
                        <Box sx={{ mb: 2 }}>
                            <CampoFormularios
                                campo={campo}
                                value={formData[campo.name] ?? ((campo.type === 'checkbox' || campo.type === 'switch') ? (campo.defaultValue ?? false) : '')}
                                onChange={handleFormChange}
                            />
                        </Box>
                    ) : (
                        // Modo Edição: Usa SortableField
                        <SortableField id={campo.id}>
                            <CampoFormularios
                                campo={campo}
                                value={formData[campo.name] ?? ((campo.type === 'checkbox' || campo.type === 'switch') ? (campo.defaultValue ?? false) : '')}
                                onChange={handleFormChange}
                            />
                        </SortableField>
                    )}
                </React.Fragment>
            ))}

            {/* Botão Simulado no final (apenas no modo leitura/visualização) */}
            {readOnly && campos.length > 0 && (
                <Box sx={{ mt: 4, mb: 2 }}>
                    <Button variant="contained" fullWidth size="large" disableElevation>
                        Enviar
                    </Button>
                </Box>
            )}
        </form>
    );

    return (
        <ThemeProvider theme={phoneTheme}>
            <CssBaseline />
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', py: 2 }}>
                {/* Moldura do Celular */}
                <Paper
                    elevation={6}
                    sx={{
                        width: 360, height: 640, borderRadius: 5, overflow: 'hidden',
                        position: 'relative', display: 'flex', flexDirection: 'column',
                        bgcolor: '#fff', border: '8px solid #111', // Borda preta simulando o corpo do celular
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                    }}
                >
                    {/* Barra de Status Android */}
                    <Box sx={{ bgcolor: '#1976d2', color: '#fff', height: 24, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10 }}>
                        <span style={{ fontWeight: 'bold' }}>12:30</span>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Wifi sx={{ fontSize: 12 }} />
                            <SignalCellularAlt sx={{ fontSize: 12 }} />
                            <BatteryFull sx={{ fontSize: 12 }} />
                        </Box>
                    </Box>

                    {/* Barra de App (Header) */}
                    <AppBar position="static" sx={{ bgcolor: '#1976d2', height: 56 }}>
                        <Toolbar sx={{ minHeight: '56px !important', px: 1 }}>
                            <IconButton edge="start" color="inherit" size="small">
                                {readOnly ? <MenuIcon /> : <ArrowBack />}
                            </IconButton>
                            <Typography variant="h6" sx={{ flexGrow: 1, ml: 2, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {formName}
                            </Typography>
                        </Toolbar>
                    </AppBar>

                    {/* Área de Conteúdo com Scroll */}
                    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: '#fafafa' }}>
                        {readOnly ? (
                            renderFields()
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={campos.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                    {renderFields()}
                                </SortableContext>
                            </DndContext>
                        )}
                    </Box>

                    {/* Barra de Navegação Android (Simulada) */}
                    <Box sx={{ height: 40, bgcolor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                         {/* Botões virtuais simples */}
                         <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '10px solid #888', transform: 'rotate(-90deg)' }}></div>
                         <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #888' }}></div>
                         <div style={{ width: 10, height: 10, border: '2px solid #888', borderRadius: 2 }}></div>
                    </Box>
                </Paper>
            </Box>
        </ThemeProvider>
    );
}