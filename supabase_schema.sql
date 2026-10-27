-- ==============================================================================
-- AUTOLAVA - ESQUEMA COMPLETO E MIGRATION CONSOLIDADA
-- Sistema de Gestão Operacional de Serviços Automotivos e Frotas
-- Execute no SQL Editor do Supabase para criar todo o banco de uma só vez
-- ==============================================================================

-- 0. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA DE DADOS DA EMPRESA
CREATE TABLE IF NOT EXISTS public.company_profile (
  id TEXT PRIMARY KEY DEFAULT 'default',
  cnpj TEXT NOT NULL DEFAULT '',
  razao_social TEXT NOT NULL DEFAULT '',
  nome_fantasia TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  endereco TEXT NOT NULL DEFAULT '',
  dados_bancarios JSONB NOT NULL DEFAULT '{"banco":"","agencia":"","conta":"","tipoConta":"Conta Corrente","chavePix":"","tipoChavePix":"CNPJ"}'::jsonb,
  logo_url TEXT DEFAULT '',
  is_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. TABELA DE SERVIÇOS
CREATE TABLE IF NOT EXISTS public.services (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL DEFAULT '',
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Passeio / Leve',
  preco_padrao NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (preco_padrao >= 0),
  descricao TEXT DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. TABELA DE CLIENTES (COM TABELA DE PREÇOS CONTRATUAL)
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  cnpj TEXT NOT NULL DEFAULT '',
  razao_social TEXT NOT NULL DEFAULT '',
  nome_fantasia TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  endereco TEXT DEFAULT '',
  tabela_precos JSONB NOT NULL DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM-DD'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. TABELA DE METAS
CREATE TABLE IF NOT EXISTS public.goals_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  meta_diaria NUMERIC(10, 2) NOT NULL DEFAULT 800.00 CHECK (meta_diaria >= 0),
  meta_semanal NUMERIC(10, 2) NOT NULL DEFAULT 4800.00 CHECK (meta_semanal >= 0),
  meta_mensal NUMERIC(10, 2) NOT NULL DEFAULT 22000.00 CHECK (meta_mensal >= 0),
  meta_diaria_qtd INTEGER NOT NULL DEFAULT 12 CHECK (meta_diaria_qtd >= 0),
  meta_semanal_qtd INTEGER NOT NULL DEFAULT 70 CHECK (meta_semanal_qtd >= 0),
  meta_mensal_qtd INTEGER NOT NULL DEFAULT 300 CHECK (meta_mensal_qtd >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. TABELA DE LANÇAMENTOS E ORDENS DE SERVIÇO
CREATE TABLE IF NOT EXISTS public.service_launches (
  id TEXT PRIMARY KEY,
  numero_os TEXT NOT NULL,
  data_hora TEXT NOT NULL,
  cliente_id TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  cliente_cnpj TEXT DEFAULT '',
  contrato_centro_custo TEXT DEFAULT '',
  placa TEXT NOT NULL,
  modelo TEXT NOT NULL,
  km TEXT DEFAULT '',
  responsavel TEXT NOT NULL,
  nome_condutor TEXT NOT NULL,
  matricula_condutor TEXT NOT NULL,
  servicos JSONB NOT NULL DEFAULT '[]'::jsonb,
  valor_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (valor_total >= 0),
  assinatura TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Concluído',
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Garantir coluna contrato_centro_custo em tabelas existentes
ALTER TABLE public.service_launches ADD COLUMN IF NOT EXISTS contrato_centro_custo TEXT DEFAULT '';

-- ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_launches_data_hora ON public.service_launches(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_launches_cliente_id ON public.service_launches(cliente_id);
CREATE INDEX IF NOT EXISTS idx_launches_placa ON public.service_launches(placa);
CREATE INDEX IF NOT EXISTS idx_launches_numero_os ON public.service_launches(numero_os);
CREATE INDEX IF NOT EXISTS idx_services_codigo ON public.services(codigo);
CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON public.clients(cnpj);

-- TRIGGER AUTOMÁTICO DE UPDATED_AT
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_company_profile_updated_at ON public.company_profile;
CREATE TRIGGER set_company_profile_updated_at BEFORE UPDATE ON public.company_profile FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_services_updated_at ON public.services;
CREATE TRIGGER set_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_clients_updated_at ON public.clients;
CREATE TRIGGER set_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_goals_config_updated_at ON public.goals_config;
CREATE TRIGGER set_goals_config_updated_at BEFORE UPDATE ON public.goals_config FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_service_launches_updated_at ON public.service_launches;
CREATE TRIGGER set_service_launches_updated_at BEFORE UPDATE ON public.service_launches FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_launches ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS (LEITURA E ESCRITA PARA A CHAVE ANON DA APLICAÇÃO)
CREATE POLICY "Permitir select anon company_profile" ON public.company_profile FOR SELECT USING (true);
CREATE POLICY "Permitir all anon company_profile" ON public.company_profile FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir select anon services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Permitir all anon services" ON public.services FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir select anon clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Permitir all anon clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir select anon goals_config" ON public.goals_config FOR SELECT USING (true);
CREATE POLICY "Permitir all anon goals_config" ON public.goals_config FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir select anon service_launches" ON public.service_launches FOR SELECT USING (true);
CREATE POLICY "Permitir all anon service_launches" ON public.service_launches FOR ALL USING (true) WITH CHECK (true);

-- BUCKET DE STORAGE PARA FOTOS E ASSINATURAS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('autolava_media', 'autolava_media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Permitir upload publico storage autolava"
ON storage.objects FOR ALL
USING (bucket_id = 'autolava_media')
WITH CHECK (bucket_id = 'autolava_media');

-- SEED INICIAL DE METAS
INSERT INTO public.goals_config (id, meta_diaria, meta_semanal, meta_mensal, meta_diaria_qtd, meta_semanal_qtd, meta_mensal_qtd)
VALUES ('default', 800.00, 4800.00, 22000.00, 12, 70, 300)
ON CONFLICT (id) DO NOTHING;
