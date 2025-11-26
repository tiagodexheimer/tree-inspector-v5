// src/repositories/__tests__/demandas-repository.test.ts

// Aumenta o timeout para 30s pois envolve Docker e Banco de Dados
jest.setTimeout(30000);

// Variáveis para armazenar os módulos importados dinamicamente
let DemandasRepository: any;
let StatusRepository: any;
let resetTestDatabase: () => Promise<void>;
let closeTestDatabase: () => Promise<void>;

describe('DemandasRepository (Integração - CRUD Completo)', () => {
  
  // Antes de TODOS os testes deste arquivo
  beforeAll(async () => {
    // 1. Configura a variável de ambiente ANTES de qualquer import que use @/lib/db
    process.env.POSTGRES_URL = 'postgresql://test_user:test_password@localhost:5433/test_db';

    // 2. Importações Dinâmicas (Lazy Loading)
    const dbSetup = await import('../../test/helpers/test-db-setup');
    resetTestDatabase = dbSetup.resetTestDatabase;
    closeTestDatabase = dbSetup.closeTestDatabase;

    const demandasRepoModule = await import('../demandas-repository');
    DemandasRepository = demandasRepoModule.DemandasRepository;

    const statusRepoModule = await import('../status-repository');
    StatusRepository = statusRepoModule.StatusRepository;

    // 3. Reseta o banco de dados de teste (cria tabelas limpas)
    await resetTestDatabase();
  });

  // Fecha a conexão ao final de todos os testes
  afterAll(async () => {
    if (closeTestDatabase) {
      await closeTestDatabase();
    }
  });

  // Variável para compartilhar o ID da demanda criada entre os testes
  let createdDemandaId: number;
  let statusPendenteId: number;

  it('SETUP: Deve verificar se status inicial existe', async () => {
    const statusPendente = await StatusRepository.findByName('Pendente');
    expect(statusPendente).toBeDefined();
    statusPendenteId = statusPendente.id;
  });

  it('CREATE: Deve criar uma nova demanda no banco de teste', async () => {
    const novaDemandaData = {
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
      id_status: statusPendenteId,
      lat: -30.0,
      lng: -51.0,
      prazo: new Date()
    };

    const criada = await DemandasRepository.create(novaDemandaData);

    expect(criada).toHaveProperty('id');
    expect(criada.protocolo).toBe('TEST-CRUD-001');
    expect(criada.nome_solicitante).toBe('Teste CRUD');
    
    // Salva o ID para os próximos testes
    createdDemandaId = criada.id;
  });

  it('READ: Deve listar as demandas e encontrar a recém-criada', async () => {
    const resultado = await DemandasRepository.findAll({ page: 1, limit: 10 });

    expect(resultado.totalCount).toBeGreaterThanOrEqual(1);
    const demandaEncontrada = resultado.demandas.find((d: any) => d.id === createdDemandaId);
    
    expect(demandaEncontrada).toBeDefined();
    expect(demandaEncontrada.protocolo).toBe('TEST-CRUD-001');
  });

  it('READ: Deve buscar uma demanda específica por ID', async () => {
    const demanda = await DemandasRepository.findById(createdDemandaId);
    expect(demanda).toBeDefined();
    expect(demanda.id).toBe(createdDemandaId);
  });

  it('UPDATE: Deve atualizar os dados de uma demanda existente', async () => {
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
      tipo_demanda: 'Avaliação', // Mudou o tipo
      descricao: 'Descrição atualizada',
      lat: -29.0,
      lng: -50.0,
      prazo: new Date('2025-01-01')
    };

    const updated = await DemandasRepository.update(createdDemandaId, updateData);

    expect(updated).toBeDefined();
    expect(updated.id).toBe(createdDemandaId);
    expect(updated.nome_solicitante).toBe('Nome Atualizado');
    expect(updated.logradouro).toBe('Rua Atualizada');
    
    // Verifica lat/lng atualizados
    expect(updated.lat).toBeCloseTo(-29.0);
    expect(updated.lng).toBeCloseTo(-50.0);
  });

  it('UPDATE STATUS: Deve atualizar apenas o status da demanda', async () => {
    // Vamos assumir que existe um status 'Concluído' ou criar um temporário se necessário
    // O schema.sql insere 'Concluído'. Vamos buscá-lo.
    const statusConcluido = await StatusRepository.findByName('Concluído');
    expect(statusConcluido).toBeDefined();

    const success = await DemandasRepository.updateStatus(createdDemandaId, statusConcluido.id);
    expect(success).toBe(true);

    // Verifica se realmente mudou
    const demandaAtualizada = await DemandasRepository.findAll({ page: 1, limit: 10, statusIds: [statusConcluido.id] });
    const encontrada = demandaAtualizada.demandas.find((d: any) => d.id === createdDemandaId);
    expect(encontrada).toBeDefined();
    expect(encontrada.status_nome).toBe('Concluído');
  });

  it('DELETE: Deve deletar a demanda', async () => {
    const success = await DemandasRepository.delete(createdDemandaId);
    expect(success).toBe(true);

    // Tenta buscar novamente para garantir que sumiu
    const demanda = await DemandasRepository.findById(createdDemandaId);
    expect(demanda).toBeNull();
  });

  it('DELETE (Fail): Deve retornar false ao tentar deletar demanda inexistente', async () => {
    const idInexistente = 999999;
    const success = await DemandasRepository.delete(idInexistente);
    expect(success).toBe(false);
  });
});