// src/repositories/__tests__/rotas-repository.test.ts

import { RotasRepository } from '../rotas-repository';
import pool from '@/lib/db';

jest.mock('@/lib/db', () => ({
    query: jest.fn(),
    connect: jest.fn().mockReturnValue({
        query: jest.fn(),
        release: jest.fn(),
    }),
}));

describe('RotasRepository (Unit Test - Mocking DB)', () => {
    const mockQuery = pool.query as jest.Mock;
    const mockConnect = pool.connect as jest.Mock;
    const mockClientQuery = jest.fn();
    const mockClientRelease = jest.fn();

    beforeEach(() => {
        jest.resetAllMocks();
        mockConnect.mockReturnValue({
            query: mockClientQuery,
            release: mockClientRelease,
        });
    });

    // --- Dados de teste ---
    const mockRota = {
        id: 1,
        nome: 'Rota Centro',
        responsavel: 'João',
        status: 'Ativa',
        data_rota: null,
        created_at: new Date().toISOString(),
        total_demandas: 5,
        organization_id: 1,
    };

    // --- FIND ALL ---

    it('findAll: Deve retornar lista de rotas filtrada por organização', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [mockRota] });

        const result = await RotasRepository.findAll(1);

        expect(result).toEqual([mockRota]);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('organization_id'),
            expect.arrayContaining([1])
        );
    });

    it('findAll: Deve retornar array vazio se não houver rotas', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const result = await RotasRepository.findAll(1);

        expect(result).toEqual([]);
    });

    // --- FIND BY ID ---

    it('findById: Deve retornar rota por id e organização', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [mockRota] });

        const result = await RotasRepository.findById(1, 1);

        expect(result).toEqual(mockRota);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE'),
            expect.arrayContaining([1, 1])
        );
    });

    it('findById: Deve retornar null se rota não existir', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const result = await RotasRepository.findById(999, 1);

        expect(result).toBeNull();
    });

    // --- FIND DEMANDAS BY ROTA ---

    it('findDemandasByRotaId: Deve retornar demandas da rota ordenadas', async () => {
        const mockDemandas = [
            { id: 1, descricao: 'Demanda 1', ordem: 1 },
            { id: 2, descricao: 'Demanda 2', ordem: 2 },
        ];
        mockQuery.mockResolvedValueOnce({ rows: mockDemandas });

        const result = await RotasRepository.findDemandasByRotaId(1);

        expect(result).toEqual(mockDemandas);
        expect(result).toHaveLength(2);
    });

    // --- UPDATE ---

    it('update: Deve atualizar rota e retornar o objeto atualizado', async () => {
        const updatedRota = { ...mockRota, nome: 'Rota Norte' };
        mockQuery.mockResolvedValueOnce({ rows: [updatedRota] });

        const result = await RotasRepository.update(1, 1, { nome: 'Rota Norte' });

        expect(result?.nome).toBe('Rota Norte');
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE rotas'),
            expect.any(Array)
        );
    });

    it('update: Deve retornar null se rota não existir', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const result = await RotasRepository.update(999, 1, { nome: 'X' });

        expect(result).toBeNull();
    });

    // --- DELETE ---

    it('delete: Deve deletar rota com proteção de organização', async () => {
        // Sequência real: BEGIN, DELETE rotas_demandas, DELETE rotas, COMMIT
        mockClientQuery.mockResolvedValueOnce(undefined); // BEGIN
        mockClientQuery.mockResolvedValueOnce(undefined); // DELETE FROM rotas_demandas WHERE rota_id = $1
        mockClientQuery.mockResolvedValueOnce({ rowCount: 1 }); // DELETE FROM rotas WHERE id=$1 AND organization_id=$2
        mockClientQuery.mockResolvedValueOnce(undefined); // COMMIT

        const result = await RotasRepository.delete(1, 1);

        expect(result).toBe(true);
        expect(mockClientRelease).toHaveBeenCalled();
    });

    // --- COUNT BY ORGANIZATION ---

    it('countByOrganization: Deve retornar contagem de rotas', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] });

        const result = await RotasRepository.countByOrganization(1);

        expect(result).toBe(3);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('WHERE organization_id = $1'),
            [1]
        );
    });

    // --- REORDER DEMANDAS ---

    it('reorderDemandas: Deve atualizar a ordem das demandas', async () => {
        mockClientQuery.mockResolvedValue(undefined); // BEGIN, updates, COMMIT

        await RotasRepository.reorderDemandas(1, [
            { id: 10, ordem: 0 },
            { id: 20, ordem: 1 },
        ]);

        // BEGIN + 2 updates + COMMIT = 4 calls
        expect(mockClientQuery).toHaveBeenCalledTimes(4);
        expect(mockClientRelease).toHaveBeenCalled();
    });

    // --- ADD DEMANDAS TO ROTA ---

    it('addDemandasToRota: Deve inserir vínculos e atualizar status', async () => {
        mockClientQuery.mockResolvedValue(undefined); // BEGIN, inserts, update, COMMIT

        await RotasRepository.addDemandasToRota(1, [
            { id: 10, ordem: 2 },
        ]);

        expect(mockClientQuery).toHaveBeenCalled();
        expect(mockClientRelease).toHaveBeenCalled();
    });

    // --- DELETE ALL BY ORGANIZATION ---

    it('deleteAllByOrganization: Deve limpar rotas e vínculos', async () => {
        // Sequência real: BEGIN, DELETE rotas_demandas (subquery), DELETE rotas, COMMIT
        mockClientQuery.mockResolvedValueOnce(undefined); // BEGIN
        mockClientQuery.mockResolvedValueOnce(undefined); // DELETE FROM rotas_demandas WHERE rota_id IN (...)
        mockClientQuery.mockResolvedValueOnce({ rowCount: 3 }); // DELETE FROM rotas WHERE organization_id
        mockClientQuery.mockResolvedValueOnce(undefined); // COMMIT

        const result = await RotasRepository.deleteAllByOrganization(1);

        expect(result).toBe(3);
        expect(mockClientRelease).toHaveBeenCalled();
    });
});
