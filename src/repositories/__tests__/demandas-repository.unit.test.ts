// src/repositories/__tests__/demandas-repository.unit.test.ts

import { DemandasRepository } from '../demandas-repository';
import pool from '@/lib/db'; 

// Mock do pool para simular respostas do banco de dados
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

describe('DemandasRepository Filters e Error Handling', () => {
  const mockQuery = pool.query as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Testando Filtros em findAll (Cobre Lógica do WHERE) ---

  it('findAll: Deve construir a query corretamente com filtro de texto', async () => {
    // Mock Count e Select
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] }); 
    mockQuery.mockResolvedValue({ rows: [] }); 
    
    await DemandasRepository.findAll({ 
      page: 1, limit: 10, filtro: 'teste' 
    });

    // Pega a query e os valores da primeira chamada (COUNT)
    const countQuery = mockQuery.mock.calls[0][0];
    const countValues = mockQuery.mock.calls[0][1];

    // CORREÇÃO: Verifica se as partes essenciais do WHERE estão presentes (independente de quebras de linha)
    expect(countQuery).toContain("WHERE");
    expect(countQuery).toContain("d.nome_solicitante ILIKE $1");
    expect(countQuery).toContain("d.protocolo ILIKE $1");
    expect(countValues).toEqual(['%teste%']);
  });
  
  it('findAll: Deve construir a query corretamente com filtro de Status e Tipo', async () => {
    // Mock Count e Select
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] }); 
    mockQuery.mockResolvedValue({ rows: [] }); 
    
    await DemandasRepository.findAll({ 
      page: 1, limit: 5, 
      statusIds: [1, 2], 
      tipoNomes: ['Poda', 'Supressão'] 
    });

    // Pega a query e os valores da segunda chamada (SELECT)
    const selectQuery = mockQuery.mock.calls[1][0];
    const selectValues = mockQuery.mock.calls[1][1];

    // Verifica se as cláusulas WHERE foram incluídas (Status e Tipo)
    expect(selectQuery).toContain("WHERE d.id_status = ANY($1::int[]) AND d.tipo_demanda = ANY($2::text[])");

    // Verifica os valores passados para os parâmetros ($1, $2, limit, offset)
    expect(selectValues).toEqual([[1, 2], ['Poda', 'Supressão'], 5, 0]);
  });
  
  // --- Testando DeleteMany (Cobre Tratamento de Erro 23503) ---

  it('deleteMany: Deve lançar erro específico em caso de Foreign Key Violation (código 23503)', async () => {
    const foreignKeyError = { code: '23503', message: 'Foreign key violation: demanda_id' };
    
    // CORREÇÃO: Usa mockRejectedValueOnce
    mockQuery.mockRejectedValueOnce(foreignKeyError); 

    await expect(DemandasRepository.deleteMany([1, 2]))
      .rejects
      .toThrow('Não é possível excluir uma ou mais demandas pois elas estão vinculadas a rotas ativas. Remova-as das rotas antes de excluir.');
  });
  
  it('deleteMany: Deve lançar erro genérico para outros erros do PostgreSQL', async () => {
    const genericError = { code: '42601', message: 'Syntax error' };
    
    // CORREÇÃO: Usa mockRejectedValueOnce
    mockQuery.mockRejectedValueOnce(genericError);

    await expect(DemandasRepository.deleteMany([1]))
      .rejects
      .toThrow('Falha ao deletar demandas no banco de dados.');
  });
});