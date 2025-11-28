// src/lib/__tests__/db.test.ts (CÓDIGO CORRIGIDO)

// Salvamos o ambiente original para restauração
const originalEnv = process.env;

// Mock da dependência pg
jest.mock('pg', () => {
  const Pool = jest.fn().mockImplementation((config) => ({
    // Apenas mocks necessários para o Pool
    connect: jest.fn(),
    end: jest.fn(),
    query: jest.fn(),
    config: config,
  }));
  return { Pool };
});

describe('DB Connection Configuration (src/lib/db.ts)', () => {
    
    // Variáveis que testaremos no fallback
    const fallbackEnv = {
        DB_USER: 'test_user_fallback',
        DB_PASSWORD: 'test_password',
        DB_HOST: 'docker_db',
        DB_PORT: '5432',
        DB_DATABASE: 'dev_db',
    };
    const expectedFallbackUrl = 'postgresql://test_user_fallback:test_password@docker_db:5432/dev_db';
    // URL que usaremos para o teste de prioridade
    const testUrlPriority1 = 'postgresql://url_priority_1:pass@host:1234/test_db_url';

    beforeEach(() => {
        // 1. Limpa o cache de módulos (para re-importar db.ts)
        jest.resetModules(); 
        
        // 2. Reseta process.env
        process.env = { ...originalEnv };
        delete process.env.POSTGRES_URL;
        
        // 3. Limpa as variáveis DB_ e o Singleton
        Object.keys(fallbackEnv).forEach(key => delete process.env[key]);
        // Garante que o singleton global esteja limpo (essencial para db.ts)
        global.pool = undefined; 
    });

    afterAll(() => {
        process.env = originalEnv; 
    });

    it('Deve usar POSTGRES_URL se estiver definido (Prioridade 1)', () => {
        process.env.POSTGRES_URL = testUrlPriority1;
        
        jest.isolateModules(() => {
            const pool = require('../db').default;
            expect(pool.config.connectionString).toBe(testUrlPriority1);
        });
    });

    it('Deve construir o connectionString usando variáveis DB_ se POSTGRES_URL estiver ausente (Fallback)', () => {
        // Define as variáveis de fallback no ambiente do teste
        Object.assign(process.env, fallbackEnv);
        
        jest.isolateModules(() => {
            const pool = require('../db').default;
            expect(pool.config.connectionString).toBe(expectedFallbackUrl);
        });
    });
    
    it('Deve lançar erro se NENHUMA variável de conexão estiver definida', () => {
        // As variáveis já estão limpas no beforeEach
        
        const originalError = console.error;
        console.error = jest.fn(); 

        expect(() => {
            jest.isolateModules(() => {
                 // A importação falha, disparando o throw em db.ts
                 require('../db');
            });
        }).toThrow("Não foi possível conectar ao banco de dados.");
        
        console.error = originalError;
    });
    
    it('Deve criar o pool como Singleton (global.pool)', () => {
        let firstPool;
        let secondPool;
        
        // Define POSTGRES_URL para garantir a criação do Pool (não o throw)
        process.env.POSTGRES_URL = testUrlPriority1;

        jest.isolateModules(() => {
            firstPool = require('../db').default;
        });

        jest.isolateModules(() => {
            secondPool = require('../db').default;
        });

        // O pool deve ser o mesmo objeto
        expect(firstPool).toBe(secondPool);
    });
});