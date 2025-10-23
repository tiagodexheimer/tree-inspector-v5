// src/components/ui/formularios/EditorFormularios.tsx
import React from 'react';
import { Box, Typography, Card, TextField, Button, IconButton, List, ListItem, ListItemText } from '@mui/material';
import { AddCircleOutline, DeleteOutline, Edit } from '@mui/icons-material'; // Ícones para opções
import { CampoDef, CampoOpcao } from './CriarFormularios'; // Importa interfaces

interface EditorProps {
  campos: CampoDef[];
  setCampos: React.Dispatch<React.SetStateAction<CampoDef[]>>;
}

export default function EditorFormularios({ campos, setCampos }: EditorProps) {

  // Estado local para gerenciar a edição de uma opção específica
  const [editingOption, setEditingOption] = React.useState<{ campoId: string; optionId: string } | null>(null);
  const [tempOptionLabel, setTempOptionLabel] = React.useState('');
  const [tempOptionValue, setTempOptionValue] = React.useState('');

  const handleCampoChange = (id: string, event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;
    const isNumeric = type === 'number'; // Checa se o input é numérico (para 'rows')

    setCampos(prevCampos =>
      prevCampos.map(campo =>
        campo.id === id
          ? { ...campo, [name]: isNumeric ? (parseInt(value, 10) || 0) : value } // Converte para número se necessário
          : campo
      )
    );
  };

  const handleRemoverCampo = (id: string) => { //
    setCampos(prevCampos => prevCampos.filter(campo => campo.id !== id));
  };

  // --- Funções para Gerenciar Opções (Select/Radio) ---

  const handleAddOption = (campoId: string) => {
    const newOptionId = `opt_${Date.now()}`;
    setCampos(prevCampos =>
      prevCampos.map(campo =>
        campo.id === campoId
          ? {
              ...campo,
              options: [...(campo.options || []), { id: newOptionId, value: `valor_${campo.options?.length || 0 + 1}`, label: `Nova Opção ${campo.options?.length || 0 + 1}` }]
            }
          : campo
      )
    );
  };

  const handleRemoveOption = (campoId: string, optionId: string) => {
    setCampos(prevCampos =>
      prevCampos.map(campo =>
        campo.id === campoId
          ? { ...campo, options: campo.options?.filter(opt => opt.id !== optionId) }
          : campo
      )
    );
     // Cancela edição se a opção removida era a que estava sendo editada
    if (editingOption?.campoId === campoId && editingOption?.optionId === optionId) {
        setEditingOption(null);
    }
  };

  const handleStartEditOption = (campoId: string, option: CampoOpcao) => {
    setEditingOption({ campoId, optionId: option.id });
    setTempOptionLabel(option.label);
    setTempOptionValue(option.value);
  };

  const handleCancelEditOption = () => {
    setEditingOption(null);
    setTempOptionLabel('');
    setTempOptionValue('');
  };

  const handleSaveOption = () => {
    if (!editingOption) return;
    const { campoId, optionId } = editingOption;

    setCampos(prevCampos =>
      prevCampos.map(campo =>
        campo.id === campoId
          ? {
              ...campo,
              options: campo.options?.map(opt =>
                opt.id === optionId ? { ...opt, label: tempOptionLabel, value: tempOptionValue } : opt
              )
            }
          : campo
      )
    );
    handleCancelEditOption(); // Sai do modo de edição
  };

  // --- Renderização do Editor de Opções ---
  const renderOptionEditor = (campo: CampoDef) => (
    <Box sx={{ mt: 2, borderTop: '1px dashed #ccc', pt: 1 }}>
      <Typography variant="caption" display="block" gutterBottom>Opções:</Typography>
      <List dense disablePadding>
        {campo.options?.map((option) => (
          <ListItem
            key={option.id}
            disableGutters
            secondaryAction={
              <>
                <IconButton edge="end" aria-label="edit" size="small" onClick={() => handleStartEditOption(campo.id, option)} disabled={!!editingOption}>
                  <Edit fontSize="inherit" />
                </IconButton>
                <IconButton edge="end" aria-label="delete" size="small" onClick={() => handleRemoveOption(campo.id, option.id)} disabled={!!editingOption}>
                  <DeleteOutline fontSize="inherit" />
                </IconButton>
              </>
            }
          >
            {/* Mostra inputs de edição ou o texto da opção */}
            {editingOption?.campoId === campo.id && editingOption?.optionId === option.id ? (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%', mr: 8 /* espaço para actions */ }}>
                 <TextField
                    label="Label" size="small" variant="standard"
                    value={tempOptionLabel} onChange={(e) => setTempOptionLabel(e.target.value)}
                    sx={{ flexGrow: 1 }} />
                 <TextField
                    label="Valor" size="small" variant="standard"
                    value={tempOptionValue} onChange={(e) => setTempOptionValue(e.target.value)}
                    sx={{ width: '80px' }} />
                <Button size="small" onClick={handleSaveOption} variant="outlined">Salvar</Button>
                <Button size="small" onClick={handleCancelEditOption} color="inherit">Cancelar</Button>
              </Box>
            ) : (
              <ListItemText primary={option.label} secondary={`Valor: ${option.value}`} sx={{wordBreak: 'break-word'}}/>
            )}
          </ListItem>
        ))}
      </List>
      <Button
        size="small"
        startIcon={<AddCircleOutline />}
        onClick={() => handleAddOption(campo.id)}
        disabled={!!editingOption} // Desabilita Adicionar enquanto edita
        sx={{ mt: 1 }}
      >
        Adicionar Opção
      </Button>
    </Box>
  );

  return (
    <Box sx={{ border: '1px dashed grey', padding: 2, width: 350, minHeight: 450, maxHeight: '70vh', overflowY: 'auto' }}> {/* Ajuste altura/scroll */}
      <Typography variant="h6">Editor de Campos</Typography>

      {campos.length === 0 && (
        <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 4 }}>
          Clique em um campo à esquerda para adicioná-lo ao formulário.
        </Typography>
      )}

      {campos.map(campo => (
        <Card key={campo.id} variant="outlined" sx={{ mb: 2, p: 2, backgroundColor: '#f9f9f9' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ textTransform: 'capitalize' }}>
              Editando: <strong>{campo.type}</strong>
            </Typography>
             {/* Botão para remover o campo */}
            <Button size="small" color="error" variant="text" onClick={() => handleRemoverCampo(campo.id)} sx={{ml: 1}}>
                Remover
            </Button>
          </Box>


          {/* Input para editar o Label */}
          <TextField fullWidth label="Label (Rótulo)" variant="standard" name="label" value={campo.label} onChange={(e) => handleCampoChange(campo.id, e)} sx={{ mb: 1 }} />

          {/* Input para editar o Name (atributo name do HTML) */}
          <TextField fullWidth label="Nome (Identificador Interno)" variant="standard" name="name" value={campo.name} onChange={(e) => handleCampoChange(campo.id, e)} sx={{ mb: 1 }} helperText="Usado internamente, sem espaços ou acentos."/>

          {/* Inputs condicionais baseados no tipo */}
          {(campo.type === 'text' || campo.type === 'textarea') && (
            <TextField fullWidth label="Placeholder (Texto de ajuda)" variant="standard" name="placeholder" value={campo.placeholder || ''} onChange={(e) => handleCampoChange(campo.id, e)} sx={{ mb: 1 }} />
          )}

          {campo.type === 'textarea' && (
             <TextField fullWidth label="Linhas" variant="standard" name="rows" type="number" value={campo.rows || 3} onChange={(e) => handleCampoChange(campo.id, e)} sx={{ mb: 1 }} inputProps={{ min: 1 }}/>
          )}

           {/* Editor de Opções para Select e Radio */}
          {(campo.type === 'select' || campo.type === 'radio') && renderOptionEditor(campo)}

          {/* TODO: Adicionar editor para defaultValue do Switch se necessário */}

        </Card>
      ))}
    </Box>
  );
}