import React from 'react';
import { Box, Typography } from '@mui/material';
import { CampoDef } from './VisualizarFormularios'; // Importa a interface
import CampoFormularios from './CampoFormularios'; // Importa seu componente de campo

// Define as props
interface PreviaProps {
    campos: CampoDef[];
}

export default function PreVisualizarFormularios({ campos }: PreviaProps) {
    
    // Estado local para armazenar os *valores* do formulário de pré-visualização
    const [formData, setFormData] = React.useState<any>({});

    // Handler universal para atualizar o estado do formulário de pré-visualização
    const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = event.target;
        
        // Lógica especial para Checkbox
        if (type === 'checkbox') {
            const { checked } = event.target as HTMLInputElement;
            setFormData((prevData: any) => ({
                ...prevData,
                [name]: checked
            }));
        } else {
            setFormData((prevData: any) => ({
                ...prevData,
                [name]: value
            }));
        }
    };

    return (
        <Box sx={{ border: '1px solid black', padding: 2, width: 350, minHeight: 400 }}>
            <Typography variant="h6">Pré-Visualização</Typography>
            
            <form>
                {campos.length === 0 && (
                    <Typography variant="body2" color="textSecondary">
                        Seu formulário aparecerá aqui.
                    </Typography>
                )}
                
                {campos.map(campo => (
                    <CampoFormularios
                        key={campo.id}
                        type={campo.type}
                        label={campo.label}
                        name={campo.name}
                        value={formData[campo.name] || (campo.type === 'checkbox' ? false : '')}
                        placeholder={campo.placeholder}
                        onChange={handleFormChange}
                        options={campo.options} // Passa opções (para 'select')
                    />
                ))}
            </form>

            {/* Opcional: Mostra o estado do formulário */}
            <Box sx={{ mt: 2, p: 1, backgroundColor: '#eee', borderRadius: 1 }}>
                <Typography variant="caption">Estado do Formulário (formData):</Typography>
                <pre style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(formData, null, 2)}
                </pre>
            </Box>
        </Box>
    );
}