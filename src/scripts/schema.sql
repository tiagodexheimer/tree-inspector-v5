-- scripts/schema.sql

-- Habilita as extensões necessárias
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- Adicionado para gerar UUIDs

-- Tabela para os Status das Demandas
CREATE TABLE IF NOT EXISTS demandas_status (
    id SERIAL PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL,
    cor TEXT NOT NULL DEFAULT '#808080'
);

-- Tabela para os Tipos de Demandas
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
    tipo_demanda TEXT NOT NULL, 
    descricao TEXT NOT NULL, 
    id_status INT REFERENCES demandas_status(id) ON DELETE SET NULL,
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
    PRIMARY KEY (rota_id, demanda_id),
    UNIQUE(demanda_id) 
);

-- ===================================================================
--  INÍCIO DA CORREÇÃO: TABELA DE USUÁRIOS FALTANTE
-- ===================================================================

-- Tabela de Usuários (Padrão NextAuth)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT UNIQUE,
    email_verified TIMESTAMPTZ,
    image TEXT,
    password TEXT, -- Usado pelo provedor "credentials"
    role TEXT NOT NULL DEFAULT 'user' -- Campo customizado para permissões
);

-- ===================================================================
--  FIM DA CORREÇÃO
-- ===================================================================

-- Tabela de Sessões (Corrigida)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    session_token TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMPTZ NOT NULL
);

-- Tabela de Contas (Corrigida)
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Inserção de dados iniciais
INSERT INTO demandas_status (nome, cor) VALUES
('Pendente', '#FFA500'),
('Em Andamento', '#1976D2'),
('Concluído', '#2E7D32')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO demandas_tipos (nome) VALUES
('Avaliação'),
('Poda'),
('Supressão'),
('Fiscalização')
ON CONFLICT (nome) DO NOTHING;