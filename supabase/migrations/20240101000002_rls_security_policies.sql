-- ==============================================================================
-- MIGRATION: 20240101000002_rls_security_policies.sql
-- Descrição: Habilitação de RLS e políticas de segurança permissivas para Web/Anon
-- ==============================================================================

-- 1. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_launches ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS DE ACESSO PARA TABELA: company_profile
DROP POLICY IF EXISTS "Permitir select anon em company_profile" ON public.company_profile;
CREATE POLICY "Permitir select anon em company_profile"
  ON public.company_profile FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir insert anon em company_profile" ON public.company_profile;
CREATE POLICY "Permitir insert anon em company_profile"
  ON public.company_profile FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update anon em company_profile" ON public.company_profile;
CREATE POLICY "Permitir update anon em company_profile"
  ON public.company_profile FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 3. POLÍTICAS DE ACESSO PARA TABELA: services
DROP POLICY IF EXISTS "Permitir select anon em services" ON public.services;
CREATE POLICY "Permitir select anon em services"
  ON public.services FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir insert anon em services" ON public.services;
CREATE POLICY "Permitir insert anon em services"
  ON public.services FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update anon em services" ON public.services;
CREATE POLICY "Permitir update anon em services"
  ON public.services FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir delete anon em services" ON public.services;
CREATE POLICY "Permitir delete anon em services"
  ON public.services FOR DELETE
  USING (true);

-- 4. POLÍTICAS DE ACESSO PARA TABELA: clients
DROP POLICY IF EXISTS "Permitir select anon em clients" ON public.clients;
CREATE POLICY "Permitir select anon em clients"
  ON public.clients FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir insert anon em clients" ON public.clients;
CREATE POLICY "Permitir insert anon em clients"
  ON public.clients FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update anon em clients" ON public.clients;
CREATE POLICY "Permitir update anon em clients"
  ON public.clients FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir delete anon em clients" ON public.clients;
CREATE POLICY "Permitir delete anon em clients"
  ON public.clients FOR DELETE
  USING (true);

-- 5. POLÍTICAS DE ACESSO PARA TABELA: goals_config
DROP POLICY IF EXISTS "Permitir select anon em goals_config" ON public.goals_config;
CREATE POLICY "Permitir select anon em goals_config"
  ON public.goals_config FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir insert anon em goals_config" ON public.goals_config;
CREATE POLICY "Permitir insert anon em goals_config"
  ON public.goals_config FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update anon em goals_config" ON public.goals_config;
CREATE POLICY "Permitir update anon em goals_config"
  ON public.goals_config FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 6. POLÍTICAS DE ACESSO PARA TABELA: service_launches
DROP POLICY IF EXISTS "Permitir select anon em service_launches" ON public.service_launches;
CREATE POLICY "Permitir select anon em service_launches"
  ON public.service_launches FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir insert anon em service_launches" ON public.service_launches;
CREATE POLICY "Permitir insert anon em service_launches"
  ON public.service_launches FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update anon em service_launches" ON public.service_launches;
CREATE POLICY "Permitir update anon em service_launches"
  ON public.service_launches FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir delete anon em service_launches" ON public.service_launches;
CREATE POLICY "Permitir delete anon em service_launches"
  ON public.service_launches FOR DELETE
  USING (true);
