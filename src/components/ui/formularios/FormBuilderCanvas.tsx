// src/app/gerenciar/formularios/FormBuilderCanvas.tsx
import { Box, Paper, Typography, Card } from "@mui/material";
import { FormField } from "@/types/demanda";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Droppable } from "./Droppable";
import { SortableField } from "./SortableField";
import RenderFormField from "@/components/ui/formularios/RenderFormField";
import React from "react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

interface FormBuilderCanvasProps {
  droppedFields: FormField[];
}

/**
 * Coluna central, a área de drop principal onde o formulário é montado.
 */
export function FormBuilderCanvas({ droppedFields }: FormBuilderCanvasProps) {
  // Usamos um ID separado para a "lixeira" dentro do canvas
  const TRASH_CAN_ID = "trash-can-area";

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
      
      {/* 1. Área principal de drop e reordenação com barra de rolagem */}
      <Droppable id="droppable-area">
        <SortableContext
          items={droppedFields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <Box 
            className="space-y-4" 
            sx={{ 
                maxHeight: 'calc(100vh - 300px)', // Altura máxima para ativar o scroll
                overflowY: 'auto', 
                p: 1, // Adiciona padding para que a barra de rolagem não esconda o conteúdo
                minHeight: '200px',
            }}
          >
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

      {/* 2. Área Extra de Drop/Descarte (Trash Can) - Mantida no final do canvas */}
      <Box sx={{ flexGrow: 1, pt: 4, mt: 'auto' }}>
        <Droppable id={TRASH_CAN_ID}>
          <Box
            sx={{
              p: 2,
              border: '2px dashed #ff9800',
              borderRadius: '4px',
              textAlign: 'center',
              backgroundColor: '#fff3e0',
              minHeight: '100px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': {
                borderColor: '#e65100',
                backgroundColor: '#ffe0b2',
              },
            }}
          >
            <DeleteOutlineIcon color="warning" sx={{ fontSize: 40 }} />
            <Typography variant="body1" color="#e65100">
              Arraste para Remover ou solte aqui para adicionar no final!
            </Typography>
          </Box>
        </Droppable>
      </Box>
    </Paper>
  );
}