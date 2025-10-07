'use client';

import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, Select, MenuItem, InputLabel, FormControl } from "@mui/material";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface AddDemandaModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddDemandaModal({ open, onClose }: AddDemandaModalProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [protocolo, setProtocolo] = useState('');

  const handleRegister = () => {
    // Aqui, no futuro, você adicionaria a lógica para enviar os dados do formulário.
    // Por enquanto, vamos apenas simular o sucesso.
    const novoProtocolo = `DEM-${Date.now()}`;
    setProtocolo(novoProtocolo);
    setIsSubmitted(true);
  };

  const handleCloseAndReset = () => {
    onClose();
    // Adiciona um pequeno atraso para que a transição de fechamento seja suave
    setTimeout(() => {
        setIsSubmitted(false);
        setProtocolo('');
    }, 300);
  };

  return (
    <Dialog open={open} onClose={handleCloseAndReset} fullWidth maxWidth="sm">
      {isSubmitted ? (
        // TELA DE SUCESSO
        <>
          <DialogTitle sx={{ textAlign: 'center', pt: 4 }}>Sucesso!</DialogTitle>
          <DialogContent sx={{ textAlign: 'center', p: 4 }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Demanda Registrada com Sucesso!
            </Typography>
            <Typography variant="body1">
              O número do seu protocolo de atendimento é:
            </Typography>
            <Typography variant="h6" color="primary" sx={{ mt: 1, fontWeight: 'bold' }}>
              {protocolo}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
            <Button onClick={handleCloseAndReset} variant="contained">Fechar</Button>
          </DialogActions>
        </>
      ) : (
        // TELA DO FORMULÁRIO
        <>
          <DialogTitle>Registrar Nova Demanda</DialogTitle>
          <DialogContent>
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>

              <Typography variant="h6">Dados do Solicitante</Typography>
              <TextField label="Nome Completo" name="nome" variant="outlined" fullWidth required />
              <TextField label="Telefone" name="telefone" variant="outlined" fullWidth />
              <TextField label="Email" name="email" type="email" variant="outlined" fullWidth />

              <Typography variant="h6" sx={{ mt: 2 }}>Endereço</Typography>
              <TextField 
                label="Endereço Completo" 
                name="endereco" 
                variant="outlined" 
                fullWidth 
                required 
                helperText="📍 A funcionalidade de autocompletar entrará aqui."
              />

              <Typography variant="h6" sx={{ mt: 2 }}>Detalhes da Demanda</Typography>
              <FormControl fullWidth required>
                <InputLabel>Tipo de Demanda</InputLabel>
                <Select label="Tipo de Demanda" name="tipoDemanda" defaultValue="">
                  <MenuItem value="poda">Poda</MenuItem>
                  <MenuItem value="remocao">Remoção de Árvore</MenuItem>
                  <MenuItem value="avaliacao">Avaliação de Risco</MenuItem>
                  <MenuItem value="plantio">Plantio de Muda</MenuItem>
                </Select>
              </FormControl>
              <TextField 
                label="Descrição" 
                name="descricao" 
                variant="outlined" 
                fullWidth 
                multiline 
                rows={4} 
                required 
              />

              <Typography variant="h6" sx={{ mt: 2 }}>Anexos</Typography>
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
              >
                Carregar Arquivos
                <input type="file" hidden multiple />
              </Button>

            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAndReset}>Cancelar</Button>
            <Button onClick={handleRegister} variant="contained">Registrar</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}