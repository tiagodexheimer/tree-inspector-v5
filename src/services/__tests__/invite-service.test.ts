import { inviteService } from '../invite-service';
import pool from '@/lib/db';

// Mock do pool
jest.mock('@/lib/db', () => ({
    query: jest.fn(),
    connect: jest.fn().mockReturnValue({
        query: jest.fn(),
        release: jest.fn(),
    }),
}));

describe('InviteService', () => {
    const mockConnect = pool.connect as jest.Mock;
    const mockQuery = jest.fn();
    const mockRelease = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockConnect.mockReturnValue({
            query: mockQuery,
            release: mockRelease
        });
    });

    describe('createInvite', () => {
        it('Deve lançar erro se o usuário for free', async () => {
            await expect(inviteService.createInvite(1, 'test@test.com', 'member', 'free'))
                .rejects
                .toThrow("Seu plano (Free) não permite enviar convites.");

            expect(pool.connect).not.toHaveBeenCalled();
        });

        it('Deve lançar erro se o usuário for free_user', async () => {
            await expect(inviteService.createInvite(1, 'test@test.com', 'member', 'free_user'))
                .rejects
                .toThrow("Seu plano (Free) não permite enviar convites.");

            expect(pool.connect).not.toHaveBeenCalled();
        });

        it('Deve permitir se o usuário for basic e estiver dentro do limite', async () => {
            // 1. Members Check (2 members)
            mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });
            // 2. Invites Check (1 invite)
            mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });
            // Total = 3 < 5 -> OK

            // 3. Duplicate Invite Check
            mockQuery.mockResolvedValueOnce({ rowCount: 0 });
            // 4. Existing Member Check
            mockQuery.mockResolvedValueOnce({ rowCount: 0 });
            // 5. Insert
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@test.com', token: 'abc' }] });

            const result = await inviteService.createInvite(1, 'test@test.com', 'member', 'basic');

            expect(result).toBeDefined();
            expect(pool.connect).toHaveBeenCalled();
            expect(mockQuery).toHaveBeenCalledTimes(5);
        });

        it('Deve bloquear se o usuário basic atingir o limite de 5', async () => {
            // 1. Members Check (3 members)
            mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] });
            // 2. Invites Check (2 invites)
            mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });
            // Total = 5 >= 5 -> Error

            await expect(inviteService.createInvite(1, 'test@test.com', 'member', 'basic'))
                .rejects
                .toThrow("Limite de 5 usuários atingido para o plano Basic.");

            expect(mockQuery).toHaveBeenCalledTimes(2); // Só roda as verificações de contagem
        });
    });
});
