'use client';

import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
    List, ListItem, ListItemText, Paper, IconButton, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent,
    CircularProgress, Alert
} from "@mui/material";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { DemandaType, DemandaComIdStatus, OptimizedRouteData } from "@/types/demanda";
import _dynamic from 'next/dynamic';
import { LatLngExpression } from 'leaflet';

const RouteMapComponent = _dynamic(() => import('./RouteMap'), {
    ssr: false,
    loading: () => <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eee', color: '#777' }}>Carregando mapa da rota...</Box>
});

interface CriarRotaModalProps {
    open: boolean;
    onClose: () => void;
    routeData: OptimizedRouteData | null; 
    onRotaCriada: (nomeRota: string, responsavel: string) => void;
}

// Interface para o usuário do dropdown
interface UserOption {
    id: string;
    name: string;
}

const START_END_POINT: LatLngExpression = [-29.8533191, -51.1789191];

const formatEnderecoCurto = (demanda: DemandaType): string => {
    if (!demanda) return 'Endereço inválido';
    const parts = [
        demanda.logradouro,
        demanda.numero ? `, ${demanda.numero}` : '',
        demanda.bairro ? ` - ${demanda.bairro}` : '',
    ];
    return parts.filter(Boolean).join('').trim() || 'Endereço não informado';
};

function SortableItem({ demanda }: { demanda: DemandaComIdStatus }) {
    const safeId = demanda?.id || 'unknown';
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: safeId });
    const style = { transform: CSS.Transform.toString(transform), transition };

    if (!demanda) return null;

    return (
        <ListItem ref={setNodeRef} style={style} {...attributes}>
            <IconButton {...listeners} sx={{ cursor: 'grab' }} aria-label="arrastar ordem">
                <DragIndicatorIcon />
            </IconButton>
            <ListItemText primary={`ID: ${demanda.id}`} secondary={formatEnderecoCurto(demanda)} />
        </ListItem>
    );
}

