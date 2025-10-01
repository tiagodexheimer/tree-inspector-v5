'use client';

import { 
    Box, Typography, TextField,
    Button, IconButton, Accordion, AccordionSummary, AccordionDetails 
} from '@mui/material';
import { UniqueIdentifier } from '@dnd-kit/core';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';

export type FieldType = 'input' | 'checkbox' | 'select';
export type FormField = { 
    id: UniqueIdentifier; 
    type: FieldType; 
    label: string; 
    placeholder: string;
    options?: string[];
};

interface FormFieldEditorProps {
    field: FormField;
    updateField: (id: UniqueIdentifier, updatedField: Partial<FormField>) => void;
    deleteField: (id: UniqueIdentifier) => void;
}

export default function FormFieldEditor({ field, updateField, deleteField }: FormFieldEditorProps) {
    
    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...(field.options || [])];
        newOptions[index] = value;
        updateField(field.id, { options: newOptions });
    };

    const addOption = () => {
        const currentOptions = field.options || [];
        const newOptionName = `Nova Opção ${currentOptions.length + 1}`;
        const newOptions = [...currentOptions, newOptionName];
        updateField(field.id, { options: newOptions });
    };

    const removeOption = (index: number) => {
        const newOptions = [...(field.options || [])];
        newOptions.splice(index, 1);
        updateField(field.id, { options: newOptions });
    };

    return (
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 'bold' }}>{field.label || "Campo sem título"}</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        // O nome deste campo foi atualizado
                        label="Título do Campo (texto acima)"
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        fullWidth
                        size="small"
                    />
                    {field.type === 'input' && (
                        <TextField
                            // E o nome deste também
                            label="Dica de Escrita (texto dentro)"
                            value={field.placeholder}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                            fullWidth
                            size="small"
                        />
                    )}

                    {(field.type === 'checkbox' || field.type === 'select') && (
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Opções</Typography>
                            {field.options?.map((option, index) => (
                                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <TextField
                                        label={`Opção ${index + 1}`}
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        fullWidth
                                        size="small"
                                    />
                                    <IconButton onClick={() => removeOption(index)}><DeleteIcon /></IconButton>
                                </Box>
                            ))}
                            <Button onClick={addOption} size="small">Adicionar Opção</Button>
                        </Box>
                    )}
                    <Button color="error" size="small" onClick={() => deleteField(field.id)} sx={{ alignSelf: 'flex-end' }}>
                        Deletar Campo
                    </Button>
                </Box>
            </AccordionDetails>
        </Accordion>
    );
}