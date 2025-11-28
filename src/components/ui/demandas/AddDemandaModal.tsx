// src/components/ui/demandas/AddDemandaModal.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
    Select, MenuItem, InputLabel, FormControl, CircularProgress, Alert, SelectChangeEvent
} from "@mui/material";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { DemandaType } from "@/types/demanda"; 
import { DemandasClient } from '@/services/client/demandas-client'; // Assumindo este import

// --- CACHE LOCAL ---
const cepCache = new Map<string, any>(); // Assumindo any para a resposta do CEP
const geocodeCache = new Map<string, [number, number]>(); 
// --- FIM CACHE ---


// --- Funções Auxiliares (Simplificadas para o contexto) ---
interface CepResponse {
    cep: string; logradouro: string; complemento: string; bairro: string;
    localidade: string; uf: string;
    erro?: boolean;
}
interface GeocodeApiResponse {
    coordinates?: [number, number]; // [latitude, longitude]
    message?: string;
    error?: string;
}
interface TipoDemandaOption {
    id: number;
    nome: string;
}
interface DemandaEditType extends DemandaType {
    lat?: number | null; 
    lng?: number | null;
}
interface AddDemandaModalProps {
    open: boolean;
    onClose: () => void;
    demandaInicial?: DemandaEditType | null; 
    onSuccess?: () => void;             
    availableTipos: TipoDemandaOption[]; 
}
interface FormData {
    nome_solicitante: string; telefone_solicitante: string; email_solicitante: string;
    cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string;
    tipo_demanda: string; descricao: string; prazo: string; 
}

