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
    jest.resetAllMocks();
  });

  // --- Testando Filtros em findAll (Cobre Lógica do WHERE) ---

  it('findAll: Deve construir a query corretamente com filtro de texto', async () => {
    // Mock Count e Select
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '10' }] });
    mockQuery.mockResolvedValue({ rows: [] });

    await DemandasRepository.findAll({
      page: 1, limit: 10, filtro: 'teste', organizationId: 1
    });

    // Pega a query e os valores da primeira chamada (COUNT)
    const countQuery = mockQuery.mock.calls[0][0];
    const countValues = mockQuery.mock.calls[0][1];

    // CORREÇÃO: Verifica se as partes essenciais do WHERE estão presentes (independente de quebras de linha)
    expect(countQuery).toContain("WHERE");
    expect(countQuery).toContain("d.organization_id = $1");
    // organization_id é $1, então filtro começa em $2
    expect(countQuery).toContain("d.nome_solicitante ILIKE $2");
    expect(countQuery).toContain("d.protocolo ILIKE $2");
    expect(countValues).toEqual([1, '%teste%']);
  });

  it('findAll: Deve construir a query corretamente com filtro de Status e Tipo', async () => {
    // Mock Count e Select
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] });
    mockQuery.mockResolvedValue({ rows: [] });

    await DemandasRepository.findAll({
      page: 1, limit: 5,
      statusIds: [1, 2],
      tipoNomes: ['Poda', 'Supressão'],
      organizationId: 1
    });

    // Pega a query e os valores da segunda chamada (SELECT)
    const selectQuery = mockQuery.mock.calls[1][0];
    const selectValues = mockQuery.mock.calls[1][1];

    // Verifica se as cláusulas WHERE foram incluídas (Organization, Status e Tipo)
    // A query de status agora usa subquery com nome ao invés de ANY direto
    expect(selectQuery).toContain('d.organization_id = $1');
    expect(selectQuery).toContain('d.id_status IN');
    expect(selectQuery).toContain('d.tipo_demanda = ANY($3::text[])');

    // Verifica os valores passados para os parâmetros ($1=orgId, $2=statusIds, $3=tipoNomes, limit, offset)
    expect(selectValues).toEqual([1, [1, 2], ['Poda', 'Supressão'], 5, 0]);
  });

  // --- Testando DeleteMany (Cobre Tratamento de Erro 23503) ---

  it('deleteMany: Deve usar organization_id no filtro quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 2 });

    await DemandasRepository.deleteMany([1, 2], 42);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('AND organization_id = $2'),
      [[1, 2], 42]
    );
  });

  it('deleteMany: Deve funcionar sem organization_id (sem filtro extra)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    await DemandasRepository.deleteMany([5]);

    const query = mockQuery.mock.calls[0][0];
    expect(query).not.toContain('organization_id');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = ANY($1)'),
      [[5]]
    );
  });

  it('deleteMany: Deve lançar erro específico em caso de Foreign Key Violation (código 23503)', async () => {
    const foreignKeyError = { code: '23503', message: 'Foreign key violation: demanda_id' };
    mockQuery.mockRejectedValueOnce(foreignKeyError);

    await expect(DemandasRepository.deleteMany([1, 2], 1))
      .rejects
      .toThrow('Não é possível excluir demandas vinculadas a rotas.');
  });

  it('deleteMany: Deve lançar erro genérico para outros erros do PostgreSQL', async () => {
    const genericError = new Error('Syntax error');
    (genericError as any).code = '42601';
    mockQuery.mockRejectedValueOnce(genericError);

    await expect(DemandasRepository.deleteMany([1]))
      .rejects
      .toThrow('Syntax error');
  });

  // --- countByOrganization ---

  it('countByOrganization: Deve retornar a contagem correta', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '15' }] });

    const result = await DemandasRepository.countByOrganization(1);

    expect(result).toBe(15);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE organization_id = $1'),
      [1]
    );
  });

  // --- getUniqueBairros ---

  it('getUniqueBairros: Deve retornar lista de bairros distintos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ bairro: 'Centro' }, { bairro: 'Jardim' }, { bairro: 'Vila Nova' }]
    });

    const result = await DemandasRepository.getUniqueBairros(1);

    expect(result).toEqual(['Centro', 'Jardim', 'Vila Nova']);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('DISTINCT bairro'),
      [1]
    );
  });

  it('getUniqueBairros: Deve lançar erro se a query falhar', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB Error'));

    await expect(DemandasRepository.getUniqueBairros(1))
      .rejects
      .toThrow('Falha ao buscar bairros únicos.');
  });
});