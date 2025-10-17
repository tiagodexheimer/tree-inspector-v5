import { Box, Typography, Card, TextField, Button } from "@mui/material";
import { CampoDef } from "./CriarFormularios";

// Define as props que o editor receberá
interface EditorProps {
    campos: CampoDef[];
    setCampos: React.Dispatch<React.SetStateAction<CampoDef[]>>;
}
export default function EditorFormularios({ campos, setCampos }: EditorProps) {
// Função para lidar com mudanças nos inputs do editor
    const handleCampoChange = (id: string, event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        
        // Atualiza o array de campos
        setCampos(prevCampos =>
            prevCampos.map(campo =>
                campo.id === id ? { ...campo, [name]: value } : campo
            )
        );
    };

    // Função para remover um campo
    const handleRemoverCampo = (id: string) => {
        setCampos(prevCampos => prevCampos.filter(campo => campo.id !== id));
    };

    return (
        <Box sx={{ border: '1px dashed grey', padding: 2, width: 350, minHeight: 400, overflowY: 'auto' }}>
            <Typography variant="h6">Editor de Campos</Typography>
            
            {campos.length === 0 && (
                <Typography variant="body2" color="textSecondary">
                    Clique em um campo à esquerda para adicioná-lo ao formulário.
                </Typography>
            )}

            {campos.map(campo => (
                <Card key={campo.id} variant="outlined" sx={{ mb: 2, p: 2, backgroundColor: '#f9f9f9' }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Editando: <strong>{campo.type}</strong>
                    </Typography>
                    
                    {/* Input para editar o Label */}
                    <TextField
                        fullWidth
                        label="Label"
                        variant="standard"
                        name="label" // O 'name' DEVE corresponder à chave em CampoDef
                        value={campo.label}
                        onChange={(e) => handleCampoChange(campo.id, e)}
                        sx={{ mb: 1 }}
                    />

                    {/* Input para editar o Name (atributo name do HTML) */}
                    <TextField
                        fullWidth
                        label="Nome (name)"
                        variant="standard"
                        name="name"
                        value={campo.name}
                        onChange={(e) => handleCampoChange(campo.id, e)}
                        sx={{ mb: 1 }}
                    />
                    
                    {/* Inputs condicionais baseados no tipo */}
                    {campo.type === 'text' && (
                        <TextField
                            fullWidth
                            label="Placeholder"
                            variant="standard"
                            name="placeholder" // O 'name' DEVE corresponder à chave em CampoDef
                            value={campo.placeholder || ''}
                            onChange={(e) => handleCampoChange(campo.id, e)}
                            sx={{ mb: 1 }}
                        />
                    )}
                    
                    {/* Botão para remover o campo */}
                    <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => handleRemoverCampo(campo.id)}
                        sx={{ mt: 1 }}
                    >
                        Remover Campo
                    </Button>
                </Card>
            ))}
        </Box>
    );
}