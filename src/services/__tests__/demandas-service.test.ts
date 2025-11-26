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
jest.mock('@/services/geocoding-service');

describe('DemandasService', () => {
  
  // Limpa os mocks antes de cada teste para garantir um ambiente limpo
  beforeEach(() => {
    jest.clearAllMocks();
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
      await expect(demandasService.createDemanda(inputInvalido as any))
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
      const resultado = await demandasService.createDemanda(inputValido);

      // Verificação: O retorno deve ser igual ao objeto simulado
      expect(resultado).toEqual(mockDemandaCriada);
      
      // Verificação: O Service deve ter chamado o Repository com os dados tratados (CEP sem traço)
      expect(DemandasRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        cep: '93000000',
        tipo_demanda: 'Poda',
        id_status: 1
      }));
    });
  });
});