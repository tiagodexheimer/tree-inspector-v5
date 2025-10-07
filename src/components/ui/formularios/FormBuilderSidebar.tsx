// src/app/gerenciar/formularios/FormBuilderSidebar.tsx
import { Box, Paper, Typography, Card } from "@mui/material";
import { FormField } from "@/types/demanda";
import { DraggableField } from "./DraggableField";
import RenderFormField from "@/components/ui/formularios/RenderFormField";
import React from "react";

interface FormBuilderSidebarProps {
  camposDisponiveis: FormField[];
}

/**
 * Coluna lateral esquerda com os campos disponíveis para arrastar.
 */
export function FormBuilderSidebar({ camposDisponiveis }: FormBuilderSidebarProps) {
  return (
    <Paper
      sx={{
        width: "20%",
        p: 2,
        // Mantém a sidebar fixa no topo
        position: "sticky",
        top: 20, 
        height: 'calc(100vh - 120px)', // Altura total menos o cabeçalho e margens
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      <Typography variant="h6" gutterBottom>
        Campos Disponíveis
      </Typography>
      <Box component="div" className="space-y-4">
        {camposDisponiveis.map((campo) => (
          <DraggableField key={campo.id} id={campo.id}>
            <Card variant="outlined" className="p-2 cursor-grab">
              <RenderFormField field={campo} />
            </Card>
          </DraggableField>
        ))}
      </Box>
    </Paper>
  );
}