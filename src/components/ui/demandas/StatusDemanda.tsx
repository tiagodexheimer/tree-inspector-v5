'use client';

import React, { useState } from 'react';
// Import Box along with other MUI components
import { Box, Button, CircularProgress, Menu, MenuItem, Typography } from '@mui/material';
// Remova a importação de Status de demanda.ts se não precisar mais dela aqui
// import { Status, DemandaType } from '@/types/demanda';

// Nova interface para o tipo Status vindo da API
interface StatusOption {
    id: number;
    nome: string;
    cor: string;
}

interface StatusDemandaProps {
    demandaId: number;
    currentStatusId: number | null | undefined; // Recebe o ID do status atual
    availableStatus: StatusOption[]; // Recebe a lista de status disponíveis
    onStatusChange: (demandaId: number, newStatusId: number) => Promise<void>; // Atualizado para ID
    fallbackName?: string; // [NOVO] Nome vindo do JOIN do banco
    fallbackColor?: string; // [NOVO] Cor vinda do JOIN do banco
}

export default function StatusDemanda({
    demandaId,
    currentStatusId,
    availableStatus,
    onStatusChange,
    fallbackName,
    fallbackColor
}: StatusDemandaProps) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

    // Encontra o objeto do status atual com base no ID
    // Encontra o objeto do status atual com base no ID
    // [FIX] Usa Number() para garantir comparação numérica correta
    const currentStatusObject = availableStatus.find(s => Number(s.id) === Number(currentStatusId));

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (isUpdating) return;
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
        setUpdateError(null); // Limpa erro ao fechar o menu
    };

    const handleSelectStatus = async (newStatus: StatusOption) => {
        handleClose();
        if (!newStatus || Number(newStatus.id) === Number(currentStatusId)) return;

        setIsUpdating(true);
        setUpdateError(null);
        try {
            await onStatusChange(demandaId, newStatus.id);
        } catch (error: any) {
            // [FIX] Adiciona tratamento de erro robusto
            const errorMessage = error.message || "Erro ao atualizar status.";
            setUpdateError(errorMessage);
        } finally {
            setIsUpdating(false);
        }
    };

    // Estilo padrão caso o status atual não seja encontrado ou não tenha cor
    // [FIX] Aplica fallbacks se o objeto do status não for encontrado na lista carregada
    const bgColor = currentStatusObject?.cor || fallbackColor || '#808080';
    const style = { backgroundColor: bgColor, color: '#fff' };

    const currentStatusName = currentStatusObject?.nome || fallbackName || 'Indefinido';

    return (
        <div>
            <Button
                variant="contained"
                onClick={handleClick}
                disabled={isUpdating || availableStatus.length === 0} // Desabilita se não houver opções
                sx={{
                    backgroundColor: style.backgroundColor,
                    color: style.color,
                    '&:hover': { backgroundColor: style.backgroundColor, opacity: 0.9 },
                    borderRadius: '20px',
                    textTransform: 'none',
                    fontWeight: 'bold',
                    minWidth: '120px', // Ajuste conforme necessário
                    position: 'relative',
                    whiteSpace: 'nowrap', // Impede quebra de linha
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}
                title={currentStatusName} // Tooltip com nome completo
            >
                {isUpdating ? <CircularProgress size={20} color="inherit" sx={{ position: 'absolute' }} /> : currentStatusName}
            </Button>
            {/* Exibe erro abaixo do botão */}
            {updateError && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, maxWidth: '150px' }}>
                    {updateError}
                </Typography>
            )}
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
            >
                {availableStatus.map((statusOption) => (
                    <MenuItem
                        key={statusOption.id}
                        selected={statusOption.id === currentStatusId}
                        onClick={() => handleSelectStatus(statusOption)}
                        disabled={isUpdating}
                    >
                        {/* Opcional: Adicionar um pequeno círculo colorido */}
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: statusOption.cor, marginRight: 1, border: '1px solid rgba(0,0,0,0.2)' }} />
                        {statusOption.nome}
                    </MenuItem>
                ))}
                {availableStatus.length === 0 && (
                    <MenuItem disabled>Nenhum status disponível</MenuItem>
                )}
            </Menu>
        </div>
    );
}