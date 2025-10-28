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

 // Interface CepResponse (sem alterações)
 interface CepResponse {
     cep: string; logradouro: string; complemento: string; bairro: string;
     localidade: string; uf: string; ibge: string; gia: string; ddd: string; siafi: string;
     erro?: boolean;
 }

 // *** NOVA INTERFACE: Para a resposta da API do Google Geocoding ***
 interface GoogleGeocodeResult {
     results: {
         geometry: {
             location: {
                 lat: number;
                 lng: number;
             };
         };
         formatted_address: string; // Endereço formatado retornado pelo Google
         // Outros campos podem estar disponíveis, como address_components
     }[];
     status: 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';
     error_message?: string; // Mensagem de erro em caso de falha
 }
 // ***************************************************************

 interface AddDemandaModalProps { open: boolean; onClose: () => void; }

 interface FormData {
     nome_solicitante: string; telefone_solicitante: string; email_solicitante: string;
     cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string;
     tipo_demanda: string; descricao: string; prazo: string;
 }

 // *** ATUALIZADO: Geocodificação com Google Maps API ***
 async function geocodeAddressViaBackend(logradouro?: string | null, numero?: string | null, cidade?: string | null, uf?: string | null): Promise<[number, number] | null> {

     console.log(`[FRONTEND /geocode] Tentando geocodificar via backend: ${numero} ${logradouro}, ${cidade}, ${uf}`);

     // Não precisa mais da chave de API aqui
     // const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; // REMOVER

     if (!logradouro || !numero || !cidade || !uf) {
         console.log('[FRONTEND /geocode] Dados insuficientes para enviar ao backend.');
         return null;
     }

     try {
         // Chama o endpoint do seu backend
         const response = await fetch('/api/geocode', {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
             },
             body: JSON.stringify({ logradouro, numero, cidade, uf }), // Envia os dados no corpo
         });

         const data = await response.json();
         console.log('[FRONTEND /geocode] Resposta do backend:', response.status, data);

         if (!response.ok) {
             // Se o backend retornou erro, usa a mensagem dele
             throw new Error(data.message || `Erro ${response.status} ao chamar API interna.`);
         }

         if (data.coordinates) {
             // Backend retornou as coordenadas com sucesso
             const [lat, lon] = data.coordinates;
             console.log(`[FRONTEND /geocode] Coordenadas recebidas do backend: Lat=${lat}, Lon=${lon}`);
             return [lat, lon]; // Retorna [latitude, longitude]
         } else {
             // Backend retornou sucesso, mas sem coordenadas (ex: ZERO_RESULTS do Google)
             console.log('[FRONTEND /geocode] Backend não retornou coordenadas (endereço não encontrado?).');
             // Lança um erro específico para exibir no modal
             throw new Error(data.message || 'Endereço não localizado.');
             // Alternativamente, poderia retornar null e tratar no useEffect:
             // return null;
         }
     } catch (error) {
         console.error('[FRONTEND /geocode] Erro ao chamar backend:', error);
         // Garante que o erro lançado seja uma instância de Error
         if (error instanceof Error) {
            throw error;
         } else {
            throw new Error('Erro desconhecido ao chamar backend de geocodificação.');
         }
     }
 }
 // *******************************************************

 export default function AddDemandaModal({ open, onClose }: AddDemandaModalProps) {
    // ... todos os estados permanecem os mesmos ...
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [cepLoading, setCepLoading] = useState(false);
    const [cepError, setCepError] = useState<string | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);
    const [protocolo, setProtocolo] = useState('');
    const [formData, setFormData] = useState<FormData>({ /* ... estado inicial ... */
         nome_solicitante: '', telefone_solicitante: '', email_solicitante: '',
         cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
         tipo_demanda: '', descricao: '', prazo: '',
    });
    const [addressFieldsDisabled, setAddressFieldsDisabled] = useState(true);
    const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
    const [geocodingLoading, setGeocodingLoading] = useState<boolean>(false);
    const [geocodingError, setGeocodingError] = useState<string | null>(null);


    // useEffect de Limpeza (sem alterações)
     useEffect(() => { /* ... lógica de reset igual ... */
        if (!open) {
            setTimeout(() => { setIsSubmitted(false); setProtocolo(''); setApiError(null); setCepError(null); setIsLoading(false); setCepLoading(false); setAddressFieldsDisabled(true); setCoordinates(null); setGeocodingLoading(false); setGeocodingError(null); setFormData({ nome_solicitante: '', telefone_solicitante: '', email_solicitante: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', tipo_demanda: '', descricao: '', prazo: '', }); }, 300);
        } else { setIsSubmitted(false); setProtocolo(''); setApiError(null); setCepError(null); setIsLoading(false); setCepLoading(false); setAddressFieldsDisabled(true); setCoordinates(null); setGeocodingLoading(false); setGeocodingError(null); setFormData({ nome_solicitante: '', telefone_solicitante: '', email_solicitante: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', tipo_demanda: '', descricao: '', prazo: '', }); }
     }, [open]);

    // handleChange (sem alterações)
     const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => { /* ... lógica igual ... */
         const { name, value } = event.target;
         setFormData(prev => ({ ...prev, [name]: value }));
         if (name === 'cep') { setCepError(null); if (value.replace(/\D/g, '').length < 8) { setAddressFieldsDisabled(true); setFormData(prev => ({ ...prev, logradouro: '', bairro: '', cidade: '', uf: '' })); setCoordinates(null); setGeocodingError(null); } }
         if (['logradouro', 'numero', 'cidade', 'uf'].includes(name)) { setGeocodingError(null); }
     };

    // handleCepBlur (sem alterações)
     const handleCepBlur = async (event: React.FocusEvent<HTMLInputElement>) => { /* ... lógica de busca do CEP igual ... */
         const cep = event.target.value.replace(/\D/g, '');
         const formattedCep = cep.replace(/^(\d{5})(\d{3})$/, '$1-$2');
         setFormData(prev => ({ ...prev, cep: formattedCep }));
         if (cep.length === 8) {
             setCepLoading(true); setCepError(null); setAddressFieldsDisabled(true); setCoordinates(null); setGeocodingError(null);
             try { const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`); if (!response.ok) throw new Error('Erro ao buscar CEP.'); const data: CepResponse = await response.json(); if (data.erro) throw new Error('CEP não encontrado.'); setFormData(prev => ({ ...prev, logradouro: data.logradouro, bairro: data.bairro, cidade: data.localidade, uf: data.uf })); setAddressFieldsDisabled(false); } catch (err) { console.error("Erro na busca do CEP:", err); setCepError(err instanceof Error ? err.message : 'Erro ao buscar CEP.'); setAddressFieldsDisabled(false); setFormData(prev => ({ ...prev, logradouro: '', bairro: '', cidade: '', uf: '' })); } finally { setCepLoading(false); }
         } else if (cep.length > 0) { setCepError('CEP inválido. Deve conter 8 dígitos.'); setAddressFieldsDisabled(true); setFormData(prev => ({ ...prev, logradouro: '', bairro: '', cidade: '', uf: '' })); setCoordinates(null); setGeocodingError(null); }
     };

    // *** useEffect ATUALIZADO para chamar geocodeAddressViaBackend ***
    useEffect(() => {
        const attemptGeocode = async () => {
            const { logradouro, numero, cidade, uf, cep } = formData;
            const cepNumerico = cep.replace(/\D/g, '');

            if (cepNumerico.length === 8 && logradouro && numero && cidade && uf && !cepError) {
                setGeocodingLoading(true);
                setGeocodingError(null);
                setCoordinates(null);
                try {
                    // Chama a função que usa o backend
                    const result = await geocodeAddressViaBackend(logradouro, numero, cidade, uf);
                    if (result) {
                        setCoordinates(result); // [latitude, longitude]
                    }
                    // O erro de "não encontrado" agora é lançado pela função geocodeAddressViaBackend
                    // e será pego pelo catch abaixo
                } catch (error) {
                     // Captura erros de rede ou a mensagem de erro do backend (incluindo "não encontrado")
                    setGeocodingError(error instanceof Error ? error.message : 'Erro ao obter coordenadas.');
                    setCoordinates(null);
                } finally {
                    setGeocodingLoading(false);
                }
            } else {
                setCoordinates(null);
                if (!cepError) setGeocodingError(null);
                setGeocodingLoading(false);
            }
        };

        const handler = setTimeout(() => {
            attemptGeocode();
        }, 800);

        return () => { clearTimeout(handler); };

    }, [formData.cep, formData.numero, formData.logradouro, formData.cidade, formData.uf, cepError]);
    // *******************************************************

    // handleRegister (sem alterações)
    const handleRegister = async () => { /* ... lógica de registro igual ... */
        console.log('[FRONTEND] Botão Registrar Clicado! Iniciando handleRegister...');
        console.log('[FRONTEND] Estado atual do formData:', formData);
        setIsLoading(true); setApiError(null);
        if (!formData.numero || formData.numero.trim() === '') { setApiError('O campo Número é obrigatório.'); setIsLoading(false); return; }
        if (!formData.cep || !/^\d{5}-\d{3}$/.test(formData.cep)) { setApiError('O campo CEP é obrigatório e deve estar no formato 00000-000.'); setIsLoading(false); return; }
        try {
            const response = await fetch('/api/demandas', { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(formData) });
            const result = await response.json();
            if (!response.ok) { throw new Error(result.message || `Erro ${response.status}`); }
            setProtocolo(result.protocolo); setIsSubmitted(true);
        } catch (err) { console.error("[FRONTEND] Erro DENTRO do fetch/processamento:", err); setApiError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
        } finally { setIsLoading(false); }
    };

    // Renderização do JSX (sem alterações)
    return (
     <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
       {isSubmitted ? ( /* Tela de Sucesso */
         <>
             <DialogTitle sx={{ textAlign: 'center', pt: 4 }}>Sucesso!</DialogTitle>
              {/* ... conteúdo sucesso ... */}
              <DialogContent sx={{ textAlign: 'center', p: 4 }}> <CheckCircleOutlineIcon color="success" sx={{ fontSize: 80, mb: 2 }} /> <Typography variant="h5" gutterBottom>Demanda Registrada com Sucesso!</Typography> <Typography variant="body1">O número do seu protocolo de atendimento é:</Typography> <Typography variant="h6" color="primary" sx={{ mt: 1, fontWeight: 'bold' }}>{protocolo}</Typography> </DialogContent>
             <DialogActions sx={{ justifyContent: 'center', pb: 3 }}><Button onClick={onClose} variant="contained">Fechar</Button></DialogActions>
         </>
       ) : ( /* Tela do Formulário */
         <>
           <DialogTitle>Registrar Nova Demanda</DialogTitle>
           <DialogContent>
             {/* Mostra erros da API (incluindo chave) ou CEP ou Geocoding */}
             {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
             {geocodingError && !apiError && !cepError && <Alert severity="warning" sx={{ mb: 2 }}>{geocodingError}</Alert>}
             {cepError && !apiError && <Alert severity="warning" sx={{ mb: 2 }}>{cepError}</Alert>}


             <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                 {/* Dados do Solicitante */}
                 <Typography variant="h6">Dados do Solicitante</Typography>
                  {/* ... TextFields Solicitante ... */}
                 <TextField label="Nome Completo" name="nome_solicitante" variant="outlined" fullWidth required value={formData.nome_solicitante} onChange={handleChange} />
                 <TextField label="Telefone" name="telefone_solicitante" variant="outlined" fullWidth value={formData.telefone_solicitante} onChange={handleChange} />
                 <TextField label="Email" name="email_solicitante" type="email" variant="outlined" fullWidth value={formData.email_solicitante} onChange={handleChange} />


                 {/* Endereço */}
                 <Typography variant="h6" sx={{ mt: 2 }}>Endereço</Typography>
                 <div className="flex flex-wrap -mx-2">
                     {/* ... TextFields Endereço ... */}
                     <div className="w-full sm:w-1/3 px-2 mb-4"> <TextField label="CEP" name="cep" variant="outlined" fullWidth required value={formData.cep} onChange={handleChange} onBlur={handleCepBlur} inputProps={{ maxLength: 9 }} InputProps={{ endAdornment: cepLoading ? <CircularProgress size={20} /> : null, }} error={!!cepError} /> </div>
                     <div className="w-full sm:w-2/3 px-2 mb-4"> <TextField label="Logradouro" name="logradouro" variant="outlined" fullWidth value={formData.logradouro} onChange={handleChange} disabled={addressFieldsDisabled} InputLabelProps={{ shrink: formData.logradouro ? true : undefined }} /> </div>
                     <div className="w-1/2 sm:w-1/3 px-2 mb-4"> <TextField label="Número" name="numero" variant="outlined" fullWidth required value={formData.numero} onChange={handleChange} /> </div>
                     <div className="w-1/2 sm:w-2/3 px-2 mb-4"> <TextField label="Complemento" name="complemento" variant="outlined" fullWidth value={formData.complemento} onChange={handleChange} /> </div>
                     <div className="w-full sm:w-1/2 px-2 mb-4"> <TextField label="Bairro" name="bairro" variant="outlined" fullWidth value={formData.bairro} onChange={handleChange} disabled={addressFieldsDisabled} InputLabelProps={{ shrink: formData.bairro ? true : undefined }} /> </div>
                     <div className="w-2/3 sm:w-1/3 px-2 mb-4"> <TextField label="Cidade" name="cidade" variant="outlined" fullWidth value={formData.cidade} onChange={handleChange} disabled={addressFieldsDisabled} InputLabelProps={{ shrink: formData.cidade ? true : undefined }} /> </div>
                     <div className="w-1/3 sm:w-1/6 px-2 mb-4"> <TextField label="UF" name="uf" variant="outlined" fullWidth value={formData.uf} onChange={handleChange} disabled={addressFieldsDisabled} InputLabelProps={{ shrink: formData.uf ? true : undefined }} inputProps={{ maxLength: 2 }} /> </div>
                 </div>

                 {/* Exibição das Coordenadas (igual) */}
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: '40px', px: 2, mb: 1, backgroundColor: '#f0f0f0', borderRadius: 1 }}>
                    <MyLocationIcon fontSize="small" color={coordinates ? "primary" : "disabled"} />
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                        {geocodingLoading ? 'Obtendo coordenadas...' :
                         coordinates ? `Lat: ${coordinates[0].toFixed(6)}, Lon: ${coordinates[1].toFixed(6)}` :
                         geocodingError ? `Erro: ${geocodingError}` :
                         'Coordenadas geográficas aparecerão aqui.'}
                    </Typography>
                     {geocodingLoading && <CircularProgress size={20} />}
                 </Box>

                 {/* Detalhes da Demanda */}
                 <Typography variant="h6" sx={{ mt: 2 }}>Detalhes da Demanda</Typography>
                 {/* ... Select, TextFields Demanda ... */}
                 <FormControl fullWidth required> <InputLabel id="tipo-demanda-select-label">Tipo de Demanda</InputLabel> <Select labelId="tipo-demanda-select-label" label="Tipo de Demanda" name="tipo_demanda" value={formData.tipo_demanda} onChange={handleChange}> <MenuItem value="" disabled>Selecione...</MenuItem> <MenuItem value="poda">Poda</MenuItem> <MenuItem value="remocao">Remoção de Árvore</MenuItem> <MenuItem value="avaliacao">Avaliação de Risco</MenuItem> <MenuItem value="plantio">Plantio de Muda</MenuItem> </Select> </FormControl>
                 <TextField label="Descrição" name="descricao" variant="outlined" fullWidth multiline rows={4} required value={formData.descricao} onChange={handleChange} />
                 <TextField label="Prazo (Opcional)" name="prazo" type="date" variant="outlined" fullWidth value={formData.prazo} onChange={handleChange} InputLabelProps={{ shrink: true }}/>

                 {/* Anexos */}
                 <Typography variant="h6" sx={{ mt: 2 }}>Anexos (Opcional)</Typography>
                 <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} disabled> Carregar Arquivos <input type="file" hidden multiple /> </Button>
             </Box>
           </DialogContent>
           <DialogActions> <Button onClick={onClose} disabled={isLoading}>Cancelar</Button> <Button onClick={handleRegister} variant="contained" disabled={isLoading || cepLoading || geocodingLoading}> {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Registrar'} </Button> </DialogActions>
         </>
       )}
     </Dialog>
   );
 }