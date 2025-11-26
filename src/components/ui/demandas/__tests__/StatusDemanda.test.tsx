import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // [NOVO] Usar user-event
import StatusDemanda from '../StatusDemanda';
import '@testing-library/jest-dom';

// Mock das props
const mockAvailableStatus = [
  { id: 1, nome: 'Pendente', cor: '#FFA500' },
  { id: 2, nome: 'Concluído', cor: '#008000' }
];

// Mock da função assíncrona
const mockOnStatusChange = jest.fn().mockResolvedValue(undefined);

describe('StatusDemanda Component', () => {
  beforeEach(() => {
    mockOnStatusChange.mockClear();
  });

  it('deve renderizar o status correto inicialmente', () => {
    render(
      <StatusDemanda
        demandaId={1}
        currentStatusId={1}
        availableStatus={mockAvailableStatus}
        onStatusChange={mockOnStatusChange}
      />
    );

    const botaoStatus = screen.getByRole('button', { name: /Pendente/i });
    expect(botaoStatus).toBeInTheDocument();
    expect(botaoStatus).toHaveStyle('background-color: #FFA500');
  });

  it('deve renderizar "Indefinido" se o ID do status não existir', () => {
    render(
      <StatusDemanda
        demandaId={1}
        currentStatusId={999}
        availableStatus={mockAvailableStatus}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Indefinido')).toBeInTheDocument();
  });

  it('deve abrir o menu ao clicar e chamar onStatusChange ao selecionar nova opção', async () => {
    // Configura o user-event
    const user = userEvent.setup();

    render(
      <StatusDemanda
        demandaId={1}
        currentStatusId={1} // Pendente
        availableStatus={mockAvailableStatus}
        onStatusChange={mockOnStatusChange}
      />
    );

    // 1. Abre o menu (Interação do Usuário)
    const botaoStatus = screen.getByRole('button', { name: /Pendente/i });
    await user.click(botaoStatus);

    // 2. Verifica e clica na opção
    const opcaoConcluido = screen.getByText('Concluído');
    expect(opcaoConcluido).toBeInTheDocument();
    
    await user.click(opcaoConcluido);

    // 3. Verifica a chamada
    expect(mockOnStatusChange).toHaveBeenCalledWith(1, 2);

    // 4. Aguarda o estado estabilizar (botão habilitado novamente)
    await waitFor(() => {
        expect(botaoStatus).toBeEnabled();
    });
  });
});