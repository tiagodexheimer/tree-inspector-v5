// src/components/ui/formularios/FormBuilderCanvas.tsx
import { Box, Paper, Typography, Card } from "@mui/material";
import { FormField } from "@/types/demanda";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Droppable } from "./Droppable";
import { SortableField } from "./SortableField";
import { FieldConfigurator } from "./FieldConfigurator"; // Importamos o configurador
import React from "react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { UniqueIdentifier } from "@dnd-kit/core";

interface FormBuilderCanvasProps {
  droppedFields: FormField[];
  overId: UniqueIdentifier | null;
  updateField: (id: UniqueIdentifier, updatedField: Partial<FormField>) => void;
  deleteField: (id: UniqueIdentifier) => void;
}

export function FormBuilderCanvas({
  droppedFields,
  overId,
  updateField,
  deleteField,
}: FormBuilderCanvasProps) {
  const DROPPABLE_AREA_ID = "droppable-area";
  const TRASH_CAN_ID = "trash-can-area";
  const DROP_END_AREA_ID = "drop-end-area";

  const isOverDroppableArea = overId === DROPPABLE_AREA_ID;
  const isOverDropEndArea = overId === DROP_END_AREA_ID;

  return (
    <Paper
      sx={{
        width: "50%", // Aumentamos a largura para acomodar a edição
        p: 2,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h6" gutterBottom>
        Estrutura do Laudo
      </Typography>

      <Droppable id={DROPPABLE_AREA_ID}>
        <SortableContext
          items={droppedFields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <Box
            className="space-y-4"
            sx={{
              maxHeight: "calc(100vh - 300px)",
              overflowY: "auto",
              p: 1,
              minHeight: "200px",
            }}
          >
            {droppedFields.length > 0 ? (
              <>
                {droppedFields.map((field) => (
                  <SortableField key={field.id} id={field.id} isDragDisabled={false}>
                    <Card variant="outlined" className="p-2 w-full">
                      {/* O FieldConfigurator agora está dentro do card */}
                      <FieldConfigurator
                        field={field}
                        updateField={updateField}
                        deleteField={deleteField}
                        onClose={() => {}} // onClose pode ser removido ou adaptado se necessário
                      />
                    </Card>
                  </SortableField>
                ))}

                <Droppable id={DROP_END_AREA_ID}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "50px",
                      border: isOverDropEndArea
                        ? "2px solid #257e1a"
                        : "2px dashed #ccc",
                      backgroundColor: isOverDropEndArea
                        ? "#e8f5e9"
                        : "transparent",
                      borderRadius: "4px",
                      transition: "all 0.2s",
                      mt: 2,
                    }}
                  >
                    <Typography color="text.secondary">
                      Soltar aqui para adicionar ao final
                    </Typography>
                  </Box>
                </Droppable>
              </>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  border: isOverDroppableArea
                    ? "2px solid #257e1a"
                    : "2px dashed #ccc",
                  backgroundColor: isOverDroppableArea
                    ? "#e8f5e9"
                    : "transparent",
                  borderRadius: "4px",
                  minHeight: "150px",
                  transition: "all 0.2s",
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

      <Box sx={{ flexGrow: 1, pt: 4, mt: "auto" }}>
        <Droppable id={TRASH_CAN_ID}>
          <Box
            sx={{
              p: 2,
              border:
                overId === TRASH_CAN_ID
                  ? "2px solid #e65100"
                  : "2px dashed #ff9800",
              borderRadius: "4px",
              backgroundColor:
                overId === TRASH_CAN_ID ? "#fbe9e7" : "#fff3e0",
              textAlign: "center",
              minHeight: "100px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
          >
            <DeleteOutlineIcon color="warning" sx={{ fontSize: 40 }} />
            <Typography variant="body1" color="#e65100">
              Arraste para Remover
            </Typography>
          </Box>
        </Droppable>
      </Box>
    </Paper>
  );
}