// src/components/ui/formularios/CriarFormularios.tsx
'use client';
import React, { useEffect, useState } from "react";
// ... (Imports UI mantidos)
import {
 Box, Button, Typography, Divider, 
 Dialog, DialogTitle, DialogContent, DialogActions, 
 TextField, FormControl, InputLabel, Select, MenuItem, List, ListItem, ListItemText, CircularProgress
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PreVisualizarFormularios from "./PreVisualizarFormularios";
import EditorFormularios from "./EditorFormularios";
import { FerramentasPainel } from "./FerramentasPainel";
import { useFormularioBuilder } from "@/hooks/useFormularioBuilder";

interface Props {
    formIdToEdit?: number | null; // [NOVO] Prop opcional
    onSuccess?: () => void; // Callback para quando salvar/fechar
}

export default function CriarFormularios({ formIdToEdit, onSuccess }: Props) {
  const {
      formulario, isSaveOpen, isSuccessOpen, isLoading, // [NOVO] isLoading
      setNome, setDescricao, setIdTipoDemanda, setCampos, addField, moveFields, 
      openSaveDialog, closeSaveDialog, confirmSave, resetAndClose,
      loadForm // [NOVO]
  } = useFormularioBuilder();

  const [tiposList, setTiposList] = useState<{id:number, nome:string}[]>([]);

  // Carrega Tipos de Demanda
  useEffect(() => {
      fetch('/api/demandas-tipos').then(res => res.json()).then(setTiposList).catch(console.error);
  }, []);

  // [NOVO] Carrega dados se estiver em modo de edição
  useEffect(() => {
      if (formIdToEdit) {
          loadForm(formIdToEdit);
      } else {
          // Se não tem ID, reseta para estado inicial (modo criação)
          // Isso é importante se o usuário alternar as abas rapidamente
          // resetAndClose(); // Cuidado: Isso fecha modais, talvez precise de um resetState puro
      }
  }, [formIdToEdit, loadForm]);

  // Handler ao fechar o modal de sucesso
  const handleFinish = () => {
      resetAndClose();
      if (onSuccess) onSuccess(); // Avisa o pai para mudar de aba ou recarregar lista
  };

  if (isLoading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
         <Typography variant="h5" fontWeight="bold">
            {formIdToEdit ? `Editar Formulário #${formIdToEdit}` : 'Criar Novo Formulário'}
         </Typography>
         <Button 
            variant="contained" color="primary" onClick={openSaveDialog} 
            disabled={formulario.campos.length === 0}
            sx={{ bgcolor: '#257e1a', '&:hover': { bgcolor: '#1a5912' } }}
         >
            {formIdToEdit ? 'Salvar Alterações' : 'Salvar Formulário'}
         </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'flex-start' }}>
        <FerramentasPainel onAddField={addField} />
        <Box sx={{ flex: 1, minWidth: 300 }}>
           <EditorFormularios campos={formulario.campos} setCampos={setCampos} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 300 }}>
           <PreVisualizarFormularios campos={formulario.campos} onReorder={moveFields} />
        </Box>
      </Box>

      {/* Modal de Revisão */}
      <Dialog open={isSaveOpen} onClose={closeSaveDialog} fullWidth maxWidth="sm">
        <DialogTitle>Revisar e Salvar</DialogTitle>
        <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                <TextField 
                    label="Nome do Formulário" fullWidth required 
                    value={formulario.nome} onChange={(e) => setNome(e.target.value)} 
                />
                 <TextField 
                    label="Descrição" fullWidth multiline rows={3}
                    value={formulario.descricao} onChange={(e) => setDescricao(e.target.value)} 
                />
                <FormControl fullWidth required>
                    <InputLabel>Tipo de Demanda Vinculada</InputLabel>
                    <Select 
                        value={formulario.idTipoDemanda} label="Tipo de Demanda Vinculada" 
                        onChange={(e) => setIdTipoDemanda(Number(e.target.value))}
                    >
                        {tiposList.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
                    </Select>
                </FormControl>
                {/* ... Lista de resumo mantida ... */}
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={closeSaveDialog} color="inherit">Voltar</Button>
            <Button onClick={confirmSave} variant="contained" color="primary">Confirmar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Sucesso */}
      <Dialog open={isSuccessOpen} onClose={handleFinish}>
         {/* ... Conteúdo do modal mantido ... */}
        <DialogTitle sx={{ textAlign: 'center', color: 'green' }}>Sucesso!</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
             <Typography>Formulário salvo com sucesso!</Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center' }}>
            <Button onClick={handleFinish} variant="outlined">Voltar para Lista</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}