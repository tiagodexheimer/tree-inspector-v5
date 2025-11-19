// src/hooks/useFormularioBuilder.ts
import { useState, useCallback } from 'react';
import { CampoDef, CampoTipo } from '@/types/formularios';
import { arrayMove } from '@dnd-kit/sortable';

// Objeto que representa o formulário sendo criado (compatível com seu DB)
export interface FormularioDraft {
    nome: string;
    descricao: string;
    tipoDemanda: string;
    campos: CampoDef[];
}

const INITIAL_STATE: FormularioDraft = {
    nome: '',
    descricao: '',
    tipoDemanda: '',
    campos: []
};

export function useFormularioBuilder() {
    // Estado centralizado em um objeto único
    const [formulario, setFormulario] = useState<FormularioDraft>(INITIAL_STATE);

    // Estado dos Diálogos (UI)
    const [dialogs, setDialogs] = useState({
        isSaveOpen: false,
        isSuccessOpen: false
    });

    // --- Actions de Manipulação do Objeto ---

    const setNome = (nome: string) => 
        setFormulario(prev => ({ ...prev, nome }));

    const setTipoDemanda = (tipoDemanda: string) => 
        setFormulario(prev => ({ ...prev, tipoDemanda }));

    const addField = useCallback((tipo: CampoTipo) => {
        const novoId = `campo_${Date.now()}`;
        
        // Factory de campos
        let novoCampo: CampoDef;
        const base = { id: novoId, name: novoId, label: `Novo ${tipo}` };

        switch (tipo) {
            case 'text': novoCampo = { ...base, type: 'text', placeholder: '...' }; break;
            case 'textarea': novoCampo = { ...base, type: 'textarea', rows: 3 }; break;
            case 'checkbox': novoCampo = { ...base, type: 'checkbox', defaultValue: false }; break;
            case 'switch': novoCampo = { ...base, type: 'switch', defaultValue: false }; break;
            case 'select': 
            case 'radio': 
                novoCampo = { 
                    ...base, 
                    type: tipo, 
                    options: [{ id: `opt_${Date.now()}`, value: 'op1', label: 'Opção 1' }] 
                }; 
                break;
            default: return;
        }

        setFormulario(prev => ({
            ...prev,
            campos: [...prev.campos, novoCampo]
        }));
    }, []);

    const updateCampos = useCallback((newCampos: CampoDef[] | ((prev: CampoDef[]) => CampoDef[])) => {
        setFormulario(prev => ({
            ...prev,
            campos: typeof newCampos === 'function' ? newCampos(prev.campos) : newCampos
        }));
    }, []);

    const removeField = useCallback((id: string) => {
        setFormulario(prev => ({
            ...prev,
            campos: prev.campos.filter(c => c.id !== id)
        }));
    }, []);

    // --- Função de Reordenação ---
    const moveFields = useCallback((oldIndex: number, newIndex: number) => {
        setFormulario(prev => ({
            ...prev,
            campos: arrayMove(prev.campos, oldIndex, newIndex)
        }));
    }, []);

    // --- Lógica de Salvar ---
    const openSaveDialog = () => setDialogs(prev => ({ ...prev, isSaveOpen: true }));
    const closeSaveDialog = () => setDialogs(prev => ({ ...prev, isSaveOpen: false }));

    const confirmSave = async () => {
        if (!formulario.nome.trim() || !formulario.tipoDemanda) {
            throw new Error('Preencha os campos obrigatórios.');
        }
        console.log("Salvando objeto completo:", formulario);
        setDialogs({ isSaveOpen: false, isSuccessOpen: true });
    };

    // CORREÇÃO AQUI: Renomeado de 'resetForm' para 'resetAndClose'
    const resetAndClose = () => {
        setFormulario(INITIAL_STATE);
        setDialogs(prev => ({ ...prev, isSuccessOpen: false }));
    };

    return {
        // O Objeto Completo
        formulario, 
        // Propriedades individuais para conveniência
        campos: formulario.campos,
        // Estados de UI
        ...dialogs,
        // Ações
        setNome,
        setTipoDemanda,
        setCampos: updateCampos,
        addField,
        removeField,
        moveFields, 
        openSaveDialog,
        closeSaveDialog,
        confirmSave,
        resetAndClose // Agora a variável existe e corresponde à função acima
    };
}