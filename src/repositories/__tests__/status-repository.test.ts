// src/repositories/__tests__/status-repository.test.ts

import { StatusRepository } from '../status-repository';
import pool from '@/lib/db';

// Mock do pool para simular respostas do banco de dados
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

describe('StatusRepository (Unit Test - Mocking DB)', () => {
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- FIND (READ) METHODS ---

  it('findGlobalAndDefault: Deve retornar a lista de status ordenada', async () => {
    const mockRows = [
      { id: 1, nome: 'Pendente', cor: '#FFA500', is_custom: false },
      { id: 2, nome: 'Concluído', cor: '#008000', is_custom: false },
    ];
    mockQuery.mockResolvedValue({ rows: mockRows });

    const result = await StatusRepository.findGlobalAndDefault(1);
    expect(result).toEqual(mockRows);
  });

  it('findGlobalAndDefault: Deve lançar erro se a consulta ao banco falhar', async () => {
    // Simula falha na execução da query (cobre o catch)
    mockQuery.mockRejectedValue(new Error("DB Connection Failed"));

    await expect(StatusRepository.findGlobalAndDefault(1))
      .rejects
      .toThrow('Falha ao buscar status Padrão.');
  });

  it('findByName: Deve retornar o status correto se encontrado', async () => {
    const mockRow = { id: 1, nome: 'Pendente', cor: '#FFA500' };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    const result = await StatusRepository.findByName('Pendente');
    expect(result).toEqual(mockRow);
  });

  it('findById: Deve retornar o status correto se encontrado', async () => {
    const mockRow = { id: 2, nome: 'Concluído', cor: '#008000' };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    const result = await StatusRepository.findById(2);
    expect(result).toEqual(mockRow);
  });

  it('countUsageById: Deve retornar a contagem de uso da demanda', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: '5' }] });

    const result = await StatusRepository.countUsageById(1);
    expect(result).toBe(5);
  });

  it('countUsageById: Deve lançar erro se a consulta de contagem falhar', async () => {
    // Cobre o catch no countUsageById
    mockQuery.mockRejectedValue(new Error("Count DB Error"));

    await expect(StatusRepository.countUsageById(1))
      .rejects
      .toThrow('Falha ao verificar uso do status.');
  });

  // --- CREATE, UPDATE, DELETE METHODS ---

  it('create: Deve criar um novo status e retornar o objeto criado', async () => {
    const newStatus = { nome: 'Em Andamento', cor: '#1976D2', organization_id: 1, is_custom: true };
    const mockResult = { id: 3, ...newStatus };
    mockQuery.mockResolvedValue({ rows: [mockResult] });

    const result = await StatusRepository.create(newStatus);
    expect(result).toEqual(mockResult);
  });

  it('create: Deve lançar erro se a query de criação falhar', async () => {
    // Cobre o catch no create
    mockQuery.mockRejectedValue(new Error("Insert DB Error"));
    await expect(StatusRepository.create({ nome: 'Teste', cor: '#FFF', organization_id: 1, is_custom: true }))
      .rejects
      .toThrow('Falha ao criar status.');
  });

  it('update: Deve atualizar um status existente e retornar o objeto', async () => {
    const updatedData = { nome: 'Concluído V2', cor: '#00FF00' };
    const mockResult = { id: 2, ...updatedData };
    mockQuery.mockResolvedValue({ rows: [mockResult] });

    const result = await StatusRepository.update(2, 1, updatedData);
    expect(result).toEqual(mockResult);
  });

  it('update: Deve lançar erro se a query de atualização falhar', async () => {
    // Cobre o catch no update
    mockQuery.mockRejectedValue(new Error("Update DB Error"));
    await expect(StatusRepository.update(1, 1, { nome: 'Teste', cor: '#FFF' }))
      .rejects
      .toThrow('Falha ao atualizar status.');
  });

  it('delete: Deve deletar um status e retornar true', async () => {
    mockQuery.mockResolvedValue({ rowCount: 1 });

    const result = await StatusRepository.delete(1, 1);
    expect(result).toBe(true);
  });

  it('delete: Deve retornar false se status não for encontrado', async () => {
    mockQuery.mockResolvedValue({ rowCount: 0 });

    const result = await StatusRepository.delete(999, 1);
    expect(result).toBe(false);
  });

  it('delete: Deve lançar erro se a query de deleção falhar', async () => {
    // Cobre o catch no delete
    mockQuery.mockRejectedValue(new Error("Delete DB Error"));
    await expect(StatusRepository.delete(1, 1))
      .rejects
      .toThrow('Falha ao deletar status.');
  });

});