export default function CriarRotaModal({ open, onClose, routeData, onRotaCriada }: CriarRotaModalProps) {
    const [nomeRota, setNomeRota] = useState('');
    const [responsavel, setResponsavel] = useState('');
    const [orderedDemandas, setOrderedDemandas] = useState<DemandaComIdStatus[]>([]);
    const [currentRoutePath, setCurrentRoutePath] = useState<[number, number][]>([]);

    // Estados para lista de usuários
    const [usersList, setUsersList] = useState<UserOption[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Efeito para buscar a lista de usuários ao abrir o modal
    useEffect(() => {
        if (open) {
            setIsLoadingUsers(true);
            fetch('/api/users/list')
                .then(res => {
                    if (!res.ok) throw new Error('Falha ao carregar usuários');
                    return res.json();
                })
                .then((data: UserOption[]) => {
                    setUsersList(data);
                })
                .catch(err => {
                    console.error("Erro ao buscar usuários:", err);
                    // Fallback opcional ou apenas log
                })
                .finally(() => setIsLoadingUsers(false));
        }
    }, [open]);

    useEffect(() => {
        if (open && routeData) {
            const validDemands = (routeData.optimizedDemands || []).filter(d => d && d.id);
            
            setOrderedDemandas(validDemands);
            setCurrentRoutePath(routeData.routePath || []); 
            
            setNomeRota('');
            setResponsavel('');
            setIsSaving(false);
            setApiError(null);
        } else if (!open) {
             setOrderedDemandas([]);
             setCurrentRoutePath([]);
        }
    }, [routeData, open]);

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            if (apiError) setApiError(null);
            
            setOrderedDemandas((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                 if (oldIndex === -1 || newIndex === -1) return items;

                const newOrderedItems = arrayMove(items, oldIndex, newIndex);

                const newPath: [number, number][] = [
                    START_END_POINT as [number, number], 
                    ...newOrderedItems
                        .filter(d => d && d.lat && d.lng) 
                        .map(d => [d.lat!, d.lng!] as [number, number]),
                    START_END_POINT as [number, number] 
                ];
                
                setCurrentRoutePath(newPath);
                return newOrderedItems;
            });
        }
    }

    const handleCreateRoute = async () => {
        if (!nomeRota.trim() || !responsavel) {
            setApiError('Por favor, preencha o nome da rota e selecione um responsável.');
            return;
        }

        setIsSaving(true);
        setApiError(null);

        try {
            const response = await fetch('/api/rotas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: nomeRota,
                    responsavel: responsavel, // Aqui enviamos o nome do usuário (conforme backend espera string)
                    demandas: orderedDemandas
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || result.error || `Erro ${response.status} ao salvar rota.`);
            }

            onRotaCriada(nomeRota, responsavel);
            onClose();

        } catch (err) {
            console.error("[MODAL] Falha ao salvar rota:", err);
            setApiError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
        } finally {
            setIsSaving(false);
        }
    };

    const sortableItemsIds = orderedDemandas
        .filter(d => d && d.id)
        .map(d => d.id!);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Criar Nova Rota</DialogTitle>
            <DialogContent dividers>
                {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}

                <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Nome da Rota"
                            variant="outlined"
                            fullWidth
                            value={nomeRota}
                            onChange={(e) => {
                                setNomeRota(e.target.value);
                                if (apiError) setApiError(null);
                            }}
                            required
                            disabled={isSaving}
                            error={!!apiError && !nomeRota.trim()}
                        />

                        <FormControl fullWidth required error={!!apiError && !responsavel}>
                            <InputLabel id="responsavel-rota-label">Responsável pela Rota</InputLabel>
                            <Select
                                labelId="responsavel-rota-label"
                                value={responsavel}
                                label="Responsável pela Rota"
                                onChange={(e: SelectChangeEvent) => {
                                    setResponsavel(e.target.value);
                                    if (apiError) setApiError(null);
                                }}
                                disabled={isSaving || isLoadingUsers}
                            >
                                <MenuItem value="" disabled>
                                    {isLoadingUsers ? "Carregando usuários..." : "Selecione..."}
                                </MenuItem>
                                
                                {/* Renderiza a lista de usuários reais */}
                                {usersList.map((user) => (
                                    <MenuItem key={user.id} value={user.name}>
                                        {user.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Typography variant="h6" sx={{ mt: 2 }}>Ordem das Demandas (Otimizada)</Typography>
                        <Typography variant="caption" sx={{ mt: -2, color: 'text.secondary' }}>
                            A rota foi pré-otimizada. Você pode reordenar manualmente se necessário.
                        </Typography>

                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={sortableItemsIds} strategy={verticalListSortingStrategy}>
                                <List component={Paper} sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', opacity: isSaving ? 0.7 : 1 }}>
                                    {orderedDemandas.map((demanda, index) => (
                                        demanda && demanda.id ? (
                                            <Box key={demanda.id} sx={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #eee' }}>
                                                <Typography sx={{ p: 1, minWidth: '35px', textAlign: 'center', fontWeight: 'bold', color: 'primary.main' }}>
                                                    {index + 1}.
                                                </Typography>
                                                <Box sx={{ flexGrow: 1 }}>
                                                    <SortableItem demanda={demanda} />
                                                </Box>
                                            </Box>
                                        ) : null
                                    ))}
                                    {orderedDemandas.length === 0 && (
                                        <ListItem>
                                            <ListItemText secondary="Nenhuma demanda selecionada." />
                                        </ListItem>
                                    )}
                                </List>
                            </SortableContext>
                        </DndContext>
                        
                    </Box>

                    <Box sx={{ flex: 1, minHeight: 400, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden', opacity: isSaving ? 0.7 : 1 }}>
                        {routeData && (
                            <RouteMapComponent 
                                demandas={orderedDemandas} 
                                path={currentRoutePath} 
                                modalIsOpen={open} 
                            />
                        )}
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button
                    onClick={handleCreateRoute}
                    variant="contained"
                    disabled={isSaving || !nomeRota.trim() || !responsavel || orderedDemandas.length === 0}
                >
                    {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Salvar Rota'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}