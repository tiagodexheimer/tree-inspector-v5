// src/app/gerenciar/formularios/page.tsx
"use client";
import { useState } from "react";
import { Box, Tabs, Tab, Typography, Card } from "@mui/material";

// Dnd-kit imports
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  DragOverEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

// Componentes da página Formulários
import ListaFormularios from "@/components/ui/formularios/ListaFormularios";
import RenderFormField from "@/components/ui/formularios/RenderFormField";
import { FormBuilderSidebar } from "@/components/ui/formularios/FormBuilderSidebar";
import { FormBuilderCanvas } from "@/components/ui/formularios/FormBuilderCanvas";
import { FormBuilderPreview } from "@/components/ui/formularios/FormBuilderPreview";

// Tipos e dados
import { FormField } from "@/types/demanda";

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

// --- Componente Auxiliar TabPanel ---
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

export default function FormulariosPage() {
  const [activeTab, setActiveTab] = useState(0);

  // --- GERENCIAMENTO DE ESTADO ---
  const [droppedFields, setDroppedFields] = useState<FormField[]>([]);
  const [activeField, setActiveField] = useState<FormField | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // --- FUNÇÕES DE EDIÇÃO/DELEÇÃO ---
  const handleUpdateField = (
    id: UniqueIdentifier,
    updatedField: Partial<FormField>
  ) => {
    setDroppedFields((fields) =>
      fields.map((field) =>
        field.id === id ? { ...field, ...updatedField } : field
      )
    );
  };

  const handleDeleteField = (id: UniqueIdentifier) => {
    setDroppedFields((fields) => fields.filter((field) => field.id !== id));
  };

  // --- LÓGICA DO DRAG-AND-DROP ---
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const field =
      camposDeExemplo.find((f) => f.id === active.id) ||
      droppedFields.find((f) => f.id === active.id);
    if (field) {
      setActiveField(field);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    setOverId(over ? over.id : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setOverId(null);

    const activeId = String(active.id);
    const isFromSourceList = camposDeExemplo.some((f) => f.id === activeId);
    const isFromDroppedList = droppedFields.some((f) => f.id === activeId);

    const DROPPABLE_AREA_ID = "droppable-area";
    const TRASH_CAN_ID = "trash-can-area";
    const DROP_END_AREA_ID = "drop-end-area";

    const droppedOutside = !over;
    const droppedOnTrashCan = over?.id === TRASH_CAN_ID;

    if (isFromDroppedList && (droppedOutside || droppedOnTrashCan)) {
      setDroppedFields((fields) =>
        fields.filter((field) => field.id !== active.id)
      );
      setActiveField(null);
      return;
    }

    if (!over) {
      setActiveField(null);
      return;
    }

    const overId = String(over.id);
    const isOverDropEndArea = overId === DROP_END_AREA_ID;

    const oldIndex = droppedFields.findIndex((field) => field.id === activeId);
    const newIndex = droppedFields.findIndex((field) => field.id === overId);

    if (newIndex > -1 && activeId !== overId) {
      if (oldIndex > -1) {
        setDroppedFields((fields) => arrayMove(fields, oldIndex, newIndex));
      } else if (isFromSourceList) {
        const fieldToAdd = camposDeExemplo.find((f) => f.id === activeId);
        if (fieldToAdd) {
          const newField = { ...fieldToAdd, id: `field-${Date.now()}` };
          setDroppedFields((fields) => {
            const newFields = [...fields];
            newFields.splice(newIndex, 0, newField);
            return newFields;
          });
        }
      }
    }

    const isOverDroppableContainer = over.id === DROPPABLE_AREA_ID;
    const isActiveFieldNew = isFromSourceList && !isFromDroppedList;

    if (isActiveFieldNew && (isOverDroppableContainer || isOverDropEndArea)) {
      const fieldToAdd = camposDeExemplo.find((f) => f.id === activeId);
      if (fieldToAdd) {
        const newField = { ...fieldToAdd, id: `field-${Date.now()}` };
        setDroppedFields((fields) => [...fields, newField]);
      }
    }

    setActiveField(null);
  }

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div className="p-4">
        <Box sx={{ width: "100%" }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Listar Formulários" />
            <Tab label="Criar Novo Formulário" />
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            <ListaFormularios />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Typography variant="h5" gutterBottom>
              Construtor de Formulários
            </Typography>
            <Box
              sx={{ display: "flex", gap: 2, p: 2, backgroundColor: "#f4f6f8" }}
            >
              <FormBuilderSidebar
                camposDisponiveis={camposDeExemplo}
                isDragDisabled={false}
              />
              <FormBuilderCanvas
                droppedFields={droppedFields}
                overId={overId}
                updateField={handleUpdateField}
                deleteField={handleDeleteField}
              />
              <FormBuilderPreview droppedFields={droppedFields} />
            </Box>
          </TabPanel>
        </Box>
      </div>

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