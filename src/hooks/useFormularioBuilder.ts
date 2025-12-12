// src/hooks/useFormularioBuilder.ts
import { useState, useCallback } from 'react';
import { CampoDef, CampoTipo } from '@/types/formularios';
import { arrayMove } from '@dnd-kit/sortable';

export interface FormularioDraft {
    id?: number; // [NOVO] ID opcional para edição
    nome: string;
    descricao: string;
    idTipoDemanda: number | ''; 
    campos: CampoDef[];
}

const INITIAL_STATE: FormularioDraft = {
    nome: '',
    descricao: '',
    idTipoDemanda: '', 
    campos: []
};

export function useFormularioBuilder() {
    const [formulario, setFormulario] = useState<FormularioDraft>(INITIAL_STATE);
    const [dialogs, setDialogs] = useState({ isSaveOpen: false, isSuccessOpen: false });
    const [isLoading, setIsLoading] = useState(false); 
    const [isSaving, setIsSaving] = useState(false); // [FIX 1] Adiciona o estado isSaving

    // ... (Setters mantidos)
    const setNome = (nome: string) => setFormulario(prev => ({ ...prev, nome }));
    const setDescricao = (descricao: string) => setFormulario(prev => ({ ...prev, descricao }));
    const setIdTipoDemanda = (id: number) => setFormulario(prev => ({ ...prev, idTipoDemanda: id }));

    const removeField = useCallback((id: string) => {
        setFormulario(prev => ({ ...prev, campos: prev.campos.filter(c => c.id !== id) }));
    }, []);

    const updateCampos = useCallback((newCampos: CampoDef[] | ((prev: CampoDef[]) => CampoDef[])) => {
        setFormulario(prev => ({ ...prev, campos: typeof newCampos === 'function' ? newCampos(prev.campos) : newCampos }));
    }, []);
    
    const moveFields = useCallback((oldIndex: number, newIndex: number) => {
        setFormulario(prev => ({ ...prev, campos: arrayMove(prev.campos, oldIndex, newIndex) }));
    }, []);
    
    const addField = useCallback((tipo: CampoTipo) => {
        const novoId = `campo_${Date.now()}`;
        const base = { id: novoId, name: novoId, label: `Novo ${tipo}` };
        let novoCampo: CampoDef;
        switch (tipo) {
            case 'text': novoCampo = { ...base, type: 'text', placeholder: '...' }; break;
            case 'textarea': novoCampo = { ...base, type: 'textarea', rows: 3 }; break;
            case 'checkbox': novoCampo = { ...base, type: 'checkbox', defaultValue: false }; break;
            case 'switch': novoCampo = { ...base, type: 'switch', defaultValue: false }; break;
            case 'select': case 'radio': novoCampo = { ...base, type: tipo, options: [{ id: `opt_${Date.now()}`, value: 'op1', label: 'Opção 1' }] }; break;
            default: return;
        }
        setFormulario(prev => ({ ...prev, campos: [...prev.campos, novoCampo] }));
    }, []);


    // Função para carregar dados de um formulário existente
    const loadForm = useCallback(async (id: number) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/gerenciar/formularios/${id}`);
            if (!res.ok) throw new Error("Erro ao buscar formulário");
            
            const data = await res.json();
            
            // Popula o estado com os dados do banco
            setFormulario({
                id: data.id,
                nome: data.nome,
                descricao: data.descricao || '',
                // NOTA: o backend precisa retornar id_tipo_demanda se houver
                idTipoDemanda: data.id_tipo_demanda || '',
                // NOTA: definicao_campos deve vir como Array (objeto JSONB resolvido)
                campos: data.definicao_campos || [] 
            });
        } catch (error) {
            console.error(error);
            alert("Erro ao carregar dados do formulário.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Lógica de Salvar (POST ou PUT)
    const confirmSave = async () => {
        if (!formulario.nome.trim() || !formulario.idTipoDemanda) {
            alert('Preencha o nome e selecione o tipo de demanda.');
            return;
        }
        
        setIsSaving(true); // [FIX 2] Inicia o estado de salvamento

        const isEditing = !!formulario.id;
        const url = isEditing ? `/api/gerenciar/formularios/${formulario.id}` : '/api/gerenciar/formularios';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: formulario.nome,
                    descricao: formulario.descricao,
                    definicao_campos: formulario.campos,
                    id_tipo_demanda: formulario.idTipoDemanda 
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                // Lançar o erro do backend (ex: limite atingido)
                throw new Error(result.message || 'Erro ao salvar formulário');
            }
            
            setDialogs({ isSaveOpen: false, isSuccessOpen: true });
        } catch (error) {
            console.error(error);
            alert(`Erro ao salvar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            throw error;
        } finally {
            setIsSaving(false); // [FIX 3] Finaliza o estado de salvamento
        }
    };

    const resetAndClose = () => {
        setFormulario(INITIAL_STATE);
        setDialogs(prev => ({ ...prev, isSuccessOpen: false }));
    };

    const openSaveDialog = () => setDialogs(prev => ({ ...prev, isSaveOpen: true }));
    const closeSaveDialog = () => setDialogs(prev => ({ ...prev, isSaveOpen: false }));

    return {
        formulario, 
        campos: formulario.campos, 
        ...dialogs, 
        isLoading,
        isSaving, // [FIX 4] Retorna isSaving
        setNome, 
        setDescricao, 
        setIdTipoDemanda, 
        setCampos: updateCampos,
        addField, 
        removeField,
        moveFields, 
        openSaveDialog, 
        closeSaveDialog, 
        confirmSave, 
        resetAndClose,
        loadForm
    };
}