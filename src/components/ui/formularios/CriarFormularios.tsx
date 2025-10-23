// src/components/ui/formularios/CriarFormularios.tsx
import {
  CheckBox, RadioButtonChecked, ShortText, Subject, // Ícones para os campos
  ToggleOn, ArrowDropDownCircle, CheckCircleOutline as CheckCircleOutlineIcon
} from "@mui/icons-material";
import {
  Box, Card, Input, Typography, Button, TextField, TextareaAutosize as MuiTextareaAutosize,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Radio, Switch as MuiSwitch,
  List, ListItem, ListItemText, Divider, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent
} from "@mui/material";
import React from "react";
import PreVisualizarFormularios from "./PreVisualizarFormularios";
import EditorFormularios from "./EditorFormularios";

// --- Interfaces CampoOpcao, CampoTipo, CampoDef (como definidas acima) ---
export interface CampoOpcao { id: string; value: string; label: string; }
export type CampoTipo = 'text' | 'textarea' | 'checkbox' | 'select' | 'radio' | 'switch';
export interface CampoDef {
  id: string; type: CampoTipo; name: string; label: string;
  placeholder?: string; options?: CampoOpcao[]; defaultValue?: string | boolean; rows?: number;
}
// -----------------------------------------------------------------------


const tiposDeDemanda = ['Poda', 'Remoção de Árvore', 'Avaliação de Risco', 'Plantio de Muda', 'Fiscalização'];

