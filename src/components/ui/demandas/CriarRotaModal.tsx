'use client';

import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
    List, ListItem, ListItemText, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent,
    CircularProgress, Alert, useMediaQuery, useTheme, Collapse, Checkbox, FormControlLabel, Stack, InputAdornment, IconButton
} from "@mui/material";
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SearchIcon from '@mui/icons-material/Search';
import { DemandaType, DemandaComIdStatus, OptimizedRouteData } from "@/types/demanda";
import _dynamic from 'next/dynamic';
import { decode } from '@googlemaps/polyline-codec';

const RouteMapComponent = _dynamic(() => import('./RouteMap'), {
    ssr: false,
    loading: () => <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#eee' }}>Carregando...</Box>
});

// ... (Interfaces e helpers mantidos: UserOption, EnderecoState, formatEnderecoCurto, SortableItem)
interface CriarRotaModalProps {
    open: boolean;
    onClose: () => void;
    routeData: OptimizedRouteData | null;
    onRotaCriada: (nomeRota: string, responsavel: string) => void;
}

interface UserOption { id: string; name: string; }
interface EnderecoState { cep: string; numero: string; logradouro: string; cidade: string; uf: string; }

const formatEnderecoCurto = (demanda: DemandaType): string => {
    if (!demanda) return 'Endereço inválido';
    return `${demanda.logradouro || ''}, ${demanda.numero || ''}`;
};

function SortableItem({ demanda }: { demanda: DemandaComIdStatus }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: demanda?.id || 'unknown' });
    const style = { transform: CSS.Transform.toString(transform), transition };
    if (!demanda) return null;
    return (
        <ListItem ref={setNodeRef} style={style} {...attributes}>
            <IconButton {...listeners} sx={{ cursor: 'grab' }}><DragIndicatorIcon /></IconButton>
            <ListItemText primary={`ID: ${demanda.id}`} secondary={formatEnderecoCurto(demanda)} />
        </ListItem>
    );
}

