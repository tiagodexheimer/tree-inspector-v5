'use client';

import React from "react";
import {
 Box, Button, Typography, Divider, 
 Dialog, DialogTitle, DialogContent, DialogActions, 
 TextField, FormControl, InputLabel, Select, MenuItem, List, ListItem, ListItemText
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import PreVisualizarFormularios from "./PreVisualizarFormularios";
import EditorFormularios from "./EditorFormularios";
import { FerramentasPainel } from "./FerramentasPainel";
import { useFormularioBuilder } from "@/hooks/useFormularioBuilder";

// Em um cenário real, isso viria da API de Tipos
const TIPOS_DEMANDA = ['Poda', 'Remoção de Árvore', 'Avaliação de Risco', 'Plantio de Muda', 'Fiscalização'];

export default function CriarFormularios() {
  const {
      formulario, // O Objeto completo
      isSaveOpen, isSuccessOpen,
      setNome, setTipoDemanda, setCampos, addField, moveFields, // Actions
      openSaveDialog, closeSaveDialog, confirmSave, resetAndClose
  } = useFormularioBuilder();

  const handleSaveClick = () => {
      try {
          confirmSave();
      } catch (e) {
          alert('Por favor, preencha o nome do formulário e o tipo de demanda.');
      }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
         <Typography variant="h5" fontWeight="bold">Criar Novo Formulário</Typography>
         <Button 
            variant="contained" 
            color="primary" 
            onClick={openSaveDialog} 
            disabled={formulario.campos.length === 0}
            sx={{ bgcolor: '#257e1a', '&:hover': { bgcolor: '#1a5912' } }}
         >
            Salvar Formulário
         </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'flex-start' }}>
        
        {/* 1. Painel de Ferramentas */}
        <FerramentasPainel onAddField={addField} />

        {/* 2. Editor de Propriedades (Atualiza automaticamente pois usa formulario.campos) */}
        <Box sx={{ flex: 1, minWidth: 300 }}>
           <EditorFormularios campos={formulario.campos} setCampos={setCampos} />
        </Box>

        {/* 3. Pré-visualização Mobile com Drag & Drop */}
        <Box sx={{ flex: 1, minWidth: 300 }}>
           <PreVisualizarFormularios 
                campos={formulario.campos} 
                onReorder={moveFields} // <--- Conecta a reordenação aqui
            />
        </Box>
      </Box>

      {/* --- Modais --- */}
      
      {/* Modal de Revisão */}
      <Dialog open={isSaveOpen} onClose={closeSaveDialog} fullWidth maxWidth="sm">
        <DialogTitle>Revisar e Salvar</DialogTitle>
        <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                <TextField 
                    label="Nome do Formulário" 
                    fullWidth required 
                    value={formulario.nome} 
                    onChange={(e) => setNome(e.target.value)} 
                />
                <FormControl fullWidth required>
                    <InputLabel>Tipo de Demanda</InputLabel>
                    <Select 
                        value={formulario.tipoDemanda} 
                        label="Tipo de Demanda" 
                        onChange={(e) => setTipoDemanda(e.target.value)}
                    >
                        {TIPOS_DEMANDA.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                </FormControl>
                
                <Divider textAlign="left"><Typography variant="caption">Campos ({formulario.campos.length})</Typography></Divider>
                
                {/* Lista simples para confirmação visual */}
                <List dense sx={{ maxHeight: 150, overflow: 'auto', bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    {formulario.campos.map((c, i) => (
                        <ListItem key={c.id} divider>
                            <ListItemText 
                                primary={`${i + 1}. ${c.label}`} 
                                secondary={c.type} 
                            />
                        </ListItem>
                    ))}
                </List>
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={closeSaveDialog} color="inherit">Voltar</Button>
            <Button onClick={handleSaveClick} variant="contained" color="primary">Confirmar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Sucesso */}
      <Dialog open={isSuccessOpen} onClose={resetAndClose}>
        <DialogTitle sx={{ textAlign: 'center', color: 'green', pt: 4 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 60, mb: 1 }} />
            <Typography variant="h6">Sucesso!</Typography>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
            <Typography>O formulário <strong>{formulario.nome}</strong> foi salvo com sucesso!</Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
            <Button onClick={resetAndClose} variant="outlined">Criar Novo</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}