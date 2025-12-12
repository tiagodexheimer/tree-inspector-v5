// src/components/ui/formularios/CriarFormularios.tsx
'use client';
import React, { useEffect, useState, useCallback } from "react";
import {
    Box, Button, Typography, Divider,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, FormControl, InputLabel, Select, MenuItem, List, ListItem, ListItemText, CircularProgress, Alert
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PreVisualizarFormularios from "./PreVisualizarFormularios";
import EditorFormularios from "./EditorFormularios";
import { FerramentasPainel } from "./FerramentasPainel";
import { useFormularioBuilder } from "@/hooks/useFormularioBuilder";

// [FIX 1] Importa hooks e utilitários de permissão
import { useSession } from 'next-auth/react';
import { UserRole, getLimitsByRole } from '@/types/auth-types';


interface Props {
    formIdToEdit?: number | null;
    onSuccess?: () => void;
}

export default function CriarFormularios({ formIdToEdit, onSuccess }: Props) {
    const { data: session } = useSession();

    const {
        formulario, isSaveOpen, isSuccessOpen, isLoading, isSaving,
        setNome, setDescricao, setIdTipoDemanda, setCampos, addField, moveFields,
        openSaveDialog: openSaveDialogOriginal, closeSaveDialog, confirmSave, resetAndClose,
        loadForm
    } = useFormularioBuilder();

    // [FIX 2] Estados para controle de limite e contagem
    const userRole = session?.user?.role as UserRole || 'free';
    const limits = getLimitsByRole(userRole);
    const maxFormularios = limits.MAX_FORMULARIOS;

    const [tiposList, setTiposList] = useState<{ id: number, nome: string }[]>([]);
    const [currentFormCount, setCurrentFormCount] = useState<number>(0);
    const [isCountLoading, setIsCountLoading] = useState<boolean>(true);

    // Variáveis de permissão calculadas
    const isCreationMode = !formIdToEdit;
    const isCreationModeOverLimit = isCreationMode && currentFormCount >= maxFormularios;
    const canSave = formulario.campos.length > 0 && !isCreationModeOverLimit;


    // --- Carrega Tipos de Demanda e Contagem Atual ---
    useEffect(() => {
        if (!session) return;

        const fetchData = async () => {
            setIsCountLoading(true);

            // 1. Fetch Tipos de Demanda
            fetch('/api/demandas-tipos').then(res => res.json()).then(setTiposList).catch(console.error);

            // 2. Fetch Contagem Atual de Formulários (usando o endpoint GET)
            try {
                const countResponse = await fetch('/api/gerenciar/formularios');
                if (countResponse.ok) {
                    const data = await countResponse.json();
                    // A rota GET retorna o array de FormulariosPersistence[]
                    setCurrentFormCount(data.length);
                }
            } catch (err) {
                console.error("Erro ao carregar contagem de formulários.", err);
            } finally {
                setIsCountLoading(false);
            }
        };

        fetchData();
    }, [session]);


    // Carrega dados se estiver em modo de edição
    useEffect(() => {
        if (formIdToEdit) {
            loadForm(formIdToEdit);
        }
    }, [formIdToEdit, loadForm]);


    // [FIX 3] Handler MODIFICADO para aplicar o bloqueio
    const openSaveDialog = () => {
        // 1. Bloqueio para CRIAÇÃO
        if (isCreationModeOverLimit) {
            // Não abre o modal, o aviso já está na tela
            return;
        }

        // 2. Se não houver bloqueio, abre o modal original
        openSaveDialogOriginal();
    };

    // Handler ao fechar o modal de sucesso
    const handleFinish = () => {
        resetAndClose();
        if (onSuccess) onSuccess();
    };

    if (isLoading || isCountLoading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;


    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight="bold">
                    {formIdToEdit ? `Editar Formulário #${formIdToEdit}` : 'Criar Novo Formulário'}
                </Typography>

                {/* [FIX 4] Botão de Salvar: Bloqueado se não puder salvar ou estourar limite */}
                <Button
                    variant="contained" color="primary" onClick={openSaveDialog}
                    disabled={!canSave || isCreationModeOverLimit}
                    sx={{ bgcolor: '#257e1a', '&:hover': { bgcolor: '#1a5912' } }}
                >
                    {formIdToEdit ? 'Salvar Alterações' : 'Salvar Formulário'}
                </Button>
            </Box>

            {/* [FIX 5] Exibe o aviso de limite na tela principal */}
            {isCreationModeOverLimit && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Limite de {maxFormularios} formulário(s) atingido para o Plano {userRole.toUpperCase()}.
                    Esta organização não pode criar mais formulários.
                </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'flex-start' }}>
                <FerramentasPainel onAddField={addField} />
                <Box sx={{ flex: 1, minWidth: 300 }}>
                    <EditorFormularios campos={formulario.campos} setCampos={setCampos} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 300 }}>
                    <PreVisualizarFormularios campos={formulario.campos} onReorder={moveFields} />
                </Box>
            </Box>

            {/* Modal de Revisão (Mantido) */}
            <Dialog open={isSaveOpen} onClose={closeSaveDialog} fullWidth maxWidth="sm">
                <DialogTitle>Revisar e Salvar</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <TextField
                            label="Nome do Formulário" fullWidth required
                            value={formulario.nome} onChange={(e) => setNome(e.target.value)}
                        />
                        <TextField
                            label="Descrição" fullWidth multiline rows={3}
                            value={formulario.descricao} onChange={(e) => setDescricao(e.target.value)}
                        />
                        <FormControl fullWidth required>
                            <InputLabel>Tipo de Demanda Vinculada</InputLabel>
                            <Select
                                value={formulario.idTipoDemanda} label="Tipo de Demanda Vinculada"
                                onChange={(e) => setIdTipoDemanda(Number(e.target.value))}
                            >
                                {tiposList.map(t => <MenuItem key={t.id} value={t.id}>{t.nome}</MenuItem>)}
                            </Select>
                        </FormControl>
                        {/* ... Lista de resumo mantida ... */}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeSaveDialog} color="inherit" disabled={isSaving}>Voltar</Button>
                    <Button onClick={confirmSave} variant="contained" color="primary" disabled={isSaving}>
                        {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Confirmar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal de Sucesso (Mantido) */}
            <Dialog open={isSuccessOpen} onClose={handleFinish}>
                <DialogTitle sx={{ textAlign: 'center', color: 'green' }}>Sucesso!</DialogTitle>
                <DialogContent sx={{ textAlign: 'center' }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 60, color: 'green', mb: 2 }} />
                    <Typography>Formulário salvo com sucesso!</Typography>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center' }}>
                    <Button onClick={handleFinish} variant="outlined">Voltar para Lista</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}