export default function CriarFormularios() {
  const [campos, setCampos] = React.useState<CampoDef[]>([]);
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [formName, setFormName] = React.useState('');
  const [selectedDemandType, setSelectedDemandType] = React.useState('');
  const [showSuccessDialog, setShowSuccessDialog] = React.useState(false);
  const [savedFormName, setSavedFormName] = React.useState('');

  const handleInserirCampos = (tipo: CampoTipo) => {
    const novoId = `campo_${Date.now()}`;
    let novoCampoBase = { id: novoId, name: novoId }; // Base comum

    let novoCampo: CampoDef;

    switch (tipo) {
      case 'text':
        novoCampo = { ...novoCampoBase, type: 'text', label: 'Novo Texto', placeholder: 'Digite aqui...' };
        break;
      case 'textarea':
        novoCampo = { ...novoCampoBase, type: 'textarea', label: 'Nova Área de Texto', placeholder: 'Escreva mais...', rows: 3 };
        break;
      case 'checkbox':
        novoCampo = { ...novoCampoBase, type: 'checkbox', label: 'Nova Caixa' };
        break;
      case 'select':
        novoCampo = { ...novoCampoBase, type: 'select', label: 'Nova Seleção', options: [{ id: `opt_${Date.now()}`, value: 'opcao1', label: 'Opção 1' }] };
        break;
      case 'radio':
        novoCampo = { ...novoCampoBase, type: 'radio', label: 'Novo Grupo de Opções', options: [{ id: `opt_${Date.now()}`, value: 'opcaoA', label: 'Opção A' }] };
        break;
      case 'switch':
        novoCampo = { ...novoCampoBase, type: 'switch', label: 'Novo Interruptor', defaultValue: false };
        break;
      default:
        // Caso inesperado, talvez logar um erro
        return;
    }

    setCampos((prevCampos) => [...prevCampos, novoCampo]);
  }

  const handleOpenSaveDialog = () => setShowSaveDialog(true);
  const handleCloseSaveDialog = () => setShowSaveDialog(false);

  const handleSaveForm = () => {
    if (!formName.trim() || !selectedDemandType) {
      alert('Por favor, preencha o nome do formulário e selecione o tipo de demanda.');
      return;
    }
    const formDataToSave = { nome: formName, tipoDemanda: selectedDemandType, campos: campos };
    console.log("Salvando formulário:", formDataToSave);
    setSavedFormName(formName);
    setShowSaveDialog(false);
    setShowSuccessDialog(true);
  };

  const handleCloseSuccessDialog = () => {
    setShowSuccessDialog(false);
    setCampos([]); setFormName(''); setSelectedDemandType(''); setSavedFormName('');
  };

  return (
    <div>
      <Typography variant="h5" gutterBottom>Criar Formulário</Typography>

      {/* Interface Principal de Criação */}
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, justifyContent: 'center', alignItems: 'flex-start', mb: 4, borderTop: '1px solid #ccc', pt: 2 }}>

        {/* Painel de Ferramentas */}
        <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1, minWidth: 200, maxWidth: 220 }}>
          <Typography variant="h6" gutterBottom align="center">Campos</Typography>
          <Divider sx={{ mb: 2 }} />
          {/* Card Texto */}
          <Card variant="outlined" onClick={() => handleInserirCampos("text")} className="p-2 m-2 cursor-pointer flex items-center gap-2 hover:bg-gray-100">
            <ShortText /> <Typography variant="body2">Texto Curto</Typography>
          </Card>
          {/* Card Área de Texto */}
          <Card variant="outlined" onClick={() => handleInserirCampos("textarea")} className="p-2 m-2 cursor-pointer flex items-center gap-2 hover:bg-gray-100">
            <Subject /> <Typography variant="body2">Texto Longo</Typography>
          </Card>
          {/* Card Caixa de Seleção */}
          <Card variant="outlined" onClick={() => handleInserirCampos("checkbox")} className="p-2 m-2 cursor-pointer flex items-center gap-2 hover:bg-gray-100">
            <CheckBox /> <Typography variant="body2">Caixa Única</Typography>
          </Card>
          {/* Card Seleção Suspensa */}
          <Card variant="outlined" onClick={() => handleInserirCampos("select")} className="p-2 m-2 cursor-pointer flex items-center gap-2 hover:bg-gray-100">
            <ArrowDropDownCircle /> <Typography variant="body2">Seleção</Typography>
          </Card>
          {/* Card Opção Única (Radio) */}
          <Card variant="outlined" onClick={() => handleInserirCampos("radio")} className="p-2 m-2 cursor-pointer flex items-center gap-2 hover:bg-gray-100">
            <RadioButtonChecked /> <Typography variant="body2">Opção Única</Typography>
          </Card>
           {/* Card Interruptor (Switch) */}
          <Card variant="outlined" onClick={() => handleInserirCampos("switch")} className="p-2 m-2 cursor-pointer flex items-center gap-2 hover:bg-gray-100">
            <ToggleOn /> <Typography variant="body2">Interruptor</Typography>
          </Card>
        </Box>

        {/* Separador Vertical */}
        <Divider orientation="vertical" flexItem />

        {/* Editor */}
        <Box sx={{ flexShrink: 0 }}> {/* Impede que o editor encolha demais */}
          <EditorFormularios campos={campos} setCampos={setCampos} />
        </Box>

        {/* Separador Vertical */}
        <Divider orientation="vertical" flexItem />

        {/* PreVisualização */}
        <Box sx={{ flexShrink: 0 }}> {/* Impede que a preview encolha demais */}
          <PreVisualizarFormularios campos={campos} />
        </Box>
      </Box>

      {/* Botão Salvar */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Button variant="contained" color="primary" onClick={handleOpenSaveDialog} disabled={campos.length === 0}
          sx={{ backgroundColor: '#257e1a', '&:hover': { backgroundColor: '#1a5912' }, '&.Mui-disabled': { backgroundColor: '#a5d6a7' } }} >
          Salvar Formulário
        </Button>
      </Box>

      {/* Diálogo Salvar */}
      <Dialog open={showSaveDialog} onClose={handleCloseSaveDialog} fullWidth maxWidth="sm">
        {/* ... (conteúdo do diálogo permanece o mesmo) ... */}
         <DialogTitle>Revisar e Salvar Formulário</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField label="Nome do Formulário" variant="outlined" fullWidth required value={formName} onChange={(e) => setFormName(e.target.value)} />
                        <FormControl fullWidth required>
                            <InputLabel id="tipo-demanda-label">Tipo de Demanda Associada</InputLabel>
                            <Select labelId="tipo-demanda-label" value={selectedDemandType} label="Tipo de Demanda Associada" onChange={(e: SelectChangeEvent) => setSelectedDemandType(e.target.value as string)} >
                                <MenuItem value="" disabled>Selecione...</MenuItem>
                                {tiposDeDemanda.map(tipo => (<MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>))}
                            </Select>
                        </FormControl>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="h6">Resumo dos Campos:</Typography>
                        {campos.length > 0 ? (
                            <List dense sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
                                {campos.map((campo, index) => (
                                    <ListItem key={campo.id} divider={index < campos.length - 1}>
                                        <ListItemText primary={campo.label || `Campo ${index + 1}`} secondary={`Tipo: ${campo.type}`} />
                                    </ListItem>
                                ))}
                            </List>
                        ) : (<Typography color="textSecondary">Nenhum campo adicionado.</Typography>)}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseSaveDialog}>Cancelar</Button>
                    <Button onClick={handleSaveForm} variant="contained" color="primary">Confirmar e Salvar</Button>
                </DialogActions>
      </Dialog>

      {/* Diálogo Sucesso */}
      <Dialog open={showSuccessDialog} onClose={handleCloseSuccessDialog}>
        {/* ... (conteúdo do diálogo permanece o mesmo) ... */}
        <DialogTitle sx={{ textAlign: 'center', color: 'green' }}>Sucesso!</DialogTitle>
                <DialogContent sx={{ textAlign: 'center', p: 3 }}>
                    <CheckCircleOutlineIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
                    <Typography variant="h6">Formulário &quot;{savedFormName}&quot; salvo com sucesso!</Typography>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
                    <Button onClick={handleCloseSuccessDialog} variant="contained">Fechar (e criar novo)</Button>
                </DialogActions>
      </Dialog>
    </div>
  );
}