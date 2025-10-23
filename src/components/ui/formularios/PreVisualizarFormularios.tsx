// src/components/ui/formularios/PreVisualizarFormularios.tsx
import React from 'react';
// FIX: Add SelectChangeEvent to the import from @mui/material
import { Box, Typography, SelectChangeEvent } from '@mui/material';
import { CampoDef } from './CriarFormularios'; // Assuming this import is correct
import CampoFormularios from './CampoFormularios';

interface PreviaProps {
    campos: CampoDef[];
}

// Define a more specific type for the form data state
type FormDataState = Record<string, string | boolean | number>;

export default function PreVisualizarFormularios({ campos }: PreviaProps) {
    // Use the specific type FormDataState instead of any
    const [formData, setFormData] = React.useState<FormDataState>({});

    // The type annotation here now has the imported SelectChangeEvent
    const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
        // Verifica se é um evento de SelectChangeEvent
        if (typeof event === 'object' && event && 'target' in event) {
            const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement; // Cast mais específico
            const { name, value, type } = target;

             // Lógica especial para Checkbox e Switch
            if (type === 'checkbox' || type === 'switch') { // Adicionado 'switch'
                const { checked } = target as HTMLInputElement; // Cast para acessar 'checked'
                setFormData((prevData: FormDataState) => ({
                    ...prevData,
                    [name]: checked
                }));
            } else {
                 // Para outros tipos (text, textarea, select, radio)
                setFormData((prevData: FormDataState) => ({
                    ...prevData,
                    [name]: value
                }));
            }
        } else {
             // Caso específico para Select do MUI que passa o valor diretamente no SelectChangeEvent
             // Assumindo que o <Select> tem um 'name'
             // Esta parte pode precisar de ajuste dependendo de como o onChange do Select é chamado
             // No nosso CampoFormularios, ele já retorna um objeto de evento compatível.
             console.warn("Evento de change não esperado:", event);
        }
    };


    return (
        <Box sx={{ border: '1px solid black', padding: 2, width: 350, minHeight: 450, maxHeight: '70vh', overflowY: 'auto' }}> {/* Ajuste altura/scroll */}
            <Typography variant="h6">Pré-Visualização</Typography>

            <form>
                {campos.length === 0 && (
                    <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 4 }}>
                        Seu formulário aparecerá aqui.
                    </Typography>
                )}

                {campos.map(campo => (
                    <CampoFormularios
                        key={campo.id}
                        type={campo.type}
                        label={campo.label}
                        name={campo.name}
                        // Define valor inicial baseado no tipo
                        value={formData[campo.name] ?? (campo.type === 'checkbox' || campo.type === 'switch' ? (campo.defaultValue ?? false) : '')}
                        placeholder={campo.placeholder}
                        onChange={handleFormChange}
                        options={campo.options}
                        rows={campo.rows} // Passa rows para textarea
                        defaultValue={campo.defaultValue} // Passa defaultValue para switch
                    />
                ))}
            </form>

            {/* Opcional: Mostra o estado do formulário */}
            {campos.length > 0 && (
                 <Box sx={{ mt: 2, p: 1, backgroundColor: '#eee', borderRadius: 1 }}>
                    <Typography variant="caption">Estado do Formulário (formData):</Typography>
                    <pre style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {JSON.stringify(formData, null, 2)}
                    </pre>
                </Box>
            )}
        </Box>
    );
}