// src/components/ui/demandas/AddDemandaModal.tsx
'use client';

import { useState, useEffect } from 'react';
// Importações do Material UI - REMOVA 'Grid' daqui
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
    Select, MenuItem, InputLabel, FormControl, CircularProgress, Alert, SelectChangeEvent
} from "@mui/material";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// Interface para a resposta da API ViaCEP (ou similar)
interface CepResponse {
    cep: string;
    logradouro: string;
    complemento: string; // Pode vir ou não
    bairro: string;
    localidade: string; // Cidade
    uf: string; // Estado (UF)
    ibge: string;
    gia: string;
    ddd: string;
    siafi: string;
    erro?: boolean; // Indica erro na busca
}


interface AddDemandaModalProps {
  open: boolean;
  onClose: () => void;
}

// Interface para os dados do formulário atualizada
interface FormData {
    nome_solicitante: string;
    telefone_solicitante: string;
    email_solicitante: string;
    // --- Novos campos de endereço ---
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    // -----------------------------
    tipo_demanda: string;
    descricao: string;
    prazo: string;
}

export default function AddDemandaModal({ open, onClose }: AddDemandaModalProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false); // Loading específico para CEP
  const [cepError, setCepError] = useState<string | null>(null); // Erro específico do CEP
  const [apiError, setApiError] = useState<string | null>(null); // Erro geral da API
  const [protocolo, setProtocolo] = useState('');
  const [formData, setFormData] = useState<FormData>({
      nome_solicitante: '',
      telefone_solicitante: '',
      email_solicitante: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      tipo_demanda: '',
      descricao: '',
      prazo: '',
  });
  // Estado para controlar se os campos de endereço (exceto CEP e número) estão desabilitados
  const [addressFieldsDisabled, setAddressFieldsDisabled] = useState(true);

  // Limpa o formulário e erros ao abrir/fechar
  useEffect(() => {
    if (!open) {
        // Reset state on close after transition
        setTimeout(() => {
            setIsSubmitted(false);
            setProtocolo('');
            setApiError(null);
            setCepError(null);
            setIsLoading(false);
            setCepLoading(false);
            setAddressFieldsDisabled(true);
            setFormData({
                nome_solicitante: '', telefone_solicitante: '', email_solicitante: '',
                cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
                tipo_demanda: '', descricao: '', prazo: '',
            });
        }, 300);
    } else {
        // Reset immediate states on open
         setIsSubmitted(false);
         setProtocolo('');
         setApiError(null);
         setCepError(null);
         setIsLoading(false);
         setCepLoading(false);
         setAddressFieldsDisabled(true); // Começa desabilitado
         setFormData({ // Reseta o formulário ao abrir
                nome_solicitante: '', telefone_solicitante: '', email_solicitante: '',
                cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
                tipo_demanda: '', descricao: '', prazo: '',
         });
    }
  }, [open]);

  // Função para atualizar o estado do formulário
  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
      const { name, value } = event.target;
      setFormData(prev => ({ ...prev, [name]: value }));

      // Limpa erro do CEP se o CEP for modificado
      if (name === 'cep') {
          setCepError(null);
          // Se o CEP for apagado, desabilita e limpa os campos novamente
          if (value.replace(/\D/g, '').length < 8) {
              setAddressFieldsDisabled(true);
              setFormData(prev => ({
                  ...prev,
                  logradouro: '',
                  bairro: '',
                  cidade: '',
                  uf: '',
              }));
          }
      }
  };

  // --- Função para buscar CEP ---
  const handleCepBlur = async (event: React.FocusEvent<HTMLInputElement>) => {
      const cep = event.target.value.replace(/\D/g, ''); // Remove não-dígitos
      // Formata o CEP para exibição (opcional, mas melhora UX)
      const formattedCep = cep.replace(/^(\d{5})(\d{3})$/, '$1-$2');
      setFormData(prev => ({ ...prev, cep: formattedCep })); // Atualiza com CEP formatado

      if (cep.length === 8) {
          setCepLoading(true);
          setCepError(null);
          setAddressFieldsDisabled(true); // Mantém desabilitado durante a busca
          try {
              const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
              if (!response.ok) {
                  throw new Error('Erro ao buscar CEP. Verifique a conexão.');
              }
              const data: CepResponse = await response.json();

              if (data.erro) {
                  throw new Error('CEP não encontrado.');
              }

              // Preenche os campos com os dados recebidos
              setFormData(prev => ({
                  ...prev,
                  logradouro: data.logradouro,
                  bairro: data.bairro,
                  cidade: data.localidade,
                  uf: data.uf,
                  // Opcional: Limpar complemento se a API retornar um?
                  // complemento: data.complemento || prev.complemento,
              }));
              setAddressFieldsDisabled(false); // Habilita campos após sucesso

          } catch (err) {
              console.error("Erro na busca do CEP:", err);
              setCepError(err instanceof Error ? err.message : 'Erro ao buscar CEP.');
              setAddressFieldsDisabled(false); // Habilita campos mesmo em erro para edição manual
              // Limpa campos que deveriam ter sido preenchidos
              setFormData(prev => ({
                  ...prev,
                  logradouro: '',
                  bairro: '',
                  cidade: '',
                  uf: '',
              }));
          } finally {
              setCepLoading(false);
          }
      } else if (cep.length > 0) {
          setCepError('CEP inválido. Deve conter 8 dígitos.');
          setAddressFieldsDisabled(true); // Mantém desabilitado se inválido
           // Limpa campos
           setFormData(prev => ({
                  ...prev,
                  logradouro: '',
                  bairro: '',
                  cidade: '',
                  uf: '',
            }));
      }
  };


  // --- Função de Registro (Atualizada) ---
  const handleRegister = async () => {
    console.log('[FRONTEND] Botão Registrar Clicado! Iniciando handleRegister...');
    console.log('[FRONTEND] Estado atual do formData:', formData);

    setIsLoading(true);
    setApiError(null);

    // Validação extra no frontend (ex: número)
    if (!formData.numero || formData.numero.trim() === '') {
        setApiError('O campo Número é obrigatório.');
        setIsLoading(false);
        return;
    }
     // Validação do CEP formatado
    if (!formData.cep || !/^\d{5}-\d{3}$/.test(formData.cep)) {
        setApiError('O campo CEP é obrigatório e deve estar no formato 00000-000.');
        setIsLoading(false);
        return;
    }


    try {
        console.log('[FRONTEND] Tentando enviar fetch para /api/demandas...');
        const response = await fetch('/api/demandas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData), // Envia o formData atualizado
        });

        console.log('[FRONTEND] Resposta recebida do fetch. Status:', response.status);
        const result = await response.json();
        console.log('[FRONTEND] Resultado do response.json():', result);

        if (!response.ok) {
            console.error('[FRONTEND] Resposta não OK:', response.status, result);
            throw new Error(result.message || `Erro ${response.status}`);
        }

        console.log('[FRONTEND] Sucesso! Protocolo:', result.protocolo);
        setProtocolo(result.protocolo);
        setIsSubmitted(true);

    } catch (err) {
        console.error("[FRONTEND] Erro DENTRO do fetch/processamento:", err);
        setApiError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
    } finally {
        console.log('[FRONTEND] Finalizando handleRegister (finally).');
        setIsLoading(false);
    }
  };

  // handleCloseAndReset já foi atualizado no useEffect para limpar tudo

  return (
    // O Dialog principal permanece o mesmo
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      {isSubmitted ? (
        <> {/* Tela de Sucesso */}
             <DialogTitle sx={{ textAlign: 'center', pt: 4 }}>Sucesso!</DialogTitle>
             <DialogContent sx={{ textAlign: 'center', p: 4 }}>
                <CheckCircleOutlineIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
                <Typography variant="h5" gutterBottom>Demanda Registrada com Sucesso!</Typography>
                <Typography variant="body1">O número do seu protocolo de atendimento é:</Typography>
                <Typography variant="h6" color="primary" sx={{ mt: 1, fontWeight: 'bold' }}>{protocolo}</Typography>
            </DialogContent>
             <DialogActions sx={{ justifyContent: 'center', pb: 3 }}><Button onClick={onClose} variant="contained">Fechar</Button></DialogActions>
        </>
      ) : (
        <> {/* Tela do Formulário */}
          <DialogTitle>Registrar Nova Demanda</DialogTitle>
          <DialogContent>
            {/* Exibe erros gerais da API ou do CEP */}
            {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
            {cepError && !apiError && <Alert severity="warning" sx={{ mb: 2 }}>{cepError}</Alert>}

            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                {/* Dados do Solicitante */}
                <Typography variant="h6">Dados do Solicitante</Typography>
                <TextField label="Nome Completo" name="nome_solicitante" variant="outlined" fullWidth required value={formData.nome_solicitante} onChange={handleChange} />
                <TextField label="Telefone" name="telefone_solicitante" variant="outlined" fullWidth value={formData.telefone_solicitante} onChange={handleChange} />
                <TextField label="Email" name="email_solicitante" type="email" variant="outlined" fullWidth value={formData.email_solicitante} onChange={handleChange} />

                {/* Endereço Estruturado com Flexbox (Tailwind) */}
                <Typography variant="h6" sx={{ mt: 2 }}>Endereço</Typography>
                {/* Container Flex com margem negativa para compensar padding */}
                <div className="flex flex-wrap -mx-2">

                    {/* Item Flex com padding e margem inferior */}
                    <div className="w-full sm:w-1/3 px-2 mb-4">
                        <TextField
                            label="CEP" name="cep" variant="outlined" fullWidth required
                            value={formData.cep}
                            onChange={handleChange}
                            onBlur={handleCepBlur} // Chama a busca ao perder o foco
                            inputProps={{ maxLength: 9 }} // Limita input (formato 00000-000)
                            InputProps={{
                                endAdornment: cepLoading ? <CircularProgress size={20} /> : null, // Mostra loading
                            }}
                            error={!!cepError} // Destaca campo se houver erro no CEP
                        />
                    </div>

                    {/* Logradouro */}
                    <div className="w-full sm:w-2/3 px-2 mb-4">
                        <TextField
                            label="Logradouro" name="logradouro" variant="outlined" fullWidth
                            value={formData.logradouro} onChange={handleChange}
                            disabled={addressFieldsDisabled} // Desabilitado inicialmente
                            InputLabelProps={{ shrink: formData.logradouro ? true : undefined }}
                        />
                    </div>

                     {/* Número */}
                    <div className="w-1/2 sm:w-1/3 px-2 mb-4">
                        <TextField
                            label="Número" name="numero" variant="outlined" fullWidth required
                            value={formData.numero} onChange={handleChange}
                        />
                    </div>

                     {/* Complemento */}
                    <div className="w-1/2 sm:w-2/3 px-2 mb-4">
                        <TextField
                            label="Complemento" name="complemento" variant="outlined" fullWidth
                            value={formData.complemento} onChange={handleChange}
                        />
                    </div>

                     {/* Bairro */}
                    <div className="w-full sm:w-1/2 px-2 mb-4">
                        <TextField
                            label="Bairro" name="bairro" variant="outlined" fullWidth
                            value={formData.bairro} onChange={handleChange}
                            disabled={addressFieldsDisabled}
                            InputLabelProps={{ shrink: formData.bairro ? true : undefined }}
                        />
                    </div>

                     {/* Cidade */}
                    <div className="w-2/3 sm:w-1/3 px-2 mb-4">
                        <TextField
                            label="Cidade" name="cidade" variant="outlined" fullWidth
                            value={formData.cidade} onChange={handleChange}
                            disabled={addressFieldsDisabled}
                            InputLabelProps={{ shrink: formData.cidade ? true : undefined }}
                        />
                    </div>

                     {/* UF */}
                    <div className="w-1/3 sm:w-1/6 px-2 mb-4">
                        <TextField
                            label="UF" name="uf" variant="outlined" fullWidth
                            value={formData.uf} onChange={handleChange}
                            disabled={addressFieldsDisabled}
                            InputLabelProps={{ shrink: formData.uf ? true : undefined }}
                             inputProps={{ maxLength: 2 }} // Limita a 2 caracteres
                        />
                    </div>
                </div> {/* Fim do container Flex */}


                {/* Detalhes da Demanda */}
                <Typography variant="h6" sx={{ mt: 2 }}>Detalhes da Demanda</Typography>
                <FormControl fullWidth required>
                    <InputLabel id="tipo-demanda-select-label">Tipo de Demanda</InputLabel>
                    <Select labelId="tipo-demanda-select-label" label="Tipo de Demanda" name="tipo_demanda" value={formData.tipo_demanda} onChange={handleChange}>
                        <MenuItem value="" disabled>Selecione...</MenuItem>
                        <MenuItem value="poda">Poda</MenuItem>
                        <MenuItem value="remocao">Remoção de Árvore</MenuItem>
                        <MenuItem value="avaliacao">Avaliação de Risco</MenuItem>
                        <MenuItem value="plantio">Plantio de Muda</MenuItem>
                        {/* Adicione outros tipos conforme necessário */}
                    </Select>
                </FormControl>
                <TextField label="Descrição" name="descricao" variant="outlined" fullWidth multiline rows={4} required value={formData.descricao} onChange={handleChange} />
                <TextField label="Prazo (Opcional)" name="prazo" type="date" variant="outlined" fullWidth value={formData.prazo} onChange={handleChange} InputLabelProps={{ shrink: true }}/>

                {/* Anexos */}
                <Typography variant="h6" sx={{ mt: 2 }}>Anexos (Opcional)</Typography>
                <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} disabled> Carregar Arquivos <input type="file" hidden multiple /> </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={isLoading}>Cancelar</Button> {/* Usar onClose diretamente aqui */}
            <Button onClick={handleRegister} variant="contained" disabled={isLoading || cepLoading}> {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Registrar'} </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}