export default function CriarRotaModal({ open, onClose, routeData, onRotaCriada }: CriarRotaModalProps) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [nomeRota, setNomeRota] = useState('');
    const [responsavel, setResponsavel] = useState('');
    const [orderedDemandas, setOrderedDemandas] = useState<DemandaComIdStatus[]>([]);

    // [MODIFICADO] Apenas guardamos o path da API (se houver), não calculamos fallback aqui
    const [apiPolyline, setApiPolyline] = useState<[number, number][] | undefined>(undefined);

    const [usersList, setUsersList] = useState<UserOption[]>([]);
    const [globalConfig, setGlobalConfig] = useState<{ inicio: { lat: number, lng: number }, fim: { lat: number, lng: number } } | null>(null);

    // Estados de Personalização
    const [personalizar, setPersonalizar] = useState(false);
    const [coordsInicio, setCoordsInicio] = useState<{ lat: number, lng: number } | null>(null);
    const [coordsFim, setCoordsFim] = useState<{ lat: number, lng: number } | null>(null);
    const [endInicio, setEndInicio] = useState<EnderecoState>({ cep: '', numero: '', logradouro: '', cidade: '', uf: '' });
    const [endFim, setEndFim] = useState<EnderecoState>({ cep: '', numero: '', logradouro: '', cidade: '', uf: '' });

    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Inicialização (Users, Config, Dados da Rota)
    useEffect(() => {
        if (open) {
            setIsLoadingUsers(true);

            // 1. Users
            fetch('/api/users/list')
                .then(r => r.json()).then(setUsersList)
                .catch(console.error).finally(() => setIsLoadingUsers(false));

            // 2. Global Config
            fetch('/api/gerenciar/configuracoes')
                .then(r => r.json())
                .then(data => {
                    // CORREÇÃO: Acessar 'configuracaoRota' antes de verificar 'inicio'
                    if (data?.configuracaoRota) {
                        setGlobalConfig(data.configuracaoRota);
                    }
                })
                .catch(console.error);

            // 3. Popula dados da Rota
            if (routeData) {
                setOrderedDemandas((routeData.optimizedDemands || []).filter(Boolean) as DemandaComIdStatus[]);

                // Decodifica polyline da API para passar ao mapa
                if (typeof routeData.routePath === 'string') {
                    try { setApiPolyline(decode(routeData.routePath)); } catch (e) { }
                } else if (Array.isArray(routeData.routePath)) {
                    setApiPolyline(routeData.routePath as [number, number][]);
                }
            }

            // Reset
            setNomeRota(''); setResponsavel(''); setPersonalizar(false);
            setCoordsInicio(null); setCoordsFim(null); setEndInicio({ cep: '', numero: '', logradouro: '', cidade: '', uf: '' }); setEndFim({ cep: '', numero: '', logradouro: '', cidade: '', uf: '' });
        }
    }, [open, routeData]);

    // Helpers de Busca (Mantidos iguais)
    const handleChangeAddress = (section: 'inicio' | 'fim', field: keyof EnderecoState, value: string) => {
        if (section === 'inicio') setEndInicio(prev => ({ ...prev, [field]: value })); else setEndFim(prev => ({ ...prev, [field]: value }));
    };
    const buscarCep = async (section: 'inicio' | 'fim') => {
        /* ... mesma lógica do ViaCEP ... */
        const cep = section === 'inicio' ? endInicio.cep : endFim.cep;
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await res.json();
            if (!data.erro) {
                const novoEnd = { cep: data.cep, logradouro: data.logradouro, cidade: data.localidade, uf: data.uf, numero: section === 'inicio' ? endInicio.numero : endFim.numero };
                if (section === 'inicio') setEndInicio(novoEnd); else setEndFim(novoEnd);
            }
        } catch (e) { }
    };
    const buscarCoordenadas = async (section: 'inicio' | 'fim') => {
        /* ... mesma lógica do Geocode ... */
        const dados = section === 'inicio' ? endInicio : endFim;
        if (!dados.logradouro || !dados.numero) return;
        try {
            const res = await fetch('/api/geocode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logradouro: dados.logradouro, numero: dados.numero, cidade: dados.cidade, uf: dados.uf }) });
            if (res.ok) {
                const data = await res.json();
                const coords = { lat: data.coordinates[0], lng: data.coordinates[1] };
                if (section === 'inicio') setCoordsInicio(coords); else setCoordsFim(coords);
            }
        } catch (e) { }
    };

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setOrderedDemandas((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
            // [IMPORTANTE] Se o usuário mexeu na ordem, a polyline da API (otimizada) não serve mais.
            // Passamos undefined para o mapa calcular linhas retas.
            setApiPolyline(undefined);
        }
    }

    const handleCreateRoute = async () => {
        if (!nomeRota.trim() || !responsavel) { setApiError('Preencha nome e responsável.'); return; }
        setIsSaving(true);
        try {
            const payload: any = { nome: nomeRota, responsavel, demandas: orderedDemandas.map(d => ({ id: d.id })) };
            if (personalizar) {
                if (coordsInicio) payload.inicio_personalizado = coordsInicio;
                if (coordsFim) payload.fim_personalizado = coordsFim;
            }
            const res = await fetch('/api/rotas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

            // [FIX START] Parse backend error message
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || data.error || 'Erro ao criar rota.');
            }
            // [FIX END]

            onRotaCriada(nomeRota, responsavel); onClose();
        } catch (e: any) { setApiError(e.message); } finally { setIsSaving(false); }
    };

    // 1. Resolvemos os pontos finais AQUI para passar para o mapa
    const resolvedStart = coordsInicio
        ? { latitude: coordsInicio.lat, longitude: coordsInicio.lng }
        : (globalConfig?.inicio ? { latitude: globalConfig.inicio.lat, longitude: globalConfig.inicio.lng } : null);

    const resolvedEnd = coordsFim
        ? { latitude: coordsFim.lat, longitude: coordsFim.lng }
        : (globalConfig?.fim ? { latitude: globalConfig.fim.lat, longitude: globalConfig.fim.lng } : null);

    // Se houve personalização, também invalidamos a polyline antiga para mostrar as linhas retas novas
    const mapPath = (personalizar && (coordsInicio || coordsFim)) ? undefined : apiPolyline;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <DialogTitle>Criar Nova Rota</DialogTitle>
            <DialogContent dividers>
                {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
                <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>

                    {/* ESQUERDA */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField label="Nome da Rota" fullWidth value={nomeRota} onChange={e => setNomeRota(e.target.value)} disabled={isSaving} />
                        <FormControl fullWidth>
                            <InputLabel id="resp">Responsável</InputLabel>
                            <Select labelId="resp" value={responsavel} label="Responsável" onChange={(e) => setResponsavel(e.target.value)} disabled={isSaving}>
                                {usersList.map(u => <MenuItem key={u.id} value={u.name}>{u.name}</MenuItem>)}
                            </Select>
                        </FormControl>

                        {/* Personalização */}
                        <Box sx={{ border: '1px solid #eee', borderRadius: 1, p: 1 }}>
                            <FormControlLabel control={<Checkbox checked={personalizar} onChange={e => setPersonalizar(e.target.checked)} />} label="Personalizar Início/Fim" />
                            <Collapse in={personalizar}>
                                <Stack spacing={2} sx={{ mt: 1, p: 1 }}>
                                    <Box>
                                        <Typography variant="caption" color="success.main" fontWeight="bold">Início</Typography>
                                        <Stack direction="row" spacing={1}>
                                            <TextField label="CEP" size="small" sx={{ width: 200 }} value={endInicio.cep} onChange={e => handleChangeAddress('inicio', 'cep', e.target.value)} onBlur={() => buscarCep('inicio')} />
                                            <TextField label="Número" size="small" fullWidth value={endInicio.numero} onChange={e => handleChangeAddress('inicio', 'numero', e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => buscarCoordenadas('inicio')}><SearchIcon /></IconButton></InputAdornment> }} />
                                        </Stack>
                                        {coordsInicio && <Typography variant="caption" color="success.main">✔ Definido</Typography>}
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="error.main" fontWeight="bold">Fim</Typography>
                                        <Stack direction="row" spacing={1}>
                                            <TextField label="CEP" size="small" sx={{ width: 200 }} value={endFim.cep} onChange={e => handleChangeAddress('fim', 'cep', e.target.value)} onBlur={() => buscarCep('fim')} />
                                            <TextField label="Número" size="small" fullWidth value={endFim.numero} onChange={e => handleChangeAddress('fim', 'numero', e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => buscarCoordenadas('fim')}><SearchIcon /></IconButton></InputAdornment> }} />
                                        </Stack>
                                        {coordsFim && <Typography variant="caption" color="success.main">✔ Definido</Typography>}
                                    </Box>
                                </Stack>
                            </Collapse>
                        </Box>

                        {/* Lista DnD */}
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={orderedDemandas.map(d => d.id!)} strategy={verticalListSortingStrategy}>
                                <List dense sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #eee' }}>
                                    {orderedDemandas.map(d => d.id ? <SortableItem key={d.id} demanda={d} /> : null)}
                                </List>
                            </SortableContext>
                        </DndContext>
                    </Box>

                    {/* DIREITA: Mapa */}
                    <Box sx={{ width: '60%', height: { xs: 300, md: 500 }, border: '1px solid #ccc', borderRadius: 1 }}>
                        {open && orderedDemandas.length > 0 ? (
                            <RouteMapComponent
                                demandas={orderedDemandas}
                                path={mapPath} // Passamos o path API ou undefined (para recalculo)
                                modalIsOpen={open}
                                startPoint={resolvedStart} // Passamos o ponto resolvido
                                endPoint={resolvedEnd}     // Passamos o ponto resolvido
                            />
                        ) : <Box sx={{ p: 4, textAlign: 'center' }}>Sem dados.</Box>}
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSaving}>Cancelar</Button>
                <Button onClick={handleCreateRoute} variant="contained" disabled={isSaving || !nomeRota || !responsavel}>{isSaving ? <CircularProgress size={24} /> : 'Salvar Rota'}</Button>
            </DialogActions>
        </Dialog>
    );
}