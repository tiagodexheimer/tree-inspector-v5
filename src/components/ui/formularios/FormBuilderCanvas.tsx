// src/app/gerenciar/formularios/FormBuilderCanvas.tsx
import { Box, Paper, Typography, Card } from "@mui/material";
import { FormField } from "@/types/demanda";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Droppable } from "./Droppable";
import { SortableField } from "./SortableField";
import RenderFormField from "@/components/ui/formularios/RenderFormField";
import React from "react";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { UniqueIdentifier } from "@dnd-kit/core";

interface FormBuilderCanvasProps {
  droppedFields: FormField[];
  overId: UniqueIdentifier | null; 
  selectedFieldId: UniqueIdentifier | null; 
  onFieldSelect: (id: UniqueIdentifier) => void;
  // Prop para indicar se o drag está desabilitado
  isDragDisabled: boolean;
}

/**
 * Coluna central, a área de drop principal onde o formulário é montado.
 */
export function FormBuilderCanvas({ droppedFields, overId, selectedFieldId, onFieldSelect, isDragDisabled }: FormBuilderCanvasProps) {
  const DROPPABLE_AREA_ID = "droppable-area";
  const TRASH_CAN_ID = "trash-can-area";
  const DROP_END_AREA_ID = "drop-end-area";

  const isOverDroppableArea = overId === DROPPABLE_AREA_ID;
  const isOverDropEndArea = overId === DROP_END_AREA_ID;

  // Handler que chama a seleção e pára a propagação.
  const handleCardClick = (e: React.MouseEvent, id: UniqueIdentifier) => {
      e.stopPropagation(); 
      onFieldSelect(id);
  }

  // Define o estilo do cursor baseado no modo. Se o drag está desabilitado, vira pointer.
  const cardCursorClass = isDragDisabled ? 'cursor-pointer' : 'cursor-grab';

  return (
    <Paper
      sx={{
        width: "45%",
        p: 2,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h6" gutterBottom>
        Estrutura do Laudo
      </Typography>
      
      {/* 1. Área principal de drop e reordenação com barra de rolagem */}
      <Droppable id={DROPPABLE_AREA_ID}>
        <SortableContext
          items={droppedFields.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <Box 
            className="space-y-4" 
            sx={{ 
                maxHeight: 'calc(100vh - 300px)',
                overflowY: 'auto', 
                p: 1,
                minHeight: '200px',
            }}
          >
            {droppedFields.length > 0 ? (
              <>
                {/* Itens do Formulário */}
                {droppedFields.map((field) => (
                  <SortableField 
                    key={field.id} 
                    id={field.id}
                    isDragDisabled={isDragDisabled} // PASSA PROP DE CONTROLE
                  >
                    <Card
                      variant="outlined"
                      // Ação de clique para edição
                      onClick={(e) => handleCardClick(e, field.id)}
                      className={`p-2 ${cardCursorClass}`} // Usa a classe de cursor condicional
                      sx={{
                        border: field.id === selectedFieldId ? '2px solid #2196F3' : '1px solid rgba(0, 0, 0, 0.12)',
                        boxShadow: field.id === selectedFieldId ? 3 : 1,
                        transition: 'all 0.1s',
                      }}
                    >
                      <RenderFormField field={field} />
                    </Card>
                  </SortableField>
                ))}
                
                {/* Drop Zone Explícito no Fim da Lista */}
                <Droppable id={DROP_END_AREA_ID}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "50px",
                        // O drop na área final só deve ter indicador visual se o drag NÃO estiver desabilitado
                        border: !isDragDisabled && isOverDropEndArea ? "2px solid #257e1a" : "2px dashed #ccc",
                        backgroundColor: !isDragDisabled && isOverDropEndArea ? "#e8f5e9" : "transparent",
                        borderRadius: "4px",
                        transition: 'all 0.2s',
                        mt: 2,
                        cursor: isDragDisabled ? 'not-allowed' : 'auto',
                      }}
                    >
                        <Typography color="text.secondary">
                            Soltar aqui para adicionar ao final
                        </Typography>
                    </Box>
                </Droppable>
              </>
            ) : (
              // Mensagem de placeholder quando a área está vazia
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  // O drop na área vazia só deve ter indicador visual se o drag NÃO estiver desabilitado
                  border: !isDragDisabled && isOverDroppableArea ? "2px solid #257e1a" : "2px dashed #ccc",
                  backgroundColor: !isDragDisabled && isOverDroppableArea ? "#e8f5e9" : "transparent",
                  borderRadius: "4px",
                  minHeight: "150px",
                  transition: 'all 0.2s',
                  cursor: isDragDisabled ? 'not-allowed' : 'auto',
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
              // O indicador visual para a lixeira só deve funcionar se o drag NÃO estiver desabilitado
              border: !isDragDisabled && overId === TRASH_CAN_ID ? '2px solid #e65100' : '2px dashed #ff9800',
              borderRadius: '4px',
              backgroundColor: !isDragDisabled && overId === TRASH_CAN_ID ? '#fbe9e7' : '#fff3e0',
              textAlign: 'center',
              minHeight: '100px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              cursor: isDragDisabled ? 'not-allowed' : 'auto',
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