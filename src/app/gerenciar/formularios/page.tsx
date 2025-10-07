// src/app/gerenciar/formularios/page.tsx
"use client";
import { useState } from "react";
import { Box, Tabs, Tab, Typography, Card, Paper } from "@mui/material";

// Dnd-kit imports - apenas os componentes e métodos necessários para o contexto central
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  DragOverEvent, 
  UniqueIdentifier
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

// Componentes da página Formulários
import ListaFormularios from "@/components/ui/formularios/ListaFormularios";
import RenderFormField from "@/components/ui/formularios/RenderFormField";
import { FieldConfigurator } from "@/components/ui/formularios/FieldConfigurator";
// Novos Componentes de Coluna
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

// --- Componente Auxiliar para Abas Internas ---
function ConfigTabPanel(props: {
    children?: React.ReactNode;
    index: number;
    value: number;
}) {
    const { children, value, index } = props;
    return (
        <div hidden={value !== index} style={{ height: '100%', overflow: 'auto' }}>
            {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
        </div>
    );
}
// --- Componente Auxiliar TabPanel (mantido na página) ---
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

  // --- 1. GERENCIAMENTO DE ESTADO ---
  const [droppedFields, setDroppedFields] = useState<FormField[]>([]);
  const [activeField, setActiveField] = useState<FormField | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  
  // Estado para rastrear o ID do campo atualmente selecionado para edição
  const [selectedFieldId, setSelectedFieldId] = useState<UniqueIdentifier | null>(null);
  // Controla a aba da coluna de configuração (0: Preview, 1: Editor)
  const [configTab, setConfigTab] = useState(0); 
  
  // NOVO: A flag que desabilita o drag-and-drop. True se a aba "Editar Campo" (configTab === 1) estiver ativa.
  const isDragDisabled = configTab === 1; 

  const selectedField = droppedFields.find(f => f.id === selectedFieldId) || null;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // --- FUNÇÕES DE EDIÇÃO/DELEÇÃO (Usadas pelo FieldConfigurator) ---

  const handleUpdateField = (id: UniqueIdentifier, updatedField: Partial<FormField>) => {
      setDroppedFields(fields => 
          fields.map(field => 
              field.id === id ? { ...field, ...updatedField } : field
          )
      );
  };

  const handleDeleteField = (id: UniqueIdentifier) => {
      setDroppedFields(fields => fields.filter(field => field.id !== id));
      setSelectedFieldId(null); // Limpa a seleção após deletar
      setConfigTab(0); // Volta para a aba de Preview
  };

  const handleFieldSelect = (id: UniqueIdentifier) => {
      // Se clicar no campo, sempre muda para a aba de edição (configTab=1) e seleciona.
      // Isso desabilita o drag-and-drop.
      setSelectedFieldId(id);
      setConfigTab(1); 
  };


  // --- 2. LÓGICA DO DRAG-AND-DROP (Centralizada e Corrigida) ---

  // Quando um item começa a ser arrastado
  function handleDragStart(event: DragStartEvent) {
    if (isDragDisabled) return; // IGNORA se o drag estiver desabilitado

    const { active } = event;
    const field =
      camposDeExemplo.find((f) => f.id === active.id) ||
      droppedFields.find((f) => f.id === active.id);
    if (field) {
      setActiveField(field);
    }
    setSelectedFieldId(null); // Deseleciona o campo ao iniciar o arrasto
    setConfigTab(0); // Volta para a aba de Preview ao arrastar
  }

  // Quando um item é sobrevoado, atualiza o overId para o indicador visual
  function handleDragOver(event: DragOverEvent) {
    if (isDragDisabled) return; // IGNORA se o drag estiver desabilitado

    const { over } = event;
    setOverId(over ? over.id : null);
  }

  // Quando um item é solto
   function handleDragEnd(event: DragEndEvent) {
    if (isDragDisabled) {
        // Limpa estados caso o DndContext tenha iniciado um drag "fantasma"
        setActiveField(null);
        setOverId(null);
        return; 
    }

    const { active, over } = event;

    // Limpa o estado `overId` no final do arrasto
    setOverId(null); 

    const activeId = String(active.id);
    const isFromSourceList = camposDeExemplo.some((f) => f.id === activeId);
    const isFromDroppedList = droppedFields.some((f) => f.id === activeId);

    // Define os IDs da tela
    const DROPPABLE_AREA_ID = "droppable-area";
    const TRASH_CAN_ID = "trash-can-area";
    const DROP_END_AREA_ID = "drop-end-area";

    // A. Lógica para REMOÇÃO/DESCARTE
    const droppedOutside = !over;
    const droppedOnTrashCan = over?.id === TRASH_CAN_ID;
    
    if (isFromDroppedList && (droppedOutside || droppedOnTrashCan)) {
      setDroppedFields((fields) =>
        fields.filter((field) => field.id !== active.id)
      );
      setSelectedFieldId(null); // Limpa seleção
      setConfigTab(0); // Volta para o Preview
      setActiveField(null);
      return;
    }
    
    // Se não houver 'over', sai
    if (!over) {
      setActiveField(null);
      return;
    }

    const overId = String(over.id);
    const isOverDropEndArea = overId === DROP_END_AREA_ID;

    // Lógica para Reordenação (Item interno sobre outro item interno)
    const oldIndex = droppedFields.findIndex((field) => field.id === activeId);
    const newIndex = droppedFields.findIndex((field) => field.id === overId);

    // B. Lógica de MOVIMENTAÇÃO (Reordenação ou Inserção em posição específica)
    
    // Se o alvo for um item que já está no Canvas (newIndex > -1)
    if (newIndex > -1 && activeId !== overId) {
      if (oldIndex > -1) { 
        // B1. REORDENAÇÃO (Item interno sobre outro item interno)
        setDroppedFields((fields) => arrayMove(fields, oldIndex, newIndex));
      } else if (isFromSourceList) {
        // B2. INSERÇÃO (Item NOVO da barra lateral sobre um item interno)
        const fieldToAdd = camposDeExemplo.find((f) => f.id === activeId);
        if (fieldToAdd) {
            // Cria um novo campo com ID único
            const newField = { ...fieldToAdd, id: `field-${Date.now()}` }; 
            setDroppedFields((fields) => {
                const newFields = [...fields];
                // Insere o novo campo na posição newIndex (antes do item "over")
                newFields.splice(newIndex, 0, newField); 
                return newFields;
            });
            setSelectedFieldId(newField.id); // Seleciona o novo campo
            setConfigTab(1); // Manda para a aba de edição
        }
      }
    } 

    // C. Lógica para ADICIONAR um novo item no final (Drop na área "droppable-area" vazia OU drop-end-area)
    const isOverDroppableContainer = over.id === DROPPABLE_AREA_ID;
    const isActiveFieldNew = isFromSourceList && !isFromDroppedList; 

    // Adiciona ao final se for um campo novo e o alvo for a área principal vazia OU a nova área de drop no final
    if (isActiveFieldNew && (isOverDroppableContainer || isOverDropEndArea)) {
      const fieldToAdd = camposDeExemplo.find((f) => f.id === activeId);
      if (fieldToAdd) {
        // Clonar o item e adicionar no final (append)
        const newField = { ...fieldToAdd, id: `field-${Date.now()}` }; 
        setDroppedFields((fields) => [...fields, newField]);
        setSelectedFieldId(newField.id); // Seleciona o novo campo
        setConfigTab(1); // Manda para a aba de edição
      }
    }

    setActiveField(null); // Limpa o estado ativo
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

          {/* TabPanel de Listar Formulários */}
          <TabPanel value={activeTab} index={0}>
            <ListaFormularios />
          </TabPanel>

          {/* TabPanel de Criar Novo Formulário */}
          <TabPanel value={activeTab} index={1}>
            <Typography variant="h5" gutterBottom>
              Construtor de Formulários
            </Typography>
            <Box
              sx={{ display: "flex", gap: 2, p: 2, backgroundColor: "#f4f6f8" }}
            >
              {/* Coluna 1: Ferramentas (20%) */}
              <FormBuilderSidebar 
                camposDisponiveis={camposDeExemplo} 
                isDragDisabled={isDragDisabled} // PASSA PROP DE CONTROLE
              />

              {/* Coluna 2: Montador (45%) */}
              <FormBuilderCanvas 
                droppedFields={droppedFields} 
                overId={overId}
                selectedFieldId={selectedFieldId}
                onFieldSelect={handleFieldSelect}
                isDragDisabled={isDragDisabled} // PASSA PROP DE CONTROLE
              />

              {/* Coluna 3: Configuração/Pré-visualização (35%) */}
              <Paper 
                sx={{ 
                  width: "35%", 
                  position: "sticky", 
                  top: 20, 
                  height: 'calc(100vh - 120px)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                {/* Abas de Configuração/Visualização */}
                <Tabs value={configTab} onChange={(e, newValue) => setConfigTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label="Pré-visualizar" />
                    <Tab label="Editar Campo" disabled={!selectedField} />
                </Tabs>

                {/* Conteúdo da Aba 1: Pré-visualizar */}
                <ConfigTabPanel value={configTab} index={0}>
                  <FormBuilderPreview droppedFields={droppedFields} />
                </ConfigTabPanel>

                {/* Conteúdo da Aba 2: Editar Campo */}
                <ConfigTabPanel value={configTab} index={1}>
                  {selectedField ? (
                    <FieldConfigurator 
                        field={selectedField}
                        updateField={handleUpdateField}
                        deleteField={handleDeleteField}
                        // Fecha o painel e volta para Preview
                        onClose={() => { 
                            setSelectedFieldId(null);
                            setConfigTab(0);
                        }}
                    />
                  ) : (
                      <Box sx={{ p: 2 }}>
                          <Typography color="text.secondary">
                            Clique em um campo na Estrutura do Laudo para editá-lo.
                          </Typography>
                      </Box>
                  )}
                </ConfigTabPanel>

              </Paper>
            </Box>
          </TabPanel>
        </Box>
      </div>

      {/* --- CAMADA DE OVERLAY PARA O CLONE --- */}
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