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
import { DemandaType } from "@/types/demanda"; // Certifique-se que o tipo está importado corretamente

// Interface CepResponse (sem alterações)
interface CepResponse {
    cep: string; logradouro: string; complemento: string; bairro: string;
    localidade: string; uf: string; ibge: string; gia: string; ddd: string; siafi: string;
    erro?: boolean;
}

// Interface para a resposta da API de geocodificação do backend
interface GeocodeApiResponse {
    coordinates?: [number, number]; // [latitude, longitude]
    message?: string;
    error?: string;
}

// *** ATUALIZAÇÃO: Props do Modal ***
interface AddDemandaModalProps {
  open: boolean;
  onClose: () => void;
  demandaInicial?: DemandaType | null; // <-- Prop para dados iniciais (edição)
  onSuccess?: () => void;             // <-- Callback para sucesso (edição)
}

interface FormData {
    nome_solicitante: string; telefone_solicitante: string; email_solicitante: string;
    cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string;
    tipo_demanda: string; descricao: string; prazo: string; // Prazo como string (YYYY-MM-DD) para o input
}

// Função para chamar o backend de geocodificação (sem alterações necessárias aqui)
async function geocodeAddressViaBackend(logradouro?: string | null, numero?: string | null, cidade?: string | null, uf?: string | null): Promise<[number, number] | null> {
    console.log(`[FRONTEND /geocode] Tentando geocodificar via backend: ${numero} ${logradouro}, ${cidade}, ${uf}`);
    if (!logradouro || !numero || !cidade || !uf) {
        console.log('[FRONTEND /geocode] Dados insuficientes para enviar ao backend.');
        return null;
    }
    try {
        const response = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logradouro, numero, cidade, uf }),
        });
        const data: GeocodeApiResponse = await response.json(); // Usa a interface GeocodeApiResponse
        console.log('[FRONTEND /geocode] Resposta do backend:', response.status, data);
        if (!response.ok) { throw new Error(data.message || data.error || `Erro ${response.status} ao chamar API interna.`); }
        if (data.coordinates) {
            const [lat, lon] = data.coordinates;
            console.log(`[FRONTEND /geocode] Coordenadas recebidas do backend: Lat=${lat}, Lon=${lon}`);
            return [lat, lon]; // Retorna [latitude, longitude]
        } else {
            console.log('[FRONTEND /geocode] Backend não retornou coordenadas.');
            // Lança erro para ser pego pelo useEffect
            throw new Error(data.message || 'Endereço não localizado.');
        }
    } catch (error) {
        console.error('[FRONTEND /geocode] Erro ao chamar backend:', error);
        if (error instanceof Error) { throw error; }
        else { throw new Error('Erro desconhecido ao chamar backend de geocodificação.'); }
    }
}

