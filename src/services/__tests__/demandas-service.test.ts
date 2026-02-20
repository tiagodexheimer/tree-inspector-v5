// Define a API Key ANTES dos imports para evitar erro na inicialização do GeocodingService
process.env.GOOGLE_MAPS_API_KEY = 'mock_key';

import { demandasService } from '../demandas-service';
import { DemandasRepository } from '@/repositories/demandas-repository';
import { StatusRepository } from '@/repositories/status-repository';

// [IMPORTANTE] Mock do módulo de banco de dados para evitar erro de conexão real durante o teste
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

// Mocks dos repositórios para isolar a lógica do Service
jest.mock('@/repositories/demandas-repository');
jest.mock('@/repositories/status-repository');
jest.mock('@/repositories/demandas-tipos-repository');
jest.mock('@/services/geocoding-service', () => ({
  geocodingService: {
    getCoordinates: jest.fn(),
  },
}));

describe('DemandasService', () => {

  // Limpa os mocks antes de cada teste para garantir um ambiente limpo
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_MAPS_API_KEY = 'mock_key'; // Mock da API Key
  });

  afterEach(() => {
    delete process.env.GOOGLE_MAPS_API_KEY;
  });

  describe('createDemanda', () => {
    it('deve lançar erro se campos obrigatórios estiverem faltando', async () => {
      // Preparação: Dados inválidos (sem CEP)
      const inputInvalido = {
        nome_solicitante: 'Teste',
        numero: '123',
        tipo_demanda: 'Poda',
        descricao: 'Teste',
        cep: '' // Campo obrigatório vazio
      };

      // Execução e Verificação: Espera que a chamada rejeite com o erro específico
      await expect(demandasService.createDemanda(inputInvalido as any, 1, 'basic'))
        .rejects
        .toThrow('Campos obrigatórios ausentes: CEP, Número, Tipo e Descrição.');
    });

    it('deve criar uma demanda com sucesso quando dados são válidos', async () => {
      // Preparação: Dados válidos
      const inputValido = {
        nome_solicitante: 'João Silva',
        cep: '93000-000',
        numero: '100',
        tipo_demanda: 'Poda',
        descricao: 'Árvore caindo',
        logradouro: 'Rua Teste',
        bairro: 'Centro',
        cidade: 'Esteio',
        uf: 'RS'
      };

      // Mock do comportamento do StatusRepository
      (StatusRepository.findByName as jest.Mock).mockResolvedValue({ id: 1, nome: 'Pendente' });

      // Objeto simulado que o Repository retornaria
      const mockDemandaCriada = {
        id: 1,
        protocolo: 'DEM-123',
        ...inputValido,
        cep: '93000000', // Simula a limpeza do CEP feita pelo service
        id_status: 1
      };

      // Mock do comportamento do DemandasRepository
      (DemandasRepository.create as jest.Mock).mockResolvedValue(mockDemandaCriada);

      // Execução
      const resultado = await demandasService.createDemanda(inputValido, 1, 'basic');

      // Verificação: O retorno deve ser igual ao objeto simulado
      expect(resultado).toEqual(mockDemandaCriada);

      // Verificação: O Service deve ter chamado o Repository com os dados tratados (CEP sem traço)
      expect(DemandasRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        cep: '93000000',
        tipo_demanda: 'Poda',
        id_status: 1,
        organization_id: 1
      }));
    });
  });

  describe('updateDemanda e updateDemandaStatus', () => {
    let mockDemanda: any;
    let mockStatusConcluido: any;

    beforeEach(async () => {
      jest.clearAllMocks();

      // Simulação de uma demanda existente
      mockDemanda = {
        id: 100,
        cep: '93000000',
        numero: '100',
        tipo_demanda: 'Poda',
        descricao: 'Antiga descrição',
        lat: -30.0,
        lng: -51.0
      };
      mockStatusConcluido = { id: 2, nome: 'Concluído' };

      // Mock para simular que a demanda existe no repositório
      (DemandasRepository.findById as jest.Mock).mockResolvedValue(mockDemanda);
      (StatusRepository.findById as jest.Mock).mockResolvedValue(mockStatusConcluido);
    });

    it('UPDATE: Deve atualizar os campos da demanda com sucesso e retornar o objeto', async () => {
      const inputUpdate = {
        nome_solicitante: 'Nome Novo',
        cep: '94000-000',
        numero: '200',
        tipo_demanda: 'Avaliação',
        descricao: 'Nova descrição',
        coordinates: [-31.0, -52.0] as [number, number],
        prazo: '2025-10-10'
      };

      const mockUpdated = { ...mockDemanda, ...inputUpdate, cep: '94000000', lat: -31.0, lng: -52.0 };
      (DemandasRepository.update as jest.Mock).mockResolvedValue(mockUpdated);

      const updated = await demandasService.updateDemanda(mockDemanda.id, inputUpdate);

      expect(updated.nome_solicitante).toBe('Nome Novo');
      expect(updated.cep).toBe('94000000');
      expect(updated.lat).toBe(-31.0);

      expect(DemandasRepository.update).toHaveBeenCalledWith(
        mockDemanda.id,
        expect.objectContaining({ cep: '94000000' }) // Verifica o CEP limpo
      );
    });

    it('UPDATE: Deve lançar erro se a demanda a ser atualizada não for encontrada', async () => {
      (DemandasRepository.findById as jest.Mock).mockResolvedValue(null);
      (DemandasRepository.update as jest.Mock).mockResolvedValue(null);

      const inputUpdate = {
        cep: '94000000',
        numero: '200',
        tipo_demanda: 'Avaliação',
        descricao: 'Nova descrição',
      };

      // Não precisa de findById se o repositório retornar null em update
      await expect(demandasService.updateDemanda(999, inputUpdate as any))
        .rejects
        .toThrow('Demanda não encontrada.');
    });

    it('UPDATE STATUS: Deve atualizar o status da demanda corretamente', async () => {
      (DemandasRepository.updateStatus as jest.Mock).mockResolvedValue(true);
      (StatusRepository.findById as jest.Mock).mockResolvedValue(mockStatusConcluido);

      await demandasService.updateDemandaStatus(mockDemanda.id, mockStatusConcluido.id);

      expect(StatusRepository.findById).toHaveBeenCalledWith(mockStatusConcluido.id);
      expect(DemandasRepository.updateStatus).toHaveBeenCalledWith(
        mockDemanda.id,
        mockStatusConcluido.id
      );
    });

    it('UPDATE STATUS: Deve lançar erro se o novo status não for encontrado', async () => {
      (StatusRepository.findById as jest.Mock).mockResolvedValue(null); // Status não existe

      await expect(demandasService.updateDemandaStatus(mockDemanda.id, 999))
        .rejects
        .toThrow('Status com ID 999 não encontrado.');
    });

    it('DELETE: Deve deletar a demanda se ela existir', async () => {
      (DemandasRepository.delete as jest.Mock).mockResolvedValue(true);

      await expect(demandasService.deleteDemanda(mockDemanda.id)).resolves.toBeUndefined();
      expect(DemandasRepository.delete).toHaveBeenCalledWith(mockDemanda.id);
    });

    it('DELETE: Deve lançar erro se a demanda a ser deletada não for encontrada', async () => {
      (DemandasRepository.delete as jest.Mock).mockResolvedValue(false);

      await expect(demandasService.deleteDemanda(999)).rejects.toThrow('Demanda não encontrada.');
    });

  });

  describe('deleteDemandas (batch com organizationId)', () => {
    it('Deve passar organizationId para o repositório na deleção em lote', async () => {
      (DemandasRepository.deleteMany as jest.Mock).mockResolvedValue(undefined);

      await demandasService.deleteDemandas([1, 2, 3], 42);

      expect(DemandasRepository.deleteMany).toHaveBeenCalledWith([1, 2, 3], 42);
    });

    it('Deve funcionar sem organizationId (backward compat)', async () => {
      (DemandasRepository.deleteMany as jest.Mock).mockResolvedValue(undefined);

      await demandasService.deleteDemandas([1, 2]);

      expect(DemandasRepository.deleteMany).toHaveBeenCalledWith([1, 2], undefined);
    });
  });

  describe('listDemandas', () => {
    it('Deve aplicar limite para usuário free', async () => {
      const mockResult = { demandas: [], totalCount: 0 };
      (DemandasRepository.findAll as jest.Mock).mockResolvedValue(mockResult);

      await demandasService.listDemandas(
        { page: 1, limit: 50, organizationId: 1 },
        'free',
        1
      );

      expect(DemandasRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          page: 1,
          organizationId: 1,
        })
      );
    });

    it('Não deve limitar para usuário basic', async () => {
      const mockResult = { demandas: [], totalCount: 0 };
      (DemandasRepository.findAll as jest.Mock).mockResolvedValue(mockResult);

      await demandasService.listDemandas(
        { page: 2, limit: 50, organizationId: 1 },
        'basic',
        1
      );

      expect(DemandasRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          page: 2,
        })
      );
    });
  });
});