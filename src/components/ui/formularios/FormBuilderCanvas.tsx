// src/app/gerenciar/formularios/FormBuilderCanvas.tsx
import { Box, Paper, Typography, Card } from "@mui/material";
import { FormField } from "@/types/demanda";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Droppable } from "./Droppable";
import { SortableField } from "./SortableField";
import RenderFormField from "@/components/ui/formularios/RenderFormField";
import React from "react";

interface FormBuilderCanvasProps {
  // Recebe a lista de campos que foram soltos e que podem ser reordenados
  droppedFields: FormField[];
}

/**
 * Coluna central, a área de drop principal onde o formulário é montado.
 */
export function FormBuilderCanvas({ droppedFields }: FormBuilderCanvasProps) {
  return (
    <Paper
      sx={{
        width: "50%",
        p: 2,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h6" gutterBottom>
        Estrutura do Laudo
      </Typography>
      {/* O Droppable define a área que aceita a ação de soltar */}
      <Droppable id="droppable-area">
        {/* O SortableContext permite reordenar os itens já existentes */}
        <SortableContext
          items={droppedFields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <Box className="space-y-4 h-full">
            {droppedFields.length > 0 ? (
              // Mapeia os campos soltos, transformando-os em itens reordenáveis
              droppedFields.map((field) => (
                <SortableField key={field.id} id={field.id}>
                  <Card
                    variant="outlined"
                    className="p-2 cursor-grab"
                  >
                    <RenderFormField field={field} />
                  </Card>
                </SortableField>
              ))
            ) : (
              // Mensagem de placeholder quando a área está vazia
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  border: "2px dashed #ccc",
                  borderRadius: "4px",
                  minHeight: "150px",
                }}
              >
                <Typography color="text.secondary">
                  Arraste os campos aqui
                </Typography>
              </Box>
            )}
          </Box>
        </SortableContext>
      </Droppable>
    </Paper>
  );
}