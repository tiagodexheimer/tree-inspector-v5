"use client";
import { useState } from "react";
import { Box, Tabs, Tab, Typography, Paper, Card } from "@mui/material";

// Dnd-kit imports
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

// Nossos componentes customizados (definidos abaixo)
import { DraggableField } from "./DraggableField"; // Componente para a lista de origem
import { SortableField } from "./SortableField"; // Componente para a lista de destino
import { Droppable } from "./Droppable"; // Nossa área de drop

// Tipos e dados
import { FormField } from "@/types/demanda";
import RenderFormField from "@/components/RenderFormField";

// --- DADOS DE EXEMPLO ---
const camposDeExemplo: FormField[] = [
  {
    id: "input-vistoriador",
    type: "input",
    label: "Nome do Vistoriador",
    placeholder: "Digite seu nome completo",
  },
  {
    id: "select-condicao",
    type: "select",
    label: "Condição da Árvore",
    placeholder: "",
    options: ["Saudável", "Com Pragas", "Morta"],
  },
  {
    id: "checkbox-documentos",
    type: "checkbox",
    label: "Documentos Anexados",
    placeholder: "",
    options: ["ART", "Laudo Antigo", "Fotos"],
  },
  {
    id: "switch-urgente",
    type: "switch",
    label: "Requer Ação Urgente?",
    placeholder: "",
  },
];

export default function FormulariosPage() {
  const [activeTab, setActiveTab] = useState(0);

  // --- 1. GERENCIAMENTO DE ESTADO ---
  const [droppedFields, setDroppedFields] = useState<FormField[]>([]);
  const [activeField, setActiveField] = useState<FormField | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // --- 2. LÓGICA DO DRAG-AND-DROP ---

  // Quando um item começa a ser arrastado
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    // Encontra o objeto do campo completo (tanto da lista de origem quanto da de destino)
    const field =
      camposDeExemplo.find((f) => f.id === active.id) ||
      droppedFields.find((f) => f.id === active.id);
    if (field) {
      setActiveField(field);
    }
  }

  // Quando um item é solto
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    // Se não soltou sobre uma área válida, verifica se é para apagar
    if (!over) {
      // Verifica se o item arrastado era da lista de destino
      const isFromDroppedList = droppedFields.some((f) => f.id === active.id);
      if (isFromDroppedList) {
        // Apaga o item
        setDroppedFields((fields) =>
          fields.filter((field) => field.id !== active.id)
        );
      }
      setActiveField(null);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    // Lógica de REORDENAÇÃO (dentro da área de destino)
    const isOverSortableArea = droppedFields.some((f) => f.id === overId);
    if (isOverSortableArea && activeId !== overId) {
      const oldIndex = droppedFields.findIndex(
        (field) => field.id === activeId
      );
      const newIndex = droppedFields.findIndex((field) => field.id === overId);
      setDroppedFields((fields) => arrayMove(fields, oldIndex, newIndex));
    }

    // Lógica para ADICIONAR um novo item da origem para o destino
    const isOverDroppableContainer = over.id === "droppable-area";
    const isFromSourceList = camposDeExemplo.some((f) => f.id === activeId);

    if (isOverDroppableContainer && isFromSourceList) {
      const fieldToAdd = camposDeExemplo.find((f) => f.id === activeId);
      if (fieldToAdd) {
        // Opcional: impedir itens duplicados
        if (droppedFields.some((f) => f.id === fieldToAdd.id)) {
          // Poderia mostrar um alerta para o usuário aqui
        } else {
          setDroppedFields((fields) => [...fields, fieldToAdd]);
        }
      }
    }

    setActiveField(null); // Limpa o estado ativo
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div className="p-4">
        <Box sx={{ width: "100%" }}>
          <Tabs value={activeTab} onChange={handleTabChange} /* ... */>
            <Tab label="Listar Formulários" />
            <Tab label="Criar Novo Formulário" />
          </Tabs>

          {/* ... TabPanel de Listar Formulários ... */}

          <TabPanel value={activeTab} index={1}>
            <Typography variant="h5">Construtor de Formulários</Typography>
            <Box
              sx={{ display: "flex", gap: 2, p: 2, backgroundColor: "#f4f6f8" }}
            >
              {/* Coluna 1: Ferramentas (Origem) */}
              <Paper
                sx={{
                  width: "20%",
                  p: 2,
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Campos Disponíveis
                </Typography>
                <Box component="div" className="space-y-4">
                  {camposDeExemplo.map((campo) => (
                    <DraggableField key={campo.id} id={campo.id}>
                      <Card variant="outlined" className="p-2 cursor-grab">
                        <RenderFormField field={campo} />
                      </Card>
                    </DraggableField>
                  ))}
                </Box>
              </Paper>

              {/* Coluna 2: Montador (Destino) */}
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
                <Droppable id="droppable-area">
                  <SortableContext
                    items={droppedFields.map((f) => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Box className="space-y-4 h-full">
                      {droppedFields.length > 0 ? (
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

              {/* Coluna 3: Pré-visualização (ainda sem lógica) */}
              <Paper sx={{ width: "30%", p: 2 }}>
                <Typography variant="h6">Pré-visualização</Typography>
                {/* A pré-visualização pode simplesmente renderizar o array `droppedFields` */}
              </Paper>
            </Box>
          </TabPanel>
        </Box>
      </div>

      {/* --- 3. CAMADA DE OVERLAY PARA O CLONE --- */}
      <DragOverlay>
        {activeField ? (
          <Card variant="outlined" className="p-2" elevation={3}>
            <RenderFormField field={activeField} />
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// --- Componentes Auxiliares ---
// (Estes podem ficar no mesmo arquivo ou serem movidos para seus próprios arquivos)

// O TabPanel pode ficar aqui ou importado de outro lugar
function TabPanel(props: {
  children?: React.ReactNode;
  index: number;
  value: number;
}) {
  const { children, value, index } = props;
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}
