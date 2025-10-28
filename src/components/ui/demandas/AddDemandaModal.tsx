// src/components/ui/demandas/AddDemandaModal.tsx
'use client';

import { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
    Select, MenuItem, InputLabel, FormControl, CircularProgress, Alert, SelectChangeEvent
} from "@mui/material";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface AddDemandaModalProps {
  open: boolean;
  onClose: () => void;
}

// Interface para os dados do formulário
interface FormData {
    nome_solicitante: string;
    telefone_solicitante: string;
    email_solicitante: string;
    endereco: string;
    tipo_demanda: string;
    descricao: string;
    prazo: string; // Adicionado prazo como string (formato YYYY-MM-DD)
}

export default function AddDemandaModal({ open, onClose }: AddDemandaModalProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [protocolo, setProtocolo] = useState('');
  // Estado inicial do formulário, incluindo prazo
  const [formData, setFormData] = useState<FormData>({
      nome_solicitante: '',
      telefone_solicitante: '',
      email_solicitante: '',
      endereco: '',
      tipo_demanda: '',
      descricao: '',
      prazo: '', // Inicializa prazo como string vazia
  });

  // Função para atualizar o estado do formulário (já deve funcionar para 'date')
  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
      const { name, value } = event.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async () => {
    // *** Logs de depuração ***
    console.log('[FRONTEND] Botão Registrar Clicado! Iniciando handleRegister...');
    console.log('[FRONTEND] Estado atual do formData:', formData); // Verifique se o prazo está aqui

    setIsLoading(true);
    setError(null);

    try {
        console.log('[FRONTEND] Tentando enviar fetch para /api/demandas...');
        const response = await fetch('/api/demandas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Envia o formData completo, incluindo o prazo
            body: JSON.stringify(formData),
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
        setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
    } finally {
        console.log('[FRONTEND] Finalizando handleRegister (finally).');
        setIsLoading(false);
    }
  };

  const handleCloseAndReset = () => {
    onClose();
    setTimeout(() => {
        setIsSubmitted(false);
        setProtocolo('');
        setError(null);
        setIsLoading(false);
        // Reseta o formulário, incluindo o prazo
        setFormData({
            nome_solicitante: '',
            telefone_solicitante: '',
            email_solicitante: '',
            endereco: '',
            tipo_demanda: '',
            descricao: '',
            prazo: '', // Reseta prazo
        });
    }, 300);
  };

  return (
    <Dialog open={open} onClose={handleCloseAndReset} fullWidth maxWidth="sm">
      {isSubmitted ? (
        <> {/* Tela de Sucesso */}
            <DialogTitle sx={{ textAlign: 'center', pt: 4 }}>Sucesso!</DialogTitle>
            <DialogContent sx={{ textAlign: 'center', p: 4 }}>
                <CheckCircleOutlineIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
                <Typography variant="h5" gutterBottom>Demanda Registrada com Sucesso!</Typography>
                <Typography variant="body1">O número do seu protocolo de atendimento é:</Typography>
                <Typography variant="h6" color="primary" sx={{ mt: 1, fontWeight: 'bold' }}>{protocolo}</Typography>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
                <Button onClick={handleCloseAndReset} variant="contained">Fechar</Button>
            </DialogActions>
        </>
      ) : (
        <> {/* Tela do Formulário */}
          <DialogTitle>Registrar Nova Demanda</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                {/* Dados do Solicitante */}
                <Typography variant="h6">Dados do Solicitante</Typography>
                <TextField label="Nome Completo" name="nome_solicitante" variant="outlined" fullWidth required value={formData.nome_solicitante} onChange={handleChange} />
                <TextField label="Telefone" name="telefone_solicitante" variant="outlined" fullWidth value={formData.telefone_solicitante} onChange={handleChange} />
                <TextField label="Email" name="email_solicitante" type="email" variant="outlined" fullWidth value={formData.email_solicitante} onChange={handleChange} />

                {/* Endereço */}
                <Typography variant="h6" sx={{ mt: 2 }}>Endereço</Typography>
                <TextField label="Endereço Completo" name="endereco" variant="outlined" fullWidth required helperText="📍 O endereço será usado para geolocalização." value={formData.endereco} onChange={handleChange} />

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
                    </Select>
                </FormControl>
                <TextField label="Descrição" name="descricao" variant="outlined" fullWidth multiline rows={4} required value={formData.descricao} onChange={handleChange} />

                {/* ****** NOVO CAMPO DE PRAZO ****** */}
                <TextField
                    label="Prazo (Opcional)"
                    name="prazo"
                    type="date" // Define o tipo como data
                    variant="outlined"
                    fullWidth
                    value={formData.prazo} // Valor do estado
                    onChange={handleChange} // Usa a mesma função
                    InputLabelProps={{
                        shrink: true, // Garante que o label não sobreponha a data
                    }}
                    // O valor será enviado como 'YYYY-MM-DD'
                />
                {/* ********************************* */}

                {/* Anexos */}
                <Typography variant="h6" sx={{ mt: 2 }}>Anexos (Opcional)</Typography>
                <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} disabled> Carregar Arquivos <input type="file" hidden multiple /> </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAndReset} disabled={isLoading}>Cancelar</Button>
            <Button onClick={handleRegister} variant="contained" disabled={isLoading}> {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Registrar'} </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}