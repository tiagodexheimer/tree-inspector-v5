-- ============================================================================
-- ARQUIVO: src/scripts/notificacoes_schema.sql
-- DESCRIÇÃO: Tabela para gestão de fiscalização e notificações (vinculadas ou avulsas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notificacoes (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    demanda_id INT REFERENCES demandas(id) ON DELETE SET NULL, -- Opcional para notificações avulsas
    
    -- Dados do Processante
    numero_processo TEXT NOT NULL,
    numero_notificacao TEXT,
    descricao TEXT,
    
    -- Prazos
    data_emissao DATE DEFAULT CURRENT_DATE,
    prazo_dias INT NOT NULL DEFAULT 15,
    vencimento DATE NOT NULL,
    
    -- Controle de Status
    status TEXT NOT NULL DEFAULT 'Pendente', -- 'Pendente', 'Cumprido', 'Vencido'
    
    -- Dados de Endereço (Servem como override ou para notificações avulsas)
    logradouro TEXT,
    numero TEXT,
    bairro TEXT,
    cidade TEXT,
    uf VARCHAR(2),
    cep TEXT,
    geom GEOMETRY(Point, 4326),
    
    -- Anexos (Fotos)
    fotos JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_org ON notificacoes(organization_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_demanda ON notificacoes(demanda_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_vencimento ON notificacoes(vencimento);
CREATE INDEX IF NOT EXISTS idx_notificacoes_geom ON notificacoes USING GIST (geom);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS set_notificacoes_timestamp ON notificacoes;
CREATE TRIGGER set_notificacoes_timestamp BEFORE UPDATE ON notificacoes FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
