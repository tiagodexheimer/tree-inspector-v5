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
}

export default function StatusDemanda({ demandaId, currentStatusId, availableStatus, onStatusChange }: StatusDemandaProps) {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);

    // Encontra o objeto do status atual com base no ID
    const currentStatusObject = availableStatus.find(s => s.id === currentStatusId);

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
        if (!newStatus || newStatus.id === currentStatusId) return;

        setIsUpdating(true); // <--- Atualização 1
        setUpdateError(null);
        try {
            await onStatusChange(demandaId, newStatus.id); // <--- Espera
        } catch (error) {
            // ...
        } finally {
            setIsUpdating(false); // <--- Atualização 2 (Causa do aviso se o teste acabar antes)
        }
    };

    // Estilo padrão caso o status atual não seja encontrado ou não tenha cor
    const defaultStyle = { backgroundColor: '#808080', color: '#fff' };
    const style = currentStatusObject ? { backgroundColor: currentStatusObject.cor, color: '#fff' } : defaultStyle; // Assume texto branco para todas as cores por simplicidade

    const currentStatusName = currentStatusObject ? currentStatusObject.nome : 'Indefinido';

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