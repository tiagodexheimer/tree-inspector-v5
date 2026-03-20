// src/components/ui/demandas/ImportarPdfModal.tsx
'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
    CircularProgress, Alert, LinearProgress, IconButton, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, Select, MenuItem, FormControl, InputLabel, Checkbox
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';

interface TipoDemandaOption {
    id: number;
    nome: string;
}

interface ParsedDemanda {
    id: string; // ID temporário para o frontend
    fileName: string;
    protocolo: string;
    nome_solicitante: string;
    cep: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    tipo_demanda: string;
    descricao: string;
    status: 'parsed' | 'error' | 'creating' | 'created' | 'create_error';
    errorMessage?: string;
    selected: boolean;
}

interface ImportarPdfModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    availableTipos: TipoDemandaOption[];
}

type Step = 'upload' | 'review' | 'creating' | 'done';

export default function ImportarPdfModal({ open, onClose, onSuccess, availableTipos }: ImportarPdfModalProps) {
    const [step, setStep] = useState<Step>('upload');
    const [parsedDemandas, setParsedDemandas] = useState<ParsedDemanda[]>([]);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, fileName: '' });
    const [isUploading, setIsUploading] = useState(false);
    const [createProgress, setCreateProgress] = useState({ current: 0, total: 0 });
    const [createResults, setCreateResults] = useState({ success: 0, errors: 0 });
    const [globalError, setGlobalError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetState = () => {
        setStep('upload');
        setParsedDemandas([]);
        setUploadProgress({ current: 0, total: 0, fileName: '' });
        setIsUploading(false);
        setCreateProgress({ current: 0, total: 0 });
        setCreateResults({ success: 0, errors: 0 });
        setGlobalError(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    // --- Upload & Parse PDFs ---
    const handleFilesSelected = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
        if (pdfFiles.length === 0) {
            setGlobalError('Nenhum arquivo PDF selecionado.');
            return;
        }

        setIsUploading(true);
        setGlobalError(null);
        const newDemandas: ParsedDemanda[] = [...parsedDemandas];

        for (let i = 0; i < pdfFiles.length; i++) {
            const file = pdfFiles[i];
            setUploadProgress({ current: i + 1, total: pdfFiles.length, fileName: file.name });

            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/demandas/parse-pdf', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `Erro ${response.status}`);
                }

                const data = await response.json();

                newDemandas.push({
                    id: `pdf_${Date.now()}_${i}`,
                    fileName: file.name,
                    protocolo: data.protocolo || '',
                    nome_solicitante: data.nome_solicitante || '',
                    cep: data.cep || '',
                    logradouro: data.logradouro || '',
                    numero: data.numero || '',
                    bairro: data.bairro || '',
                    cidade: data.cidade || '',
                    uf: data.uf || '',
                    tipo_demanda: data.tipo_demanda || '',
                    descricao: data.descricao || '',
                    status: 'parsed',
                    selected: true,
                });
            } catch (err) {
                newDemandas.push({
                    id: `pdf_err_${Date.now()}_${i}`,
                    fileName: file.name,
                    protocolo: '', nome_solicitante: '', cep: '', logradouro: '',
                    numero: '', bairro: '', cidade: '', uf: '',
                    tipo_demanda: '', descricao: '',
                    status: 'error',
                    errorMessage: err instanceof Error ? err.message : 'Erro desconhecido',
                    selected: false,
                });
            }
        }

        setParsedDemandas(newDemandas);
        setIsUploading(false);
        setStep('review');
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFilesSelected(e.target.files);
        if (e.target) e.target.value = '';
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        handleFilesSelected(e.dataTransfer.files);
    }, [parsedDemandas]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // --- Edit parsed data ---
    const updateField = (id: string, field: keyof ParsedDemanda, value: string) => {
        setParsedDemandas(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
    };

    const toggleSelect = (id: string) => {
        setParsedDemandas(prev => prev.map(d => d.id === id ? { ...d, selected: !d.selected } : d));
    };

    const toggleSelectAll = () => {
        const selectableItems = parsedDemandas.filter(d => d.status !== 'error');
        const allSelected = selectableItems.every(d => d.selected);
        setParsedDemandas(prev => prev.map(d => d.status === 'error' ? d : { ...d, selected: !allSelected }));
    };

    const removeDemanda = (id: string) => {
        setParsedDemandas(prev => prev.filter(d => d.id !== id));
    };

    // --- Create demands ---
    const handleCreateAll = async () => {
        const toCreate = parsedDemandas.filter(d => d.selected && d.status === 'parsed');
        if (toCreate.length === 0) return;

        setStep('creating');
        setCreateProgress({ current: 0, total: toCreate.length });
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < toCreate.length; i++) {
            const demanda = toCreate[i];
            setCreateProgress({ current: i + 1, total: toCreate.length });

            // Mark as creating
            setParsedDemandas(prev => prev.map(d => d.id === demanda.id ? { ...d, status: 'creating' as const } : d));

            try {
                const bodyPayload = {
                    protocolo: demanda.protocolo,
                    nome_solicitante: demanda.nome_solicitante,
                    cep: demanda.cep,
                    logradouro: demanda.logradouro,
                    numero: demanda.numero,
                    bairro: demanda.bairro,
                    cidade: demanda.cidade,
                    uf: demanda.uf,
                    tipo_demanda: demanda.tipo_demanda,
                    descricao: demanda.descricao,
                    coordinates: null, // Geocoding will happen server-side or later
                };

                const response = await fetch('/api/demandas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyPayload),
                });

                if (!response.ok) {
                    const result = await response.json().catch(() => ({}));
                    throw new Error(result.message || result.error || `Erro ${response.status}`);
                }

                setParsedDemandas(prev => prev.map(d =>
                    d.id === demanda.id ? { ...d, status: 'created' as const } : d
                ));
                successCount++;
            } catch (err) {
                setParsedDemandas(prev => prev.map(d =>
                    d.id === demanda.id ? {
                        ...d,
                        status: 'create_error' as const,
                        errorMessage: err instanceof Error ? err.message : 'Erro desconhecido'
                    } : d
                ));
                errorCount++;
            }
        }

        setCreateResults({ success: successCount, errors: errorCount });
        setStep('done');
        if (successCount > 0 && onSuccess) onSuccess();
    };

    const selectedCount = parsedDemandas.filter(d => d.selected && d.status === 'parsed').length;
    const parsedCount = parsedDemandas.filter(d => d.status === 'parsed').length;
    const errorCount = parsedDemandas.filter(d => d.status === 'error').length;

    // --- Render ---
    return (
        <Dialog
            open={open}
            onClose={step === 'creating' ? undefined : handleClose}
            fullWidth
            maxWidth="xl"
            PaperProps={{ sx: { minHeight: '70vh' } }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PictureAsPdfIcon color="error" />
                    Importar Demandas via PDF
                </Box>
                {step !== 'creating' && (
                    <IconButton onClick={handleClose} size="small">
                        <CloseIcon />
                    </IconButton>
                )}
            </DialogTitle>

            <DialogContent dividers>
                {globalError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setGlobalError(null)}>{globalError}</Alert>}

                {/* STEP 1: Upload */}
                {(step === 'upload' || step === 'review') && (
                    <Box
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        sx={{
                            border: '2px dashed',
                            borderColor: isUploading ? 'primary.main' : '#ccc',
                            borderRadius: 2,
                            p: 3,
                            mb: step === 'review' ? 3 : 0,
                            textAlign: 'center',
                            bgcolor: isUploading ? 'action.hover' : '#fafafa',
                            transition: 'all 0.2s',
                            cursor: isUploading ? 'wait' : 'pointer',
                            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
                        }}
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            hidden
                            multiple
                            accept=".pdf"
                            onChange={handleFileInputChange}
                        />
                        {isUploading ? (
                            <Box>
                                <CircularProgress size={40} sx={{ mb: 1 }} />
                                <Typography variant="body1" fontWeight="bold">
                                    Analisando PDF {uploadProgress.current}/{uploadProgress.total}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {uploadProgress.fileName}
                                </Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={(uploadProgress.current / uploadProgress.total) * 100}
                                    sx={{ mt: 2, mx: 'auto', maxWidth: 400 }}
                                />
                            </Box>
                        ) : (
                            <Box>
                                <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                <Typography variant="body1" fontWeight="bold">
                                    {step === 'review' ? 'Adicionar mais PDFs' : 'Arraste os PDFs aqui ou clique para selecionar'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Suporta múltiplos arquivos PDF simultaneamente
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}

                {/* STEP 2: Review Table */}
                {(step === 'review' || step === 'done') && parsedDemandas.length > 0 && (
                    <Box>
                        {step === 'review' && (
                            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                                <Chip label={`${parsedCount} parseados`} color="success" size="small" icon={<CheckCircleIcon />} />
                                {errorCount > 0 && (
                                    <Chip label={`${errorCount} com erro`} color="error" size="small" icon={<ErrorIcon />} />
                                )}
                                <Chip label={`${selectedCount} selecionados para criar`} color="primary" size="small" variant="outlined" />
                            </Box>
                        )}

                        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: step === 'review' ? '50vh' : '60vh' }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        {step === 'review' && (
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    checked={parsedCount > 0 && parsedDemandas.filter(d => d.status !== 'error').every(d => d.selected)}
                                                    indeterminate={selectedCount > 0 && selectedCount < parsedCount}
                                                    onChange={toggleSelectAll}
                                                    size="small"
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell sx={{ fontWeight: 'bold', minWidth: 50 }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>Arquivo</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>Protocolo</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', minWidth: 140 }}>Solicitante</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>CEP</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', minWidth: 160 }}>Logradouro</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', minWidth: 60 }}>Nº</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', minWidth: 110 }}>Bairro</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>Cidade</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', minWidth: 50 }}>UF</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>Tipo</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>Descrição</TableCell>
                                        {step === 'review' && <TableCell sx={{ fontWeight: 'bold', minWidth: 50 }}></TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {parsedDemandas.map((demanda) => (
                                        <TableRow
                                            key={demanda.id}
                                            sx={{
                                                bgcolor: demanda.status === 'error' ? 'error.light'
                                                    : demanda.status === 'created' ? 'success.light'
                                                    : demanda.status === 'create_error' ? 'warning.light'
                                                    : demanda.status === 'creating' ? 'action.hover'
                                                    : 'inherit',
                                                opacity: demanda.status === 'error' ? 0.7 : 1,
                                            }}
                                        >
                                            {step === 'review' && (
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        checked={demanda.selected}
                                                        onChange={() => toggleSelect(demanda.id)}
                                                        disabled={demanda.status === 'error'}
                                                        size="small"
                                                    />
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                {demanda.status === 'parsed' && <Chip label="OK" color="success" size="small" />}
                                                {demanda.status === 'error' && (
                                                    <Tooltip title={demanda.errorMessage || ''}>
                                                        <Chip label="Erro" color="error" size="small" icon={<ErrorIcon />} />
                                                    </Tooltip>
                                                )}
                                                {demanda.status === 'creating' && <CircularProgress size={18} />}
                                                {demanda.status === 'created' && <Chip label="Criada" color="success" size="small" icon={<CheckCircleIcon />} />}
                                                {demanda.status === 'create_error' && (
                                                    <Tooltip title={demanda.errorMessage || ''}>
                                                        <Chip label="Falha" color="warning" size="small" icon={<WarningIcon />} />
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" noWrap sx={{ maxWidth: 120, display: 'block' }}>
                                                    {demanda.fileName}
                                                </Typography>
                                            </TableCell>
                                            {step === 'review' && demanda.status !== 'error' ? (
                                                <>
                                                    <EditableCell value={demanda.protocolo} onChange={(v) => updateField(demanda.id, 'protocolo', v)} />
                                                    <EditableCell value={demanda.nome_solicitante} onChange={(v) => updateField(demanda.id, 'nome_solicitante', v)} />
                                                    <EditableCell value={demanda.cep} onChange={(v) => updateField(demanda.id, 'cep', v)} width={100} />
                                                    <EditableCell value={demanda.logradouro} onChange={(v) => updateField(demanda.id, 'logradouro', v)} />
                                                    <EditableCell value={demanda.numero} onChange={(v) => updateField(demanda.id, 'numero', v)} width={60} />
                                                    <EditableCell value={demanda.bairro} onChange={(v) => updateField(demanda.id, 'bairro', v)} />
                                                    <EditableCell value={demanda.cidade} onChange={(v) => updateField(demanda.id, 'cidade', v)} />
                                                    <EditableCell value={demanda.uf} onChange={(v) => updateField(demanda.id, 'uf', v)} width={50} />
                                                    <TableCell>
                                                        <FormControl size="small" fullWidth variant="standard">
                                                            <Select
                                                                value={demanda.tipo_demanda}
                                                                onChange={(e) => updateField(demanda.id, 'tipo_demanda', e.target.value)}
                                                                displayEmpty
                                                                sx={{ fontSize: '0.8rem' }}
                                                            >
                                                                <MenuItem value="" disabled><em>Selecione</em></MenuItem>
                                                                {availableTipos.map(t => (
                                                                    <MenuItem key={t.id} value={t.nome}>{t.nome}</MenuItem>
                                                                ))}
                                                                <MenuItem value="Outro">Outro</MenuItem>
                                                            </Select>
                                                        </FormControl>
                                                    </TableCell>
                                                    <EditableCell value={demanda.descricao} onChange={(v) => updateField(demanda.id, 'descricao', v)} multiline />
                                                </>
                                            ) : (
                                                <>
                                                    <TableCell><Typography variant="caption">{demanda.protocolo}</Typography></TableCell>
                                                    <TableCell><Typography variant="caption">{demanda.nome_solicitante}</Typography></TableCell>
                                                    <TableCell><Typography variant="caption">{demanda.cep}</Typography></TableCell>
                                                    <TableCell><Typography variant="caption">{demanda.logradouro}</Typography></TableCell>
                                                    <TableCell><Typography variant="caption">{demanda.numero}</Typography></TableCell>
                                                    <TableCell><Typography variant="caption">{demanda.bairro}</Typography></TableCell>
                                                    <TableCell><Typography variant="caption">{demanda.cidade}</Typography></TableCell>
                                                    <TableCell><Typography variant="caption">{demanda.uf}</Typography></TableCell>
                                                    <TableCell><Typography variant="caption">{demanda.tipo_demanda}</Typography></TableCell>
                                                    <TableCell><Typography variant="caption" sx={{ maxWidth: 200, display: 'block' }} noWrap>{demanda.descricao}</Typography></TableCell>
                                                </>
                                            )}
                                            {step === 'review' && (
                                                <TableCell>
                                                    <IconButton size="small" onClick={() => removeDemanda(demanda.id)} color="error">
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {/* STEP 3: Creating */}
                {step === 'creating' && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CircularProgress size={60} sx={{ mb: 2 }} />
                        <Typography variant="h6">
                            Criando demanda {createProgress.current}/{createProgress.total}...
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={(createProgress.current / createProgress.total) * 100}
                            sx={{ mt: 2, mx: 'auto', maxWidth: 400 }}
                        />
                    </Box>
                )}

                {/* STEP 4: Done */}
                {step === 'done' && (
                    <Box sx={{ mb: 2 }}>
                        <Alert severity={createResults.errors === 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
                            <strong>{createResults.success}</strong> demanda(s) criada(s) com sucesso.
                            {createResults.errors > 0 && (
                                <> <strong>{createResults.errors}</strong> com erro de criação.</>
                            )}
                        </Alert>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                {step === 'review' && (
                    <>
                        <Button onClick={handleClose}>Cancelar</Button>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<SendIcon />}
                            onClick={handleCreateAll}
                            disabled={selectedCount === 0}
                            sx={{ fontWeight: 'bold' }}
                        >
                            Criar {selectedCount} Demanda{selectedCount !== 1 ? 's' : ''}
                        </Button>
                    </>
                )}
                {step === 'done' && (
                    <Button variant="contained" onClick={handleClose}>
                        Fechar
                    </Button>
                )}
                {step === 'upload' && !isUploading && parsedDemandas.length === 0 && (
                    <Button onClick={handleClose}>Cancelar</Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

// --- Inline Editable Cell ---
function EditableCell({ value, onChange, width, multiline }: {
    value: string;
    onChange: (v: string) => void;
    width?: number;
    multiline?: boolean;
}) {
    return (
        <TableCell sx={{ p: 0.5 }}>
            <TextField
                value={value}
                onChange={(e) => onChange(e.target.value)}
                variant="standard"
                size="small"
                fullWidth
                multiline={multiline}
                maxRows={2}
                InputProps={{
                    sx: { fontSize: '0.8rem' },
                    disableUnderline: !!value,
                }}
                sx={{
                    minWidth: width || 'auto',
                    '& .MuiInput-root:hover .MuiInput-underline': { borderBottom: '1px solid' },
                    '& .MuiInput-root': {
                        '&:hover': { '&::before': { borderBottom: '1px solid rgba(0,0,0,0.42) !important' } }
                    }
                }}
                placeholder="—"
            />
        </TableCell>
    );
}
