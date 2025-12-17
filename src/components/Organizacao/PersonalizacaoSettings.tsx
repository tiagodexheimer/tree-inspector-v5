
"use client";

import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Paper,
    Button,
    Grid,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Chip,
    Alert,
    CircularProgress,
    Tabs,
    Tab
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import LockIcon from "@mui/icons-material/Lock";
import StarIcon from "@mui/icons-material/Star";

interface StatusItem {
    id: number;
    nome: string;
    cor: string;
    is_custom: boolean;
    is_default_global: boolean;
}

interface TipoItem {
    id: number;
    nome: string;
    is_custom: boolean;
    is_default_global: boolean;
    id_formulario?: number;
}

export function PersonalizacaoSettings() {
    const [loading, setLoading] = useState(true);
    const [usesCustomSchema, setUsesCustomSchema] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    // Data
    const [statuses, setStatuses] = useState<StatusItem[]>([]);
    const [tipos, setTipos] = useState<TipoItem[]>([]);

    // Dialogs
    const [openStatusDialog, setOpenStatusDialog] = useState(false);
    const [editingStatus, setEditingStatus] = useState<StatusItem | null>(null);
    const [statusName, setStatusName] = useState("");
    const [statusColor, setStatusColor] = useState("#000000");

    const [openTipoDialog, setOpenTipoDialog] = useState(false);
    const [editingTipo, setEditingTipo] = useState<TipoItem | null>(null);
    const [tipoName, setTipoName] = useState("");

    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/gerenciar/personalizacao/activate");
            if (res.ok) {
                const data = await res.json();
                setUsesCustomSchema(data.usesCustomSchema);
                if (data.usesCustomSchema) {
                    fetchData();
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        try {
            const [resStatus, resTipos] = await Promise.all([
                fetch("/api/gerenciar/personalizacao/status"),
                fetch("/api/gerenciar/personalizacao/tipos"),
            ]);
            if (resStatus.ok) setStatuses(await resStatus.json());
            if (resTipos.ok) setTipos(await resTipos.json());
        } catch (e) {
            console.error(e);
        }
    };

    const handleActivate = async () => {
        if (!confirm("Tem certeza? Isso irá copiar o padrão atual para sua conta e ativará o modo de edição.")) return;

        setLoading(true);
        try {
            const res = await fetch("/api/gerenciar/personalizacao/activate", {
                method: "POST",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Erro ao ativar.");

            setSuccessMsg(data.message);
            setUsesCustomSchema(true);
            fetchData();
        } catch (e: any) {
            setErrorMsg(e.message);
        } finally {
            setLoading(false);
        }
    };

    // --- STATUS HANDLERS ---
    const handleSaveStatus = async () => {
        const payload = { nome: statusName, cor: statusColor };
        try {
            let res;
            if (editingStatus) {
                res = await fetch("/api/gerenciar/personalizacao/status", {
                    method: "PUT",
                    body: JSON.stringify({ id: editingStatus.id, ...payload })
                });
            } else {
                res = await fetch("/api/gerenciar/personalizacao/status", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
            }

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message);
            }

            setOpenStatusDialog(false);
            fetchData();
            setSuccessMsg("Status salvo com sucesso!");
        } catch (e: any) {
            setErrorMsg(e.message);
        }
    };

    const handleDeleteStatus = async (id: number) => {
        if (!confirm("Deseja realmente excluir este status?")) return;
        try {
            const res = await fetch(`/api/gerenciar/personalizacao/status?id=${id}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message);
            }
            fetchData();
        } catch (e: any) {
            setErrorMsg(e.message);
        }
    };

    // --- TIPOS HANDLERS ---
    const handleSaveTipo = async () => {
        const payload = { nome: tipoName };
        try {
            let res;
            if (editingTipo) {
                res = await fetch("/api/gerenciar/personalizacao/tipos", {
                    method: "PUT",
                    body: JSON.stringify({ id: editingTipo.id, ...payload })
                });
            } else {
                res = await fetch("/api/gerenciar/personalizacao/tipos", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
            }

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message);
            }

            setOpenTipoDialog(false);
            fetchData();
            setSuccessMsg("Tipo salvo com sucesso!");
        } catch (e: any) {
            setErrorMsg(e.message);
        }
    };

    const handleDeleteTipo = async (id: number) => {
        if (!confirm("Deseja realmente excluir este tipo de demanda?")) return;
        try {
            const res = await fetch(`/api/gerenciar/personalizacao/tipos?id=${id}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message);
            }
            fetchData();
        } catch (e: any) {
            setErrorMsg(e.message);
        }
    };


    if (loading && !statuses.length) return <Box p={4}><CircularProgress /></Box>;

    return (
        <Box>
            <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
                Personalização Avançada (Pro)
            </Typography>

            {errorMsg && <Alert severity="error" onClose={() => setErrorMsg("")} sx={{ mb: 2 }}>{errorMsg}</Alert>}
            {successMsg && <Alert severity="success" onClose={() => setSuccessMsg("")} sx={{ mb: 2 }}>{successMsg}</Alert>}

            {!usesCustomSchema ? (
                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f8f9fa' }}>
                    <StarIcon sx={{ fontSize: 48, color: 'gold', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>Ativar Modo de Personalização</Typography>
                    <Typography color="textSecondary" paragraph sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
                        Clone os status e tipos padrão para sua organização e personalize-os livremente.
                    </Typography>
                    <Button variant="contained" color="primary" onClick={handleActivate}>
                        Ativar Agora
                    </Button>
                </Paper>
            ) : (
                <Box>
                    <Paper sx={{ mb: 3 }}>
                        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                            <Tab label="Status de Demandas" />
                            <Tab label="Tipos de Demanda" />
                        </Tabs>
                    </Paper>

                    {activeTab === 0 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={2}>
                                <Typography variant="h6">Meus Status</Typography>
                                <Button
                                    startIcon={<AddIcon />}
                                    variant="contained"
                                    onClick={() => { setEditingStatus(null); setStatusName(""); setStatusColor("#000000"); setOpenStatusDialog(true); }}
                                >
                                    Novo Status
                                </Button>
                            </Box>
                            <Grid container spacing={2}>
                                {statuses.map(status => (
                                    <Grid size={{ xs: 12, md: 6, lg: 4 }} key={status.id}>
                                        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', borderLeft: `6px solid ${status.cor}` }}>
                                            <Box flexGrow={1}>
                                                <Typography variant="subtitle1" fontWeight="bold">
                                                    {status.nome}
                                                    {status.is_default_global && <Chip size="small" label="Global" sx={{ ml: 1 }} />}
                                                </Typography>
                                            </Box>
                                            <IconButton onClick={() => {
                                                setEditingStatus(status);
                                                setStatusName(status.nome);
                                                setStatusColor(status.cor);
                                                setOpenStatusDialog(true);
                                            }}>
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton color="error" onClick={() => handleDeleteStatus(status.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}

                    {activeTab === 1 && (
                        <Box>
                            <Box display="flex" justifyContent="space-between" mb={2}>
                                <Typography variant="h6">Meus Tipos de Demanda</Typography>
                                <Button
                                    startIcon={<AddIcon />}
                                    variant="contained"
                                    onClick={() => { setEditingTipo(null); setTipoName(""); setOpenTipoDialog(true); }}
                                >
                                    Novo Tipo
                                </Button>
                            </Box>
                            <Grid container spacing={2}>
                                {tipos.map(tipo => (
                                    <Grid size={{ xs: 12, md: 6, lg: 4 }} key={tipo.id}>
                                        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
                                            <Box flexGrow={1}>
                                                <Typography variant="subtitle1" fontWeight="bold">
                                                    {tipo.nome}
                                                </Typography>
                                            </Box>
                                            <IconButton onClick={() => {
                                                setEditingTipo(tipo);
                                                setTipoName(tipo.nome);
                                                setOpenTipoDialog(true);
                                            }}>
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton color="error" onClick={() => handleDeleteTipo(tipo.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}
                </Box>
            )}

            {/* Dialog Status */}
            <Dialog open={openStatusDialog} onClose={() => setOpenStatusDialog(false)}>
                <DialogTitle>{editingStatus ? "Editar Status" : "Novo Status"}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Nome"
                        fullWidth
                        value={statusName}
                        onChange={e => setStatusName(e.target.value)}
                    />
                    <Box mt={2} display="flex" alignItems="center" gap={2}>
                        <Typography>Cor:</Typography>
                        <input type="color" value={statusColor} onChange={e => setStatusColor(e.target.value)} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenStatusDialog(false)}>Cancelar</Button>
                    <Button onClick={handleSaveStatus} variant="contained">Salvar</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Tipo */}
            <Dialog open={openTipoDialog} onClose={() => setOpenTipoDialog(false)}>
                <DialogTitle>{editingTipo ? "Editar Tipo" : "Novo Tipo"}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Nome"
                        fullWidth
                        value={tipoName}
                        onChange={e => setTipoName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenTipoDialog(false)}>Cancelar</Button>
                    <Button onClick={handleSaveTipo} variant="contained">Salvar</Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
}