// *** ATUALIZAÇÃO: Componente Principal ***
export default function AddDemandaModal({ open, onClose, demandaInicial = null, onSuccess }: AddDemandaModalProps) {
    const isEditing = !!demandaInicial; // Flag para modo de edição

    // --- Estados ---
    const [isSubmitted, setIsSubmitted] = useState(false); // Para tela de sucesso (apenas criação)
    const [isLoading, setIsLoading] = useState(false); // Loading geral (submit)
    const [cepLoading, setCepLoading] = useState(false);
    const [cepError, setCepError] = useState<string | null>(null);
    const [apiError, setApiError] = useState<string | null>(null); // Erro do submit (criação/edição)
    const [protocolo, setProtocolo] = useState(''); // Apenas para criação
    const [formData, setFormData] = useState<FormData>({
         nome_solicitante: '', telefone_solicitante: '', email_solicitante: '',
         cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
         tipo_demanda: '', descricao: '', prazo: '',
    });
    const [addressFieldsDisabled, setAddressFieldsDisabled] = useState(true);
    const [coordinates, setCoordinates] = useState<[number, number] | null>(null); // [latitude, longitude]
    const [geocodingLoading, setGeocodingLoading] = useState<boolean>(false);
    const [geocodingError, setGeocodingError] = useState<string | null>(null);

    // --- useEffect para Preencher/Limpar Formulário ---
    useEffect(() => {
        // Só executa se o modal estiver aberto
        if (open) {
            console.log(`[MODAL ${isEditing ? 'EDIT' : 'ADD'}] Modal aberto. Demanda inicial:`, demandaInicial);
            // Limpa erros e loadings ao abrir
            setIsLoading(false);
            setCepLoading(false);
            setGeocodingLoading(false);
            setApiError(null);
            setCepError(null);
            setGeocodingError(null);
            setIsSubmitted(false); // Garante que a tela de sucesso não apareça ao editar
            setProtocolo(''); // Limpa protocolo (relevante apenas na criação)

            if (isEditing && demandaInicial) {
                // Modo Edição: Preenche o formulário
                const cepFormatado = demandaInicial.cep?.replace(/^(\d{5})(\d{3})$/, '$1-$2') || '';
                let prazoFormatado = '';
                if (demandaInicial.prazo) {
                    try {
                        const data = new Date(demandaInicial.prazo);
                        // Garante que a data seja interpretada corretamente independente do fuso horário original
                        // Ajusta para o fuso horário local antes de formatar para YYYY-MM-DD
                        const dataLocal = new Date(data.getTime() + data.getTimezoneOffset() * 60000);
                        const ano = dataLocal.getFullYear();
                        const mes = (dataLocal.getMonth() + 1).toString().padStart(2, '0');
                        const dia = dataLocal.getDate().toString().padStart(2, '0');
                        prazoFormatado = `${ano}-${mes}-${dia}`;
                        console.log(`[MODAL EDIT] Data original: ${demandaInicial.prazo}, Data formatada: ${prazoFormatado}`);
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
                });

                // Se tinha coordenadas, busca novamente (ou poderia armazenar no estado da página e passar via prop)
                 if (demandaInicial.geom?.coordinates) {
                     // Inicia geocodificação baseada nos dados preenchidos
                     // O useEffect de geocodificação será acionado pelos campos preenchidos
                 } else {
                     setCoordinates(null);
                 }

                // Habilita campos se endereço veio preenchido (exceto se só CEP)
                setAddressFieldsDisabled(!(demandaInicial.logradouro || demandaInicial.bairro || demandaInicial.cidade || demandaInicial.uf));

            } else {
                 // Modo Adição ou reabertura sem demandaInicial: Limpa o formulário
                setFormData({
                    nome_solicitante: '', telefone_solicitante: '', email_solicitante: '',
                    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
                    tipo_demanda: '', descricao: '', prazo: '',
                });
                setAddressFieldsDisabled(true);
                setCoordinates(null);
            }
        }
    }, [open, isEditing, demandaInicial]); // Executa quando 'open' ou 'demandaInicial' mudam

    // handleChange (sem alterações)
    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
        const { name, value } = event.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Lógica para resetar campos de endereço/erros ao mudar CEP
        if (name === 'cep') {
            setCepError(null);
            setGeocodingError(null); // Limpa erro de geocodificação ao digitar novo CEP
            if (value.replace(/\D/g, '').length < 8) {
                setAddressFieldsDisabled(true);
                setFormData(prev => ({ ...prev, logradouro: '', bairro: '', cidade: '', uf: '' }));
                setCoordinates(null); // Limpa coordenadas se CEP incompleto
            }
        }
        // Limpa erro de geocodificação se campos de endereço relevantes forem alterados manualmente
        if (['logradouro', 'numero', 'cidade', 'uf'].includes(name)) {
             setGeocodingError(null);
        }
    };

    // handleCepBlur (sem alterações)
    const handleCepBlur = async (event: React.FocusEvent<HTMLInputElement>) => {
        const cep = event.target.value.replace(/\D/g, '');
        const formattedCep = cep.replace(/^(\d{5})(\d{3})$/, '$1-$2'); // Formata mesmo se incompleto para visualização
        setFormData(prev => ({ ...prev, cep: formattedCep })); // Atualiza com o CEP formatado
        setCoordinates(null); // Limpa coordenadas ao buscar novo CEP
        setGeocodingError(null); // Limpa erro de geocodificação

        if (cep.length === 8) {
            setCepLoading(true); setCepError(null); setAddressFieldsDisabled(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                if (!response.ok) throw new Error('Falha na requisição ao ViaCEP.');
                const data: CepResponse = await response.json();
                if (data.erro) throw new Error('CEP não encontrado.');
                setFormData(prev => ({
                    ...prev,
                    logradouro: data.logradouro,
                    bairro: data.bairro,
                    cidade: data.localidade,
                    uf: data.uf
                }));
                setAddressFieldsDisabled(false); // Habilita campos
            } catch (err) {
                console.error("Erro na busca do CEP:", err);
                setCepError(err instanceof Error ? err.message : 'Erro ao buscar CEP.');
                setAddressFieldsDisabled(false); // Permite edição manual mesmo com erro
                setFormData(prev => ({ ...prev, logradouro: '', bairro: '', cidade: '', uf: '' })); // Limpa campos
            } finally {
                setCepLoading(false);
            }
        } else if (cep.length > 0) {
            setCepError('CEP inválido. Deve conter 8 dígitos.');
            setAddressFieldsDisabled(true); // Desabilita se CEP inválido
            setFormData(prev => ({ ...prev, logradouro: '', bairro: '', cidade: '', uf: '' })); // Limpa campos
        } else {
             setCepError(null); // Limpa erro se campo CEP estiver vazio
             setAddressFieldsDisabled(true);
             setFormData(prev => ({ ...prev, logradouro: '', bairro: '', cidade: '', uf: '' }));
        }
    };

    // useEffect para Geocodificação (sem alterações)
     useEffect(() => {
         const attemptGeocode = async () => {
             const { logradouro, numero, cidade, uf, cep } = formData;
             const cepNumerico = cep.replace(/\D/g, '');

             // Só tenta geocodificar se tiver endereço completo e CEP válido (sem erro)
             if (cepNumerico.length === 8 && logradouro && numero && cidade && uf && !cepError) {
                 setGeocodingLoading(true);
                 setGeocodingError(null);
                 setCoordinates(null); // Limpa coordenadas anteriores
                 try {
                     const result = await geocodeAddressViaBackend(logradouro, numero, cidade, uf);
                     if (result) {
                         setCoordinates(result); // Guarda [latitude, longitude]
                     }
                     // Erro de "não encontrado" será tratado no catch
                 } catch (error) {
                     setGeocodingError(error instanceof Error ? error.message : 'Erro ao obter coordenadas.');
                     setCoordinates(null);
                 } finally {
                     setGeocodingLoading(false);
                 }
             } else {
                 // Se os dados não estão completos ou há erro no CEP, limpa coordenadas e erro (se não for erro de CEP)
                 setCoordinates(null);
                 if (!cepError) setGeocodingError(null); // Não sobrescreve o erro do CEP
                 setGeocodingLoading(false); // Garante que loading termine
             }
         };

         // Debounce para evitar chamadas excessivas enquanto digita
         const handler = setTimeout(() => {
             // Só chama se o modal estiver aberto (evita chamadas desnecessárias no fechamento)
             if(open) {
                attemptGeocode();
             }
         }, 800); // Atraso de 800ms após parar de digitar

         return () => { clearTimeout(handler); }; // Limpa o timeout se o componente desmontar ou deps mudarem

     }, [formData.cep, formData.numero, formData.logradouro, formData.cidade, formData.uf, cepError, open]); // Adiciona 'open' às dependências

    // *** ATUALIZAÇÃO: Função de Submit (handleRegister -> handleSubmit) ***
    const handleSubmit = async () => {
        console.log(`[FRONTEND MODAL] Tentando ${isEditing ? 'salvar edição' : 'registrar nova demanda'}...`);
        setIsLoading(true);
        setApiError(null); // Limpa erro anterior

        // Validações básicas (manter)
        if (!formData.nome_solicitante || formData.nome_solicitante.trim() === '') { setApiError('O campo Nome Completo é obrigatório.'); setIsLoading(false); return; }
        if (!formData.cep || !/^\d{5}-?\d{3}$/.test(formData.cep)) { setApiError('O campo CEP é obrigatório e deve estar no formato 00000-000.'); setIsLoading(false); return; }
        if (!formData.numero || formData.numero.trim() === '') { setApiError('O campo Número é obrigatório.'); setIsLoading(false); return; }
        if (!formData.tipo_demanda) { setApiError('O campo Tipo de Demanda é obrigatório.'); setIsLoading(false); return; }
        if (!formData.descricao || formData.descricao.trim() === '') { setApiError('O campo Descrição é obrigatório.'); setIsLoading(false); return; }
        // Adicione outras validações se necessário (ex: email, telefone)

        try {
            const apiUrl = isEditing ? `/api/demandas/${demandaInicial?.id}` : '/api/demandas';
            const method = isEditing ? 'PUT' : 'POST';

            console.log(`[FRONTEND MODAL] Enviando ${method} para ${apiUrl} com dados:`, formData);

            const response = await fetch(apiUrl, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData) // Envia todos os dados do formulário
            });

            const result = await response.json(); // Tenta parsear JSON mesmo em erro
             console.log(`[FRONTEND MODAL] Resposta da API (${method}):`, response.status, result);

            if (!response.ok) {
                // Se a API retornou erro, usa a mensagem dela
                throw new Error(result.message || result.error || `Erro ${response.status} ao ${isEditing ? 'atualizar' : 'registrar'} demanda.`);
            }

            // Sucesso!
            if (isEditing) {
                console.log("[FRONTEND MODAL] Edição salva com sucesso.");
                if (onSuccess) onSuccess(); // Chama o callback da página (que fecha o modal e recarrega)
            } else {
                 console.log("[FRONTEND MODAL] Nova demanda registrada com sucesso.");
                setProtocolo(result.protocolo); // Guarda o protocolo para exibir
                setIsSubmitted(true); // Mostra a tela de sucesso
            }

        } catch (err) {
            console.error(`[FRONTEND MODAL] Erro ao ${isEditing ? 'salvar' : 'registrar'} demanda:`, err);
            // Define o erro da API para ser exibido no modal
            setApiError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
        } finally {
            setIsLoading(false); // Termina o loading em qualquer caso (sucesso ou erro)
        }
    };

    // --- Renderização JSX ---
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" TransitionProps={{ onExited: () => { /* Pode limpar estados aqui se necessário após fechar */ } }}>
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
                    {/* *** ATUALIZAÇÃO: Título dinâmico *** */}
                    <DialogTitle>{isEditing ? `Editar Demanda #${demandaInicial?.id}` : 'Registrar Nova Demanda'}</DialogTitle>
                    <DialogContent>
                        {/* Mostra erros (API, CEP, Geocoding) */}
                        {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
                        {/* Mostra erro de geocodificação apenas se não houver erro de API ou CEP */}
                        {geocodingError && !apiError && !cepError && <Alert severity="warning" sx={{ mb: 2 }}>{geocodingError}</Alert>}
                        {/* Mostra erro de CEP apenas se não houver erro de API */}
                        {cepError && !apiError && <Alert severity="warning" sx={{ mb: 2 }}>{cepError}</Alert>}

                        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                            {/* --- Dados do Solicitante --- */}
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Dados do Solicitante</Typography>
                            <TextField label="Nome Completo *" name="nome_solicitante" variant="outlined" fullWidth required value={formData.nome_solicitante} onChange={handleChange} />
                            <TextField label="Telefone" name="telefone_solicitante" variant="outlined" fullWidth value={formData.telefone_solicitante} onChange={handleChange} />
                            <TextField label="Email" name="email_solicitante" type="email" variant="outlined" fullWidth value={formData.email_solicitante} onChange={handleChange} />

                            {/* --- Endereço --- */}
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>Endereço</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                <TextField
                                    label="CEP *"
                                    name="cep"
                                    variant="outlined"
                                    required
                                    value={formData.cep}
                                    onChange={handleChange}
                                    onBlur={handleCepBlur}
                                    inputProps={{ maxLength: 9 }}
                                    InputProps={{ endAdornment: cepLoading ? <CircularProgress size={20} /> : null }}
                                    error={!!cepError}
                                    sx={{ width: { xs: '100%', sm: 'calc(40% - 8px)' } }} // Ajusta largura responsiva
                                />
                                <TextField
                                    label="Logradouro"
                                    name="logradouro"
                                    variant="outlined"
                                    fullWidth
                                    value={formData.logradouro}
                                    onChange={handleChange}
                                    disabled={addressFieldsDisabled}
                                    InputLabelProps={{ shrink: !!formData.logradouro }} // Shrink se tiver valor
                                    sx={{ width: { xs: '100%', sm: 'calc(60% - 8px)' } }} // Ajusta largura responsiva
                                />
                                <TextField
                                    label="Número *"
                                    name="numero"
                                    variant="outlined"
                                    required
                                    value={formData.numero}
                                    onChange={handleChange}
                                    sx={{ width: { xs: 'calc(40% - 8px)', sm: 'calc(30% - 8px)' } }} // Ajusta largura
                                />
                                <TextField
                                    label="Complemento"
                                    name="complemento"
                                    variant="outlined"
                                    value={formData.complemento}
                                    onChange={handleChange}
                                    sx={{ width: { xs: 'calc(60% - 8px)', sm: 'calc(70% - 8px)' } }} // Ajusta largura
                                />
                                <TextField
                                    label="Bairro"
                                    name="bairro"
                                    variant="outlined"
                                    fullWidth
                                    value={formData.bairro}
                                    onChange={handleChange}
                                    disabled={addressFieldsDisabled}
                                    InputLabelProps={{ shrink: !!formData.bairro }}
                                    sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}
                                />
                                <TextField
                                    label="Cidade"
                                    name="cidade"
                                    variant="outlined"
                                    fullWidth
                                    value={formData.cidade}
                                    onChange={handleChange}
                                    disabled={addressFieldsDisabled}
                                    InputLabelProps={{ shrink: !!formData.cidade }}
                                    sx={{ width: { xs: 'calc(65% - 8px)', sm: 'calc(35% - 8px)' } }}
                                />
                                <TextField
                                    label="UF"
                                    name="uf"
                                    variant="outlined"
                                    fullWidth
                                    value={formData.uf}
                                    onChange={handleChange}
                                    disabled={addressFieldsDisabled}
                                    InputLabelProps={{ shrink: !!formData.uf }}
                                    inputProps={{ maxLength: 2, style: { textTransform: 'uppercase' } }} // Caixa alta
                                    sx={{ width: { xs: 'calc(35% - 8px)', sm: 'calc(15% - 8px)' } }}
                                />
                            </Box>

                            {/* Exibição das Coordenadas */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: '40px', px: 1, py: 0.5, backgroundColor: geocodingError ? '#fff0f0' : '#f0f0f0', borderRadius: 1, border: geocodingError ? '1px solid #d32f2f' : 'none' }}>
                                <MyLocationIcon fontSize="small" color={coordinates ? "primary" : (geocodingError ? "error" : "disabled")} />
                                <Typography variant="body2" color={geocodingError ? "error" : "text.secondary"} sx={{ flexGrow: 1 }}>
                                    {geocodingLoading ? 'Obtendo coordenadas...' :
                                     coordinates ? `Lat: ${coordinates[0].toFixed(6)}, Lon: ${coordinates[1].toFixed(6)}` :
                                     geocodingError ? `${geocodingError}` : // Mostra erro diretamente
                                     'Coordenadas geográficas (automático)'}
                                </Typography>
                                {geocodingLoading && <CircularProgress size={18} sx={{ mr: 1 }} />}
                            </Box>

                            {/* --- Detalhes da Demanda --- */}
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>Detalhes da Demanda</Typography>
                            <FormControl fullWidth required>
                                <InputLabel id="tipo-demanda-select-label">Tipo de Demanda *</InputLabel>
                                <Select
                                    labelId="tipo-demanda-select-label"
                                    label="Tipo de Demanda *"
                                    name="tipo_demanda"
                                    value={formData.tipo_demanda}
                                    onChange={handleChange}
                                >
                                    <MenuItem value="" disabled>Selecione...</MenuItem>
                                    {/* Adicione mais tipos conforme necessário */}
                                    <MenuItem value="Poda">Poda</MenuItem>
                                    <MenuItem value="Remoção de Árvore">Remoção de Árvore</MenuItem>
                                    <MenuItem value="Avaliação de Risco">Avaliação de Risco</MenuItem>
                                    <MenuItem value="Plantio de Muda">Plantio de Muda</MenuItem>
                                    <MenuItem value="Fiscalização">Fiscalização</MenuItem>
                                    <MenuItem value="Outro">Outro</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                label="Descrição *"
                                name="descricao"
                                variant="outlined"
                                fullWidth
                                multiline
                                rows={4}
                                required
                                value={formData.descricao}
                                onChange={handleChange}
                            />
                            <TextField
                                label="Prazo (Opcional)"
                                name="prazo"
                                type="date" // Input tipo data
                                variant="outlined"
                                fullWidth
                                value={formData.prazo} // Deve ser string YYYY-MM-DD
                                onChange={handleChange}
                                InputLabelProps={{ shrink: true }} // Garante que o label não sobreponha
                            />

                            {/* Anexos (ainda desabilitado) */}
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>Anexos (Opcional)</Typography>
                            <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} disabled>
                                Carregar Arquivos
                                <input type="file" hidden multiple />
                            </Button>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={onClose} disabled={isLoading}>Cancelar</Button>
                         {/* *** ATUALIZAÇÃO: Botão dinâmico *** */}
                        <Button onClick={handleSubmit} variant="contained" disabled={isLoading || cepLoading || geocodingLoading}>
                            {isLoading ? <CircularProgress size={24} color="inherit" /> : (isEditing ? 'Salvar Alterações' : 'Registrar Demanda')}
                        </Button>
                    </DialogActions>
                </>
            )}
        </Dialog>
    );
 }