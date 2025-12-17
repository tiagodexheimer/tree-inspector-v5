// src/repositories/__tests__/demandas-repository.test.ts
// CONVERTIDO PARA TESTE UNITÁRIO (MOCKADO) POIS AMBIENTE NÃO POSSUI DOCKER/DB LOCAL

import { DemandasRepository } from '../demandas-repository';
import { StatusRepository } from '../status-repository';
import pool from '@/lib/db';

// Mock do pool para simular respostas do banco de dados
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  connect: jest.fn().mockReturnValue({
    query: jest.fn(),
    release: jest.fn(),
  }),
}));

// Mock do StatusRepository para não depender dele
jest.mock('../status-repository');

describe('DemandasRepository (Simulação de integração com Mocks)', () => {
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  // Dados simulados
  const mockDemanda = {
    id: 1,
    protocolo: 'TEST-CRUD-001',
    nome_solicitante: 'Teste CRUD',
    telefone_solicitante: '5199999999',
    email_solicitante: 'crud@teste.com',
    cep: '90000000',
    logradouro: 'Rua CRUD',
    numero: '100',
    complemento: null,
    bairro: 'Bairro Teste',
    cidade: 'Cidade Teste',
    uf: 'RS',
    tipo_demanda: 'Poda',
    descricao: 'Teste de criação',
    id_status: 1,
    lat: -30.0,
    lng: -51.0,
    prazo: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status_nome: 'Pendente',
    status_cor: '#FFA500'
  };

  it('SETUP: Deve verificar se status inicial existe (Mockado)', async () => {
    (StatusRepository.findByName as jest.Mock).mockResolvedValue({ id: 1, nome: 'Pendente' });

    const statusPendente = await StatusRepository.findByName('Pendente');
    expect(statusPendente).toBeDefined();
    expect(statusPendente.id).toBe(1);
  });

  it('CREATE: Deve criar uma nova demanda (Mock DB Insert)', async () => {
    // Simula retorno do INSERT
    mockQuery.mockResolvedValueOnce({ rows: [mockDemanda] });

    const novaDemandaData = {
      protocolo: 'TEST-CRUD-001',
      organization_id: 1,
      nome_solicitante: 'Teste CRUD',
      telefone_solicitante: '5199999999',
      email_solicitante: 'crud@teste.com',
      cep: '90000000',
      logradouro: 'Rua CRUD',
      numero: '100',
      complemento: null,
      bairro: 'Bairro Teste',
      cidade: 'Cidade Teste',
      uf: 'RS',
      tipo_demanda: 'Poda',
      descricao: 'Teste de criação',
      id_status: 1,
      lat: -30.0,
      lng: -51.0,
      prazo: null,
      created_by_user_id: 'user-123'
    };

    const criada = await DemandasRepository.create(novaDemandaData);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO demandas'),
      expect.any(Array)
    );
    expect(criada).toEqual(mockDemanda);
  });

  it('READ: Deve listar as demandas (Mock DB Select)', async () => {
    // Mock para COUNT
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });
    // Mock para SELECT
    mockQuery.mockResolvedValueOnce({ rows: [mockDemanda] });

    const resultado = await DemandasRepository.findAll({ page: 1, limit: 10, organizationId: 1 });

    expect(resultado.totalCount).toBe(1);
    expect(resultado.demandas[0].protocolo).toBe('TEST-CRUD-001');
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  it('READ: Deve buscar uma demanda específica por ID (Mock DB Select)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockDemanda] });

    const demanda = await DemandasRepository.findById(1);

    expect(demanda).toBeDefined();
    expect(demanda.id).toBe(1);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE d.id = $1'),
      [1]
    );
  });

  it('UPDATE: Deve atualizar os dados de uma demanda existente (Mock DB Update)', async () => {
    const updatedDemanda = { ...mockDemanda, nome_solicitante: 'Nome Atualizado' };
    mockQuery.mockResolvedValueOnce({ rows: [updatedDemanda] });

    const updateData = {
      nome_solicitante: 'Nome Atualizado',
      telefone_solicitante: '5188888888',
      email_solicitante: 'atualizado@teste.com',
      cep: '91000000',
      logradouro: 'Rua Atualizada',
      numero: '200',
      complemento: 'Apto 1',
      bairro: 'Bairro Novo',
      cidade: 'Cidade Nova',
      uf: 'SC',
      tipo_demanda: 'Avaliação',
      descricao: 'Descrição atualizada',
      lat: -29.0,
      lng: -50.0,
      prazo: null
    };

    const updated = await DemandasRepository.update(1, updateData);

    expect(updated.nome_solicitante).toBe('Nome Atualizado');
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE demandas SET'),
      expect.any(Array)
    );
  });

  it('UPDATE STATUS: Deve atualizar apenas o status da demanda (Mock DB Update)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const success = await DemandasRepository.updateStatus(1, 2);
    expect(success).toBe(true);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE demandas SET id_status'),
      [2, 1]
    );
  });

  it('DELETE: Deve deletar a demanda (Mock DB Delete)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const success = await DemandasRepository.delete(1);
    expect(success).toBe(true);

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM demandas'),
      [1]
    );
  });

  it('DELETE (Fail): Deve retornar false ao tentar deletar demanda inexistente', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const success = await DemandasRepository.delete(999);
    expect(success).toBe(false);
  });
});