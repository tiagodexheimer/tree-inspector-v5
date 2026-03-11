// src/components/ui/demandas/AddDemandaModal.tsx
'use client';

import { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
    Select, MenuItem, InputLabel, FormControl, CircularProgress, Alert, SelectChangeEvent
} from "@mui/material";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InfoIcon from '@mui/icons-material/Info';
import { DemandaType } from "@/types/demanda";

// --- [NOVO] CACHE LOCAL ---
// Armazena resultados de CEP (ViaCEP) e Geocoding (Google) para evitar chamadas repetidas
const cepCache = new Map<string, CepResponse>();
const geocodeCache = new Map<string, [number, number]>(); // Chave: "Rua, Numero, Cidade, UF" -> Valor: [lat, lng]
// --- FIM CACHE ---
import { upload } from '@vercel/blob/client';

// ... (Interfaces CepResponse, GeocodeApiResponse, TipoDemandaOption, AddDemandaModalProps, FormData permanecem iguais) ...
interface CepResponse {
    cep: string; logradouro: string; complemento: string; bairro: string;
    localidade: string; uf: string; ibge: string; gia: string; ddd: string; siafi: string;
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

// Define extended type to cover API response properties used in useEffect to avoid 'as any'
interface DemandaEditType extends DemandaType {
    lat?: number | null;
    lng?: number | null;
    anexos?: any[]; // [NOVO]
}

interface AddDemandaModalProps {
    open: boolean;
    onClose: () => void;
    demandaInicial?: DemandaEditType | null; // <-- TIPO CORRIGIDO
    onSuccess?: () => void;
    availableTipos: TipoDemandaOption[];
}
interface FormData {
    nome_solicitante: string; telefone_solicitante: string; email_solicitante: string;
    cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string;
    tipo_demanda: string; descricao: string; prazo: string; protocolo: string;
    anexos?: { url: string; nome: string; type: string }[]; // [NOVO]
}


// --- Função Geocodificação ATUALIZADA com cache ---
async function geocodeAddressViaBackend(logradouro?: string | null, numero?: string | null, cidade?: string | null, uf?: string | null): Promise<[number, number] | null> {
    if (!logradouro || !numero || !cidade || !uf) {
        return null;
    }

    const cacheKey = `${logradouro}, ${numero}, ${cidade}, ${uf}`;

    // 1. Tenta buscar do cache
    if (geocodeCache.has(cacheKey)) {
        console.log('[FRONTEND /geocode] Cache hit para:', cacheKey);
        return geocodeCache.get(cacheKey)!;
    }

    // 2. Se não estiver no cache, chama o backend
    try {
        const response = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logradouro, numero, cidade, uf }),
        });
        const data: GeocodeApiResponse = await response.json();

        if (!response.ok) { throw new Error(data.message || data.error || `Erro ${response.status} ao chamar API interna.`); }

        if (data.coordinates) {
            const [lat, lon] = data.coordinates;
            // 3. Salva no cache antes de retornar
            geocodeCache.set(cacheKey, [lat, lon]);
            return [lat, lon];
        } else {
            throw new Error(data.message || 'Endereço não localizado.');
        }
    } catch (error) {
        console.error('[FRONTEND /geocode] Erro ao chamar backend:', error);
        if (error instanceof Error) { throw error; }
        else { throw new Error('Erro desconhecido ao chamar backend de geocodificação.'); }
    }
}
// --- Fim Função Geocodificação ---


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
        tipo_demanda: '', descricao: '', prazo: '', protocolo: '', // [NOVO]
    });
    const [addressFieldsDisabled, setAddressFieldsDisabled] = useState(true);
    // [MODIFICADO] Coordenadas (lat, lng) - Simplificado após Ação 1.2
    const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
    const [geocodingLoading, setGeocodingLoading] = useState<boolean>(false);
    const [geocodingError, setGeocodingError] = useState<string | null>(null);
    const [isParsingPdf, setIsParsingPdf] = useState(false);
    const [pdfImportSuccess, setPdfImportSuccess] = useState<string | null>(null);

    const { logradouro, numero, cidade, uf, cep } = formData;

    // --- useEffect para Preencher/Limpar Formulário (mantido) ---
    useEffect(() => {
        if (open) {
            console.log(`[MODAL ${isEditing ? 'EDIT' : 'ADD'}] Modal aberto. Demanda inicial:`, demandaInicial);
            setIsLoading(false);
            setCepLoading(false);
            setGeocodingLoading(false);
            setApiError(null);
            setCepError(null);
            setGeocodingError(null);
            setIsSubmitted(false);
            setProtocolo('');

            if (isEditing && demandaInicial) {
                const cepFormatado = demandaInicial.cep?.replace(/^(\d{5})(\d{3})$/, '$1-$2') || '';
                let prazoFormatado = '';
                if (demandaInicial.prazo) {
                    try {
                        const data = new Date(demandaInicial.prazo);
                        const dataLocal = new Date(data.getTime() + data.getTimezoneOffset() * 60000);
                        prazoFormatado = dataLocal.toISOString().split('T')[0];
                    } catch (e) {
                        console.error("[MODAL EDIT] Erro ao formatar data do prazo para edição:", demandaInicial.prazo, e);
                    }
                }
                setFormData({
                    nome_solicitante: demandaInicial.nome_solicitante || '',
                    telefone_solicitante: demandaInicial.telefone_solicitante || '',
                    email_solicitante: demandaInicial.email_solicitante || '',
                    cep: cepFormatado,
                    logradouro: demandaInicial.logradouro || '',
                    numero: demandaInicial.numero || '',
                    complemento: demandaInicial.complemento || '',
                    bairro: demandaInicial.bairro || '',
                    cidade: demandaInicial.cidade || '',
                    uf: demandaInicial.uf || '',
                    tipo_demanda: demandaInicial.tipo_demanda || '',
                    descricao: demandaInicial.descricao || '',
                    prazo: prazoFormatado,
                    protocolo: demandaInicial.protocolo || '', // [NOVO]
                    anexos: demandaInicial.anexos || [], // [NOVO]
                });

                // [MODIFICADO]: Inicializa coordenadas com lat/lng do objeto demandaInicial
                const initialLat = demandaInicial.lat;
                const initialLng = demandaInicial.lng;

                if (typeof initialLat === 'number' && typeof initialLng === 'number') {
                    setCoordinates([initialLat, initialLng]);
                } else {
                    setCoordinates(null);
                }

                setAddressFieldsDisabled(!(demandaInicial.logradouro || demandaInicial.bairro || demandaInicial.cidade || demandaInicial.uf));
            } else {
                setFormData({
                    nome_solicitante: '', telefone_solicitante: '', email_solicitante: '',
                    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
                    tipo_demanda: '', descricao: '', prazo: '', protocolo: '', // [NOVO]
                    anexos: [], // [NOVO]
                });
                setAddressFieldsDisabled(true);
                setCoordinates(null);
            }
        }
    }, [open, isEditing, demandaInicial]);

    // --- handleChange (mantido) ---
    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
        const { name, value } = event.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'cep') {
            setCepError(null);
            setGeocodingError(null);
            if (value.replace(/\D/g, '').length < 8) {
                setAddressFieldsDisabled(true);
                setFormData(prev => ({ ...prev, logradouro: '', bairro: '', cidade: '', uf: '' }));
                setCoordinates(null);
            }
        }
        if (['logradouro', 'numero', 'cidade', 'uf'].includes(name)) {
            setGeocodingError(null);
        }
        if (apiError) setApiError(null);
    };

    // --- Função auxiliar para buscar CEP (Refatorada) ---
    const lookupCep = async (cepRaw: string) => {
        if (cepRaw.length !== 8) return;

        setCepLoading(true); setCepError(null); setAddressFieldsDisabled(true);
        try {
            // 1. Tenta buscar do cache
            if (cepCache.has(cepRaw)) {
                const data = cepCache.get(cepRaw)!;
                console.log("[MODAL] ViaCEP Cache hit:", cepRaw);
                setFormData(prev => ({
                    ...prev,
                    logradouro: data.logradouro,
                    bairro: data.bairro,
                    cidade: data.localidade,
                    uf: data.uf
                }));
                setCepLoading(false);
                setAddressFieldsDisabled(false);
                return;
            }

            // 2. Se não está no cache, faz a requisição
            const response = await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`);
            if (!response.ok) throw new Error('Falha na requisição ao ViaCEP.');
            const data: CepResponse = await response.json();
            if (data.erro) throw new Error('CEP não encontrado.');

            // Salva no cache antes de setar o estado
            cepCache.set(cepRaw, data);

            setFormData(prev => ({
                ...prev,
                logradouro: data.logradouro,
                bairro: data.bairro,
                cidade: data.localidade,
                uf: data.uf
            }));
            setAddressFieldsDisabled(false);
        } catch (err) {
            console.error("Erro na busca do CEP:", err);
            setCepError(err instanceof Error ? err.message : 'Erro ao buscar CEP.');
            setAddressFieldsDisabled(false);
            setFormData(prev => ({ ...prev, logradouro: '', bairro: '', cidade: '', uf: '' }));
        } finally {
            setCepLoading(false);
        }
    };

    const handleCepBlur = async (event: React.FocusEvent<HTMLInputElement>) => {
        const cepRaw = event.target.value.replace(/\D/g, '');
        const formattedCep = cepRaw.replace(/^(\d{5})(\d{3})$/, '$1-$2');
        setFormData(prev => ({ ...prev, cep: formattedCep }));
        setCoordinates(null);
        setGeocodingError(null);

        if (cepRaw.length === 8) {
            await lookupCep(cepRaw);
        } else if (cepRaw.length > 0) {
            setCepError('CEP inválido. Deve conter 8 dígitos.');
            setAddressFieldsDisabled(true);
            setFormData(prev => ({ ...prev, logradouro: '', bairro: '', cidade: '', uf: '' }));
        } else {
            setCepError(null);
            setAddressFieldsDisabled(true);
            setFormData(prev => ({ ...prev, logradouro: '', bairro: '', cidade: '', uf: '' }));
        }
    };

    // --- [NOVO] Handler para Importação de PDF ---
    const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsParsingPdf(true);
        setApiError(null);
        setPdfImportSuccess(null);

        try {
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);

            const response = await fetch('/api/demandas/parse-pdf', {
                method: 'POST',
                body: uploadFormData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao processar PDF.');
            }

            const data = await response.json();
            console.log("[MODAL] Dados extraídos do PDF:", data);

            // Atualiza o formulário com os dados extraídos
            setFormData(prev => ({
                ...prev,
                protocolo: data.protocolo || prev.protocolo,
                nome_solicitante: data.nome_solicitante || prev.nome_solicitante,
                cep: data.cep || prev.cep,
                logradouro: data.logradouro || prev.logradouro,
                numero: data.numero || prev.numero,
                bairro: data.bairro || prev.bairro,
                cidade: data.cidade || prev.cidade,
                uf: data.uf || prev.uf,
                tipo_demanda: data.tipo_demanda || prev.tipo_demanda,
                descricao: data.descricao || prev.descricao,
            }));

            // Se extraiu CEP, tenta buscar endereço
            if (data.cep) {
                const rawCep = data.cep.replace(/\D/g, '');
                if (rawCep.length === 8) {
                    await lookupCep(rawCep);
                }
            }

            setPdfImportSuccess("Dados importados do PDF com sucesso!");

            // Limpa mensagem de sucesso após 5 segundos
            setTimeout(() => setPdfImportSuccess(null), 5000);

        } catch (err) {
            console.error("[MODAL] Erro ao importar PDF:", err);
            setApiError(err instanceof Error ? err.message : 'Erro ao processar PDF.');
        } finally {
            setIsParsingPdf(false);
            // Limpa o input file para permitir selecionar o mesmo arquivo novamente se necessário
            event.target.value = '';
        }
    };

    // --- useEffect de Geocodificação (usando a função atualizada com cache) ---
    useEffect(() => {
        const attemptGeocode = async () => {
            const cepNumerico = cep.replace(/\D/g, '');
            if (cepNumerico.length === 8 && logradouro && numero && cidade && uf && !cepError) {
                setGeocodingLoading(true);
                setGeocodingError(null);
                setCoordinates(null);
                try {
                    const result = await geocodeAddressViaBackend(logradouro, numero, cidade, uf);
                    if (result) {
                        setCoordinates(result);
                    } else {
                        // Se a geocodificação falhar (e.g., ZERO_RESULTS), mostra erro de geocoding
                        setGeocodingError('Não foi possível obter coordenadas para este endereço.');
                        setCoordinates(null);
                    }
                } catch (error) {
                    // Erro na chamada (e.g., API Key inválida, erro de rede)
                    setGeocodingError(error instanceof Error ? error.message : 'Erro ao obter coordenadas.');
                    setCoordinates(null);
                } finally {
                    setGeocodingLoading(false);
                }
            } else {
                // Se algum campo essencial estiver faltando ou houver erro no CEP, limpamos.
                setCoordinates(null);
                if (!cepError && !(cepNumerico.length === 8 && (!logradouro || !numero || !cidade || !uf))) {
                    setGeocodingError(null);
                }
                setGeocodingLoading(false);
            }
        };
        const handler = setTimeout(() => {
            if (open) {
                attemptGeocode();
            }
        }, 800);
        return () => { clearTimeout(handler); };
    }, [cep, numero, logradouro, cidade, uf, cepError, open]);
    // --- Fim useEffect Geocodificação ---

    // --- Função de Submit (handleSubmit) ---
    const handleSubmit = async () => {
        console.log(`[FRONTEND MODAL] Tentando ${isEditing ? 'salvar edição' : 'registrar nova demanda'}...`);
        setIsLoading(true);
        setApiError(null);

        // Validações básicas 
        if (!formData.cep || !/^\d{5}-?\d{3}$/.test(formData.cep)) { setApiError('O campo CEP é obrigatório e deve estar no formato 00000-000.'); setIsLoading(false); return; }
        if (!formData.numero || formData.numero.trim() === '') { setApiError('O campo Número é obrigatório.'); setIsLoading(false); return; }
        if (!formData.tipo_demanda) { setApiError('O campo Tipo de Demanda é obrigatório.'); setIsLoading(false); return; }
        if (!formData.descricao || formData.descricao.trim() === '') { setApiError('O campo Descrição é obrigatório.'); setIsLoading(false); return; }

        try {
            const apiUrl = isEditing ? `/api/demandas/${demandaInicial?.id}` : '/api/demandas';
            const method = isEditing ? 'PUT' : 'POST';

            // Coordinates é [lat, lng]
            const bodyPayload = {
                ...formData,
                coordinates: coordinates
            };

            console.log(`[FRONTEND MODAL] Enviando ${method} para ${apiUrl} com dados:`, bodyPayload);

            const response = await fetch(apiUrl, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });

            const result = await response.json().catch(() => ({}));
            console.log(`[FRONTEND MODAL] Resposta da API (${method}):`, response.status, result);

            if (!response.ok) {
                throw new Error(result.message || result.error || `Erro ${response.status} ao ${isEditing ? 'atualizar' : 'registrar'} demanda.`);
            }

            if (isEditing) {
                console.log("[FRONTEND MODAL] Edição salva com sucesso.");
                if (onSuccess) onSuccess();
            } else {
                console.log("[FRONTEND MODAL] Nova demanda registrada com sucesso.");
                setProtocolo(result.protocolo || 'N/A');
                setIsSubmitted(true);
            }

        } catch (err) {
            console.error(`[FRONTEND MODAL] Erro ao ${isEditing ? 'salvar' : 'registrar'} demanda:`, err);
            setApiError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
        } finally {
            setIsLoading(false);
        }
    };
    // --- Fim Função de Submit ---

    // --- Renderização JSX ---
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            {/* --- Tela de Sucesso (Apenas para Criação) --- */}
            {isSubmitted && !isEditing ? (
                <>
                    <DialogTitle sx={{ textAlign: 'center', pt: 4 }}>Sucesso!</DialogTitle>
                    <DialogContent sx={{ textAlign: 'center', p: 4 }}>
                        <CheckCircleOutlineIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
                        <Typography variant="h5" gutterBottom>Demanda Registrada com Sucesso!</Typography>
                        <Typography variant="body1">O número do seu protocolo de atendimento é:</Typography>
                        <Typography variant="h6" color="primary" sx={{ mt: 1, fontWeight: 'bold' }}>{protocolo}</Typography>
                    </DialogContent>
                    <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
                        <Button onClick={onClose} variant="contained">Fechar</Button>
                    </DialogActions>
                </>
            ) : (
                /* --- Formulário (Criação ou Edição) --- */
                <>
                    <DialogTitle>{isEditing ? `Editar Demanda #${demandaInicial?.id}` : 'Registrar Nova Demanda'}</DialogTitle>
                    <DialogContent>
                        {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
                        {pdfImportSuccess && <Alert severity="success" sx={{ mb: 2 }}>{pdfImportSuccess}</Alert>}
                        {geocodingError && !apiError && !cepError && <Alert severity="warning" sx={{ mb: 2 }}>{geocodingError}</Alert>}
                        {cepError && !apiError && <Alert severity="warning" sx={{ mb: 2 }}>{cepError}</Alert>}

                        <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, border: '1px dashed #ccc' }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <InfoIcon fontSize="inherit" />
                                Tem um PDF da demanda? Importe os dados automaticamente.
                            </Typography>
                            <Button
                                component="label"
                                variant="outlined"
                                startIcon={isParsingPdf ? <CircularProgress size={20} /> : <PictureAsPdfIcon />}
                                disabled={isParsingPdf || isEditing}
                                color="secondary"
                                size="small"
                                fullWidth
                            >
                                {isParsingPdf ? 'Analisando...' : 'Importar Dados de PDF'}
                                <input
                                    type="file"
                                    hidden
                                    accept=".pdf"
                                    onChange={handlePdfUpload}
                                />
                            </Button>
                        </Box>

                        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            {/* --- Protocolo e Solicitante --- */}
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Dados da Demanda</Typography>

                            {/* [NOVO] Campo Protocolo Opcional */}
                            <TextField
                                label="Protocolo / ID Externo (Opcional)"
                                name="protocolo"
                                variant="outlined"
                                fullWidth
                                value={formData.protocolo}
                                onChange={handleChange}
                                placeholder="Deixe em branco para gerar automaticamente"
                                helperText="Preencha apenas se quiser usar um ID de outro sistema."
                                disabled={isEditing} // Não editamos protocolo de demanda existente
                            />

                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 1 }}>Dados do Solicitante</Typography>

                            <TextField label="Nome Completo" name="nome_solicitante" variant="outlined" fullWidth value={formData.nome_solicitante} onChange={handleChange} />

                            <TextField label="Telefone" name="telefone_solicitante" variant="outlined" fullWidth value={formData.telefone_solicitante} onChange={handleChange} />
                            <TextField label="Email" name="email_solicitante" type="email" variant="outlined" fullWidth value={formData.email_solicitante} onChange={handleChange} />

                            {/* --- Endereço --- */}
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>Endereço</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                <TextField
                                    label="CEP" name="cep" variant="outlined" required value={formData.cep} onChange={handleChange} onBlur={handleCepBlur}
                                    inputProps={{ maxLength: 9 }} InputProps={{ endAdornment: cepLoading ? <CircularProgress size={20} /> : null }}
                                    error={!!cepError || (!formData.cep && !!apiError)}
                                    sx={{ width: { xs: '100%', sm: 'calc(40% - 8px)' } }}
                                />
                                <TextField label="Logradouro" name="logradouro" variant="outlined" fullWidth value={formData.logradouro} onChange={handleChange} disabled={addressFieldsDisabled} InputLabelProps={{ shrink: !!formData.logradouro }} sx={{ width: { xs: '100%', sm: 'calc(60% - 8px)' } }} />
                                <TextField
                                    label="Número" name="numero" variant="outlined" required value={formData.numero} onChange={handleChange}
                                    error={!formData.numero && !!apiError}
                                    sx={{ width: { xs: 'calc(40% - 8px)', sm: 'calc(30% - 8px)' } }}
                                />
                                <TextField label="Complemento" name="complemento" variant="outlined" value={formData.complemento} onChange={handleChange} sx={{ width: { xs: 'calc(60% - 8px)', sm: 'calc(70% - 8px)' } }} />
                                <TextField label="Bairro" name="bairro" variant="outlined" fullWidth value={formData.bairro} onChange={handleChange} disabled={addressFieldsDisabled} InputLabelProps={{ shrink: !!formData.bairro }} sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }} />
                                <TextField label="Cidade" name="cidade" variant="outlined" fullWidth value={formData.cidade} onChange={handleChange} disabled={addressFieldsDisabled} InputLabelProps={{ shrink: !!formData.cidade }} sx={{ width: { xs: 'calc(65% - 8px)', sm: 'calc(35% - 8px)' } }} />
                                <TextField label="UF" name="uf" variant="outlined" fullWidth value={formData.uf} onChange={handleChange} disabled={addressFieldsDisabled} InputLabelProps={{ shrink: !!formData.uf }} inputProps={{ maxLength: 2, style: { textTransform: 'uppercase' } }} sx={{ width: { xs: 'calc(35% - 8px)', sm: 'calc(15% - 8px)' } }} />
                            </Box>

                            {/* Exibição das Coordenadas */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: '40px', px: 1, py: 0.5, backgroundColor: geocodingError ? '#fff0f0' : '#f0f0f0', borderRadius: 1, border: geocodingError ? '1px solid #d32f2f' : 'none' }}>
                                <MyLocationIcon fontSize="small" color={coordinates ? "primary" : (geocodingError ? "error" : "disabled")} />
                                <Typography variant="body2" color={geocodingError ? "error" : "text.secondary"} sx={{ flexGrow: 1 }}>
                                    {geocodingLoading ? 'Obtendo coordenadas...' :
                                        coordinates ? `Lat: ${coordinates[0].toFixed(6)}, Lon: ${coordinates[1].toFixed(6)}` :
                                            geocodingError ? `${geocodingError}` :
                                                'Coordenadas geográficas (automático)'}
                                </Typography>
                                {geocodingLoading && <CircularProgress size={18} sx={{ mr: 1 }} />}
                            </Box>

                            {/* --- Detalhes da Demanda --- */}
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>Detalhes da Demanda</Typography>
                            <FormControl fullWidth required error={!formData.tipo_demanda && !!apiError}>
                                <InputLabel id="tipo-demanda-select-label">Tipo de Demanda</InputLabel>
                                <Select
                                    labelId="tipo-demanda-select-label"
                                    label="Tipo de Demanda"
                                    name="tipo_demanda"
                                    value={formData.tipo_demanda}
                                    onChange={handleChange}
                                >
                                    <MenuItem value="" disabled>Selecione...</MenuItem>
                                    {availableTipos?.map((tipo) => (
                                        <MenuItem key={tipo.id} value={tipo.nome}>
                                            {tipo.nome}
                                        </MenuItem>
                                    ))}
                                    {(!availableTipos || availableTipos.length === 0) && <MenuItem value="Outro">Outro (Carregando...)</MenuItem>}
                                    {(availableTipos && !availableTipos.some(t => t.nome === 'Outro')) && <MenuItem value="Outro">Outro</MenuItem>}
                                </Select>
                            </FormControl>
                            <TextField
                                label="Descrição" name="descricao" variant="outlined" fullWidth multiline rows={4} required value={formData.descricao} onChange={handleChange}
                                error={!formData.descricao && !!apiError}
                            />
                            <TextField label="Prazo (Opcional)" name="prazo" type="date" variant="outlined" fullWidth value={formData.prazo} onChange={handleChange} InputLabelProps={{ shrink: true }} />

                            {/* Anexos */}
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>Anexos (Opcional)</Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Button
                                    component="label"
                                    variant="outlined"
                                    startIcon={<CloudUploadIcon />}
                                    disabled={isLoading}
                                >
                                    Carregar Arquivos
                                    <input
                                        type="file"
                                        hidden
                                        multiple
                                        onChange={async (e) => {
                                            if (!e.target.files || e.target.files.length === 0) return;

                                            setIsLoading(true);
                                            const newAnexos: any[] = [...(formData.anexos || [])];

                                            try {
                                                for (const file of Array.from(e.target.files)) {
                                                    const blob = await upload(file.name, file, {
                                                        access: 'public',
                                                        handleUploadUrl: '/api/upload',
                                                    });
                                                    newAnexos.push({
                                                        url: blob.url,
                                                        nome: file.name,
                                                        type: file.type
                                                    });
                                                }
                                                setFormData(prev => ({ ...prev, anexos: newAnexos }));
                                                console.log("Upload concluído:", newAnexos);
                                            } catch (error) {
                                                console.error("Erro no upload:", error);
                                                setApiError("Erro ao enviar arquivos. Tente novamente.");
                                            } finally {
                                                setIsLoading(false);
                                            }
                                        }}
                                    />
                                </Button>

                                {/* Lista de Arquivos Carregados */}
                                {formData.anexos && formData.anexos.length > 0 && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {formData.anexos.map((anexo: any, index: number) => (
                                            <Box
                                                key={index}
                                                sx={{
                                                    border: '1px solid #ddd',
                                                    borderRadius: 1,
                                                    p: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    bgcolor: '#f9f9f9'
                                                }}
                                            >
                                                <Typography variant="caption" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {anexo.nome}
                                                </Typography>
                                                <Button
                                                    size="small"
                                                    color="error"
                                                    sx={{ minWidth: 30, p: 0 }}
                                                    onClick={() => {
                                                        const newAnexos = formData.anexos?.filter((_, i) => i !== index);
                                                        setFormData(prev => ({ ...prev, anexos: newAnexos }));
                                                    }}
                                                >
                                                    X
                                                </Button>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </Box>
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