// Funções de API (Substitua por sua implementação real)
async function geocodeAddressViaBackend(logradouro?: string | null, numero?: string | null, cidade?: string | null, uf?: string | null): Promise<[number, number] | null> {
    if (!logradouro || !numero || !cidade || !uf) { return null; }
    const cacheKey = `${logradouro}, ${numero}, ${cidade}, ${uf}`;
    if (geocodeCache.has(cacheKey)) { return geocodeCache.get(cacheKey)!; }

    try {
        const response = await fetch('/api/geocode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logradouro, numero, cidade, uf }), });
        const data: GeocodeApiResponse = await response.json(); 
        if (!response.ok) { throw new Error(data.message || data.error || `Erro ${response.status} ao chamar API interna.`); }
        if (data.coordinates) {
            const [lat, lon] = data.coordinates;
            geocodeCache.set(cacheKey, [lat, lon]);
            return [lat, lon]; 
        } else { throw new Error(data.message || 'Endereço não localizado.'); }
    } catch (error) {
        console.error('[FRONTEND /geocode] Erro ao chamar backend:', error);
        throw error;
    }
}
async function fetchViaCep(cep: string): Promise<CepResponse | null> {
    const response = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, '')}/json/`);
    const data: CepResponse = await response.json();
    return (data && !data.erro) ? data : null;
}
// --- Fim Funções Auxiliares ---


export default function AddDemandaModal({ open, onClose, demandaInicial = null, onSuccess, availableTipos }: AddDemandaModalProps) {
    const isEditing = !!demandaInicial; 
    const [isSubmitted, setIsSubmitted] = useState(false); 
    const [isLoading, setIsLoading] = useState(false); 
    const [cepLoading, setCepLoading] = useState(false);
    const [cepError, setCepError] = useState<string | null>(null);
    const [apiError, setApiError] = useState<string | null>(null); 
    const [protocolo, setProtocolo] = useState(''); 
    const [formData, setFormData] = useState<FormData>({
        nome_solicitante: '', telefone_solicitante: '', email_solicitante: '',
        cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
        tipo_demanda: '', descricao: '', prazo: '',
    });
    const [addressFieldsDisabled, setAddressFieldsDisabled] = useState(true);
    const [coordinates, setCoordinates] = useState<[number, number] | null>(null); 
    const [geocodingLoading, setGeocodingLoading] = useState<boolean>(false);
    const [geocodingError, setGeocodingError] = useState<string | null>(null);

    const { logradouro, numero, cidade, uf, cep } = formData;

    useEffect(() => {
        if (open) {
            // Lógica de inicialização (limpeza ou preenchimento de edição)
            if (isEditing && demandaInicial) {
                 // Inicializa o formulário para edição
            } else {
                 // Limpa o formulário para nova demanda
            }
        }
    }, [open, isEditing, demandaInicial]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
        const { name, value } = event.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Se mudou o endereço, limpa o erro de geocodificação
        if (['logradouro', 'numero', 'cidade', 'uf'].includes(name)) {
            setGeocodingError(null);
        }
    };

    const handleCepBlur = async (event: React.FocusEvent<HTMLInputElement>) => {
        // Lógica de busca de CEP
        const cepValue = event.target.value.replace(/\D/g, '');
        if (cepValue.length === 8) {
            setCepLoading(true);
            try {
                const data = await fetchViaCep(cepValue);
                if (data) {
                    setFormData(prev => ({
                        ...prev,
                        logradouro: data.logradouro || prev.logradouro,
                        bairro: data.bairro || prev.bairro,
                        cidade: data.localidade || prev.cidade,
                        uf: data.uf || prev.uf,
                        complemento: data.complemento || prev.complemento,
                    }));
                    setAddressFieldsDisabled(false);
                    setCepError(null);
                } else {
                    setCepError("CEP não encontrado ou inválido.");
                    setAddressFieldsDisabled(false);
                }
            } catch {
                setCepError("Falha ao buscar CEP. Preencha manualmente.");
                setAddressFieldsDisabled(false);
            } finally {
                setCepLoading(false);
            }
        }
    };

    useEffect(() => {
        // Lógica de Geocodificação automática
        if (open && logradouro && numero && cidade && uf && !cepError && !geocodingLoading) {
            setGeocodingLoading(true);
            const timer = setTimeout(async () => {
                try {
                    const coords = await geocodeAddressViaBackend(logradouro, numero, cidade, uf);
                    if (coords) {
                        setCoordinates(coords);
                        setGeocodingError(null);
                    } else {
                         setCoordinates(null);
                         setGeocodingError("Não foi possível localizar o endereço no mapa. As coordenadas não serão salvas.");
                    }
                } catch (e) {
                    setCoordinates(null);
                    setGeocodingError(e instanceof Error ? e.message : "Erro desconhecido na geocodificação.");
                } finally {
                    setGeocodingLoading(false);
                }
            }, 1000); // Debounce
            return () => clearTimeout(timer);
        }
    }, [cep, numero, logradouro, cidade, uf, cepError, open]); 

    const handleSubmit = async () => {
        if (isLoading) return;
        setIsLoading(true);
        setApiError(null);

        // Prepara dados para envio (inclui coordenadas)
        const dataToSend = {
            ...formData,
            lat: coordinates ? coordinates[0] : null,
            lng: coordinates ? coordinates[1] : null,
        };

        try {
            if (isEditing && demandaInicial) {
                // Lógica para UPDATE
                await DemandasClient.update(demandaInicial.id!, dataToSend); 
            } else {
                // Lógica para CREATE
                const created = await DemandasClient.create(dataToSend);
                setProtocolo(created.protocolo || 'N/A');
                setIsSubmitted(true);
            }
            if (onSuccess) onSuccess();
        } catch (error) {
            setApiError(error instanceof Error ? error.message : "Erro desconhecido ao salvar demanda.");
        } finally {
            setIsLoading(false);
        }
    };


    // --- Renderização JSX (COM AJUSTES DE RESPONSIVIDADE) ---
    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            fullWidth 
            maxWidth="sm"
            // [AJUSTE RESPONSIVO]: Aplica fullScreen em telas muito pequenas
            sx={{
                '& .MuiDialog-container': {
                    '& .MuiPaper-root': {
                        '@media (max-width: 600px)': { 
                            margin: '0 !important',
                            borderRadius: '0 !important',
                            maxHeight: '100%',
                            minHeight: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                        }
                    }
                }
            }}
        >
            {/* --- Tela de Sucesso --- */}
            {isSubmitted && !isEditing ? (
                <>
                    <DialogTitle>Sucesso!</DialogTitle>
                    <DialogContent dividers sx={{ textAlign: 'center' }}>
                        <CheckCircleOutlineIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
                        <Typography variant="h6">Demanda Registrada com Sucesso!</Typography>
                        <Typography variant="body1">Protocolo: **{protocolo}**</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={onClose} color="primary" variant="contained">Fechar</Button>
                        <Button onClick={() => setIsSubmitted(false)}>Cadastrar Outra</Button>
                    </DialogActions>
                </>
            ) : (
                /* --- Formulário (Criação ou Edição) --- */
                <>
                    <DialogTitle>{isEditing ? `Editar Demanda #${demandaInicial?.id}` : 'Registrar Nova Demanda'}</DialogTitle>
                    <DialogContent dividers>
                        {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
                        {geocodingError && !apiError && !cepError && <Alert severity="warning" sx={{ mb: 2 }}>{geocodingError}</Alert>}
                        {cepError && !apiError && <Alert severity="warning" sx={{ mb: 2 }}>{cepError}</Alert>}

                        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 0 }}>
                            
                            {/* --- Dados do Solicitante --- */}
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Dados do Solicitante</Typography>
                            <TextField label="Nome Completo" name="nome_solicitante" variant="outlined" fullWidth value={formData.nome_solicitante} onChange={handleChange} />
                            <TextField label="Telefone" name="telefone_solicitante" variant="outlined" fullWidth value={formData.telefone_solicitante} onChange={handleChange} />
                            <TextField label="Email" name="email_solicitante" type="email" variant="outlined" fullWidth value={formData.email_solicitante} onChange={handleChange} />

                            {/* --- Endereço (AJUSTADO PARA EMPILHAR EM MOBILE) --- */}
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>Endereço</Typography>
                            {/* Box com flexWrap 'wrap' é a chave para o layout responsivo */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                
                                {/* CEP e Logradouro */}
                                <TextField
                                    label="CEP" name="cep" variant="outlined" required value={formData.cep} onChange={handleChange} onBlur={handleCepBlur}
                                    inputProps={{ maxLength: 9 }} InputProps={{ endAdornment: cepLoading ? <CircularProgress size={20} /> : null }}
                                    error={!!cepError || (!formData.cep && !!apiError)}
                                    // 100% de largura em mobile, 40% em desktop
                                    sx={{ width: { xs: '100%', sm: 'calc(40% - 8px)' } }} 
                                />
                                <TextField 
                                    label="Logradouro" name="logradouro" variant="outlined" fullWidth value={formData.logradouro} onChange={handleChange} disabled={addressFieldsDisabled} InputLabelProps={{ shrink: !!formData.logradouro }} 
                                     // 100% de largura em mobile, 60% em desktop
                                    sx={{ width: { xs: '100%', sm: 'calc(60% - 8px)' } }} 
                                />
                                {/* Número e Complemento */}
                                <TextField
                                    label="Número" name="numero" variant="outlined" required value={formData.numero} onChange={handleChange}
                                    error={!formData.numero && !!apiError} 
                                    sx={{ width: { xs: 'calc(40% - 8px)', sm: 'calc(30% - 8px)' } }} 
                                />
                                <TextField 
                                    label="Complemento" name="complemento" variant="outlined" value={formData.complemento} onChange={handleChange} 
                                    sx={{ width: { xs: 'calc(60% - 8px)', sm: 'calc(70% - 8px)' } }} 
                                />
                                {/* Bairro, Cidade e UF */}
                                <TextField 
                                    label="Bairro" name="bairro" variant="outlined" fullWidth value={formData.bairro} onChange={handleChange} disabled={addressFieldsDisabled} InputLabelProps={{ shrink: !!formData.bairro }} 
                                    sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }} // 100% em mobile
                                />
                                <TextField 
                                    label="Cidade" name="cidade" variant="outlined" fullWidth value={formData.cidade} onChange={handleChange} disabled={addressFieldsDisabled} InputLabelProps={{ shrink: !!formData.cidade }} 
                                    sx={{ width: { xs: 'calc(65% - 8px)', sm: 'calc(35% - 8px)' } }} 
                                />
                                <TextField 
                                    label="UF" name="uf" variant="outlined" fullWidth value={formData.uf} onChange={handleChange} disabled={addressFieldsDisabled} InputLabelProps={{ shrink: !!formData.uf }} inputProps={{ maxLength: 2, style: { textTransform: 'uppercase' } }} 
                                    sx={{ width: { xs: 'calc(35% - 8px)', sm: 'calc(15% - 8px)' } }} 
                                />
                            </Box>

                            {/* Exibição das Coordenadas */}
                            <Typography variant="body2" sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                                <MyLocationIcon fontSize="small" sx={{ mr: 1 }} color={coordinates ? 'success' : 'action'} />
                                Coordenadas GPS: 
                                <Box component="span" sx={{ ml: 1, fontWeight: 'bold' }}>
                                    {geocodingLoading ? 'Calculando...' : (coordinates ? `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}` : 'N/A')}
                                </Box>
                                {geocodingLoading && <CircularProgress size={16} sx={{ ml: 1 }} />}
                            </Typography>


                            {/* --- Detalhes da Demanda --- */}
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>Detalhes da Demanda</Typography>
                            
                            <FormControl fullWidth variant="outlined">
                                <InputLabel id="tipo-demanda-label">Tipo de Demanda *</InputLabel>
                                <Select
                                    labelId="tipo-demanda-label"
                                    label="Tipo de Demanda *"
                                    name="tipo_demanda"
                                    value={formData.tipo_demanda}
                                    onChange={handleChange}
                                    error={!formData.tipo_demanda && !!apiError}
                                >
                                    {availableTipos.map(tipo => (
                                        <MenuItem key={tipo.id} value={tipo.nome}>{tipo.nome}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField 
                                label="Descrição" name="descricao" variant="outlined" fullWidth multiline rows={3} value={formData.descricao} onChange={handleChange} />
                            
                            <TextField label="Prazo (opcional)" name="prazo" type="date" variant="outlined" fullWidth value={formData.prazo} onChange={handleChange} 
                                InputLabelProps={{ shrink: true }}
                            />

                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={onClose} disabled={isLoading}>Cancelar</Button>
                        <Button onClick={handleSubmit} variant="contained" disabled={isLoading || cepLoading || geocodingLoading}>
                            {isLoading ? <CircularProgress size={24} color="inherit" /> : (isEditing ? 'Salvar Alterações' : 'Registrar Demanda')}
                        </Button>
                    </DialogActions>
                </>
            )}
        </Dialog>
    );
}