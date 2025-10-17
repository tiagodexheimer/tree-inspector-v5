import { CheckBox } from "@mui/icons-material";
import { Box, Card, Input, Typography } from "@mui/material";
import React from "react";
import PreVisualizarFormularios from "./PreVisualizarFormularios";
import EditorFormularios from "./EditorFormularios";

export interface CampoDef {
    id: string;
    type: 'text' | 'checkbox' | 'textarea' | 'select'; // Adicione mais tipos conforme necessário
    name: string;
    label: string;
    placeholder?: string;
    options?: { value: string, label: string }[];
}

export default function CriarFormularios() {
// Este é o estado principal que armazena as definições do seu formulário
    const [campos, setCampos] = React.useState<CampoDef[]>([]);

    // Esta função agora ADICIONA um novo campo à lista
    const handleInserirCampos = (tipo: 'text' | 'checkbox') => {
        
        const novoId = `campo_${Date.now()}`;

        let novoCampo: CampoDef;

        if (tipo === 'text') {
            novoCampo = {
                id: novoId,
                type: 'text',
                label: 'Novo Campo de Texto',
                placeholder: 'Digite aqui...',
                name: novoId, // Usamos ID como nome padrão, pode ser editado
            };
        } else { // tipo === 'checkbox'
            novoCampo = {
                id: novoId,
                type: 'checkbox',
                label: 'Nova Caixa de Seleção',
                name: novoId,
            };
        }
        // Adicionamos o novo campo ao array de campos existentes
        setCampos((prevCampos) => [...prevCampos, novoCampo]);
    }


    return (
        <div>
            Criar Formulários
            <div className="flex flex-row gap-4 justify-center items-center" >
                <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                    <Typography variant="h6" gutterBottom>Campos</Typography>
                    <Card variant="outlined" id="1" onClick={() => handleInserirCampos("text")} className="p-4 m-4 cursor-pointer">
                        <Input type="text" placeholder="Entrada de texto" disabled />
                    </Card>
                    <Card variant="outlined" id="2" onClick={() => handleInserirCampos("checkbox")} className="p-4 m-4 cursor-pointer">
                        <CheckBox />
                        Caixa de seleção
                    </Card>
                    {/* Adicione mais cards para 'textarea', 'select', etc. */}
                </Box>
                <Box>
                   <EditorFormularios campos={campos} setCampos={setCampos} />
                </Box>
                <Box>
                    <PreVisualizarFormularios campos={campos} />
                </Box>
            </div>
        </div>


    );
}