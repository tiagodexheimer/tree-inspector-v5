-- scripts/schema.sql

-- Habilita a extensão PostGIS, essencial para suas demandas
CREATE EXTENSION IF NOT EXISTS postgis;

-- Tabela para os Status das Demandas (Ex: Pendente, Concluído)
CREATE TABLE IF NOT EXISTS demandas_status (
    id SERIAL PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL,
    cor TEXT NOT NULL DEFAULT '#808080'
);

-- Tabela para os Tipos de Demandas (Ex: Poda, Avaliação)
CREATE TABLE IF NOT EXISTS demandas_tipos (
    id SERIAL PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL
);

-- Tabela principal de Demandas
CREATE TABLE IF NOT EXISTS demandas (
    id SERIAL PRIMARY KEY,
    protocolo TEXT UNIQUE NOT NULL,
    nome_solicitante TEXT,
    telefone_solicitante TEXT,
    email_solicitante TEXT,
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    uf VARCHAR(2),
    
    -- Este campo é uma string que referencia 'demandas_tipos.nome'.
    -- Recomendo fortemente refatorar isso para um Integer (id_tipo) no futuro.
    tipo_demanda TEXT NOT NULL, 
    
    descricao TEXT NOT NULL,
    
    -- Chave estrangeira para a tabela de status
    id_status INT REFERENCES demandas_status(id) ON DELETE SET NULL,
    
    -- Armazena a geolocalização (Longitude, Latitude)
    geom GEOMETRY(Point, 4326),
    
    prazo DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para as Rotas
CREATE TABLE IF NOT EXISTS rotas (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    responsavel TEXT,
    status TEXT,
    data_rota TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de junção entre Rotas e Demandas
CREATE TABLE IF NOT EXISTS rotas_demandas (
    rota_id INT NOT NULL REFERENCES rotas(id) ON DELETE CASCADE,
    demanda_id INT NOT NULL REFERENCES demandas(id) ON DELETE CASCADE,
    ordem INT,
    
    -- Chave primária composta
    PRIMARY KEY (rota_id, demanda_id),
    
    -- Garante que uma demanda só pode estar em uma rota
    UNIQUE(demanda_id) 
);

-- Função para atualizar automaticamente o 'updated_at'
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para a tabela 'demandas'
CREATE TRIGGER set_demandas_timestamp
BEFORE UPDATE ON demandas
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- +++ INÍCIO DA CORREÇÃO: TABELA USERS FALTANTE +++
-- Tabela de Usuários (NextAuth com senha e role)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    email_verified TIMESTAMPTZ,
    password TEXT NOT NULL, -- <--- COLUNA CORRIGIDA
    role TEXT NOT NULL DEFAULT 'free_user'
);
-- +++ FIM DA CORREÇÃO +++


-- Tabela de Sessões (Corrigida)
-- Alteramos user_id de INTEGER para TEXT
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    session_token TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- <-- CORRIGIDO
    expires TIMESTAMPTZ NOT NULL
);

-- Tabela de Contas (Corrigida)
-- Alteramos user_id de INTEGER para TEXT
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- <-- CORRIGIDO
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at BIGINT,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    UNIQUE(provider, provider_account_id)
);

-- Inserção de dados iniciais (opcional, mas recomendado)
INSERT INTO demandas_status (nome, cor) VALUES
('Pendente', '#FFA500'),          -- Início do Fluxo
('Vistoria Agendada', '#1976D2'), -- NOVO - Acionado na Criação da Rota
('Em Rota', '#9c27b0'),           -- NOVO - Acionado no Início da Rota (Android)
('Concluído', '#2E7D32')          -- Fim do Fluxo
ON CONFLICT (nome) DO NOTHING;

INSERT INTO demandas_tipos (nome) VALUES
('Avaliação'),
('Poda'),
('Supressão'),
('Fiscalização')
ON CONFLICT (nome) DO NOTHING;

-- Tabela para armazenar as definições dos formulários
CREATE TABLE IF NOT EXISTS formularios (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    
    -- Coluna principal: armazena o array de CampoDef como JSONB
    definicao_campos JSONB NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(), -- <-- CORRIGIDO
    updated_at TIMESTAMPTZ DEFAULT NOW()  -- <-- CORRIGIDO
);

-- Tabela de ligação: Associa um formulário a um tipo de demanda
CREATE TABLE IF NOT EXISTS demandas_tipos_formularios (
    id_tipo_demanda INT PRIMARY KEY REFERENCES demandas_tipos(id) ON DELETE CASCADE,
    id_formulario INT NOT NULL REFERENCES formularios(id) ON DELETE RESTRICT,
    
    -- Garante que um tipo de demanda só tem um formulário ativo
    UNIQUE(id_tipo_demanda) 
);

-- Trigger para atualizar 'updated_at' da nova tabela 'formularios'
CREATE TRIGGER set_formularios_timestamp
BEFORE UPDATE ON formularios
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Tabela para armazenar os resultados das vistorias (Laudos)
CREATE TABLE IF NOT EXISTS vistorias_realizadas (
    id SERIAL PRIMARY KEY,
    demanda_id INT NOT NULL REFERENCES demandas(id) ON DELETE CASCADE,
    respostas JSONB NOT NULL, -- Aqui ficam os dados do formulário dinâmico
    data_realizacao TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(demanda_id) -- Uma demanda só pode ter uma vistoria final
);

