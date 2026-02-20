// src/repositories/__tests__/notificacoes-repository.test.ts

import { NotificacoesRepository } from '../notificacoes-repository';
import pool from '@/lib/db';

jest.mock('@/lib/db', () => ({
    query: jest.fn(),
}));

describe('NotificacoesRepository (Unit Test - Mocking DB)', () => {
    const mockQuery = pool.query as jest.Mock;

    beforeEach(() => {
        jest.resetAllMocks();
    });

    // --- CREATE ---

    it('create: Deve criar uma notificação e retornar o objeto criado', async () => {
        const mockNotificacao = {
            id: 1,
            organization_id: 1,
            numero_processo: 'NOT-001',
            prazo_dias: 30,
            vencimento: '2026-03-20',
            status: 'Pendente',
        };
        mockQuery.mockResolvedValueOnce({ rows: [mockNotificacao] });

        const result = await NotificacoesRepository.create({
            organization_id: 1,
            numero_processo: 'NOT-001',
            prazo_dias: 30,
            vencimento: '2026-03-20',
        });

        expect(result).toEqual(mockNotificacao);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO notificacoes'),
            expect.any(Array)
        );
    });

    it('create: Deve usar valores default para campos opcionais', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 2 }] });

        await NotificacoesRepository.create({
            organization_id: 1,
            numero_processo: 'NOT-002',
            prazo_dias: 15,
            vencimento: '2026-04-01',
        });

        // Verifica que o array de valores inclui null para campos opcionais
        const values = mockQuery.mock.calls[0][1];
        expect(values[0]).toBe(1); // organization_id
        expect(values[1]).toBeNull(); // demanda_id (default null)
        expect(values[2]).toBe('NOT-002'); // numero_processo
    });

    // --- FIND BY DEMANDA ---

    it('findByDemanda: Deve retornar notificações de uma demanda', async () => {
        const mockRows = [
            { id: 1, demanda_id: 10, numero_processo: 'NOT-001' },
            { id: 2, demanda_id: 10, numero_processo: 'NOT-002' },
        ];
        mockQuery.mockResolvedValueOnce({ rows: mockRows });

        const result = await NotificacoesRepository.findByDemanda(10);

        expect(result).toEqual(mockRows);
        expect(result).toHaveLength(2);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE demanda_id = $1'),
            [10]
        );
    });

    it('findByDemanda: Deve retornar array vazio se não houver notificações', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const result = await NotificacoesRepository.findByDemanda(999);

        expect(result).toEqual([]);
    });

    // --- FIND EXPIRED ---

    it('findExpired: Deve retornar notificações vencidas da organização', async () => {
        const mockRows = [
            { id: 1, vencimento: '2026-01-01', status: 'Pendente' },
        ];
        mockQuery.mockResolvedValueOnce({ rows: mockRows });

        const result = await NotificacoesRepository.findExpired(1);

        expect(result).toEqual(mockRows);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE n.organization_id = $1'),
            [1]
        );
        // Verifica a condição de vencimento
        const query = mockQuery.mock.calls[0][0];
        expect(query).toContain('n.vencimento < CURRENT_DATE');
        expect(query).toContain("n.status = 'Pendente'");
    });

    // --- DELETE ---

    it('delete: Deve deletar uma notificação e retornar true', async () => {
        mockQuery.mockResolvedValueOnce({ rowCount: 1 });

        const result = await NotificacoesRepository.delete(1, 1);

        expect(result).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE id = $1 AND organization_id = $2'),
            [1, 1]
        );
    });

    it('delete: Deve retornar false se notificação não for encontrada', async () => {
        mockQuery.mockResolvedValueOnce({ rowCount: 0 });

        const result = await NotificacoesRepository.delete(999, 1);

        expect(result).toBe(false);
    });

    // --- UPDATE STATUS ---

    it('updateStatus: Deve atualizar o status e retornar true', async () => {
        mockQuery.mockResolvedValueOnce({ rowCount: 1 });

        const result = await NotificacoesRepository.updateStatus(1, 1, 'Resolvido');

        expect(result).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('SET status = $1'),
            ['Resolvido', 1, 1]
        );
    });

    it('updateStatus: Deve retornar false se notificação não existir', async () => {
        mockQuery.mockResolvedValueOnce({ rowCount: 0 });

        const result = await NotificacoesRepository.updateStatus(999, 1, 'Resolvido');

        expect(result).toBe(false);
    });
});
