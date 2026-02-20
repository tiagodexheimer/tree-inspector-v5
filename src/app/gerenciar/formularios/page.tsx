// src/app/gerenciar/formularios/page.tsx
"use client";
import React, { useState } from 'react';
import {
    Tabs, Tab, Typography, Box, Dialog, DialogTitle, DialogContent,
    DialogContentText, DialogActions, Button, CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import { usePageTitle } from '@/contexts/PageTitleContext';

import CriarFormularios from '@/components/ui/formularios/CriarFormularios';
import VisualizarFormularios from '@/components/ui/formularios/VisualizarFormularios';

// ... (TabPanel e a11yProps mantidos iguais)
function TabPanel(props: any) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`vertical-tabpanel-${index}`} aria-labelledby={`vertical-tab-${index}`} style={{ width: '100%', display: value === index ? 'block' : 'none' }} {...other}>
            {value === index && (<Box sx={{ p: 3 }}><Typography component="div">{children}</Typography></Box>)}
        </div>
    );
}
function a11yProps(index: number) { return { id: `vertical-tab-${index}`, 'aria-controls': `vertical-tabpanel-${index}` }; }

export default function FormulariosPage() {
    usePageTitle("Gerenciar Formulários", <DescriptionIcon />);
    const [tabIndex, setTabIndex] = useState(0);
    const [editingFormId, setEditingFormId] = useState<number | null>(null);

    // Estado para controlar o refresh da lista
    const [refreshListKey, setRefreshListKey] = useState(0);

    // Estados para Deleção
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [formToDeleteId, setFormToDeleteId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
        if (newValue === 0) {
            setEditingFormId(null);
            // Opcional: atualizar lista ao entrar na aba
            setRefreshListKey(prev => prev + 1);
        }
    };

    const handleEditForm = (id: number) => {
        setEditingFormId(id);
        setTabIndex(1);
    };

    const handleSuccessSave = () => {
        setEditingFormId(null);
        setTabIndex(0);
        setRefreshListKey(prev => prev + 1); // Atualiza a lista ao voltar
    };

    // --- Lógica de Deleção ---

    const handleDeleteClick = (id: number) => {
        setFormToDeleteId(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!formToDeleteId) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/gerenciar/formularios/${formToDeleteId}`, { method: 'DELETE' });
            const data = await res.json();

            if (!res.ok) {
                // Mostra erro (ex: conflito de vínculo)
                alert(data.message || "Erro ao deletar.");
            } else {
                // Sucesso
                setRefreshListKey(prev => prev + 1); // Recarrega lista
            }
        } catch (error) {
            console.error(error);
            alert("Erro de conexão ao tentar deletar.");
        } finally {
            setIsDeleting(false);
            setDeleteModalOpen(false);
            setFormToDeleteId(null);
        }
    };

    return (
        <div className='p-4'>
            <Box sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex', minHeight: '80vh', padding: 2 }}>
                <Tabs orientation="vertical" variant="scrollable" value={tabIndex} onChange={handleChange} sx={{ borderRight: 1, borderColor: 'divider', minWidth: 200 }}>
                    <Tab label="Listar formulários" {...a11yProps(0)} />
                    <Tab label={editingFormId ? "Editar formulário" : "Criar formulário"} {...a11yProps(1)} />
                    <Tab label="Configurações" {...a11yProps(2)} />
                </Tabs>

                <TabPanel value={tabIndex} index={0}>
                    <VisualizarFormularios
                        onEdit={handleEditForm}
                        onDelete={handleDeleteClick} // Passa o handler
                        refreshTrigger={refreshListKey} // Passa o trigger
                        onAdd={function (): void {
                            throw new Error('Function not implemented.');
                        }} />
                </TabPanel>

                <TabPanel value={tabIndex} index={1}>
                    <CriarFormularios
                        formIdToEdit={editingFormId}
                        onSuccess={handleSuccessSave}
                        key={editingFormId || 'new'}
                    />
                </TabPanel>

                <TabPanel value={tabIndex} index={2}>
                    <Typography>Em breve.</Typography>
                </TabPanel>
            </Box>

            {/* Modal de Confirmação de Exclusão */}
            <Dialog open={deleteModalOpen} onClose={() => !isDeleting && setDeleteModalOpen(false)}>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Tem certeza que deseja excluir este formulário? Esta ação não pode ser desfeita.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteModalOpen(false)} disabled={isDeleting} color="inherit">Cancelar</Button>
                    <Button onClick={confirmDelete} disabled={isDeleting} color="error" variant="contained" autoFocus startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}>
                        {isDeleting ? "Excluindo..." : "Excluir"}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}