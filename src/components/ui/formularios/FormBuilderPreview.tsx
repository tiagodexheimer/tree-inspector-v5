// src/app/gerenciar/formularios/FormBuilderPreview.tsx
"use client";

import { Box, Paper, Typography, IconButton } from "@mui/material";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import { FormField } from "@/types/demanda";
import RenderFormField from "@/components/ui/formularios/RenderFormField";
import React from "react";

interface FormBuilderPreviewProps {
  // Recebe a lista de campos para renderizar a pré-visualização
  droppedFields: FormField[];
}

/**
 * Coluna lateral direita para pré-visualização do formulário em um mockup de celular.
 */
export function FormBuilderPreview({ droppedFields }: FormBuilderPreviewProps) {
  return (
    <Paper 
      sx={{ 
        width: "30%", 
        p: 2, 
        // Mantém o preview fixo no topo
        position: "sticky",
        top: 20,
        height: 'calc(100vh - 120px)', // Altura total menos o cabeçalho e margens
      }}
    >
      <Typography variant="h6">Pré-visualização</Typography>
      <Box
        sx={{
          // Estilo de celular para simular a visualização em campo
          width: 375,
          height: 667,
          borderRadius: 5,
          border: "10px solid #333",
          boxShadow: 3,
          mx: "auto", // Centraliza o mock-up
          mt: 2,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "white",
        }}
      >
        {/* Conteúdo da Tela do Celular (Scrollable) */}
        <Box
          sx={{
            flexGrow: 1, 
            overflowY: "auto", 
            p: 2,
          }}
        >
          {droppedFields.length > 0 ? (
            // Renderiza os campos do formulário
            droppedFields.map((field) => (
              <RenderFormField key={field.id} field={field} />
            ))
          ) : (
            // Mensagem de placeholder quando a área está vazia
            <Typography
              color="text.secondary"
              align="center"
              sx={{
                p: 2,
                mt: 4,
              }}
            >
              Os campos do formulário aparecerão aqui.
            </Typography>
          )}
        </Box>

        {/* Barra de Navegação Inferior (Mockup) */}
        <Box
          sx={{
            py: 0.5,
            backgroundColor: "#212121", 
            color: "white",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            borderBottomLeftRadius: '5px', 
            borderBottomRightRadius: '5px',
          }}
        >
          <IconButton color="inherit" size="small">
            <ChangeHistoryIcon fontSize="small" />
          </IconButton>
          <IconButton color="inherit" size="small">
            <RadioButtonUncheckedIcon fontSize="small" />
          </IconButton>
          <IconButton color="inherit" size="small">
            <CropSquareIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}