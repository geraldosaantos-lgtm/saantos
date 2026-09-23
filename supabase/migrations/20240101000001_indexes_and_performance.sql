-- ==============================================================================
-- MIGRATION: 20240101000001_indexes_and_performance.sql
-- Descrição: Índices B-Tree e triggers para atualização de updated_at automática
-- ==============================================================================

-- 1. ÍNDICES DE BUSCA E RELATÓRIOS
CREATE INDEX IF NOT EXISTS idx_launches_data_hora ON public.service_launches(data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_launches_cliente_id ON public.service_launches(cliente_id);
CREATE INDEX IF NOT EXISTS idx_launches_placa ON public.service_launches(placa);
CREATE INDEX IF NOT EXISTS idx_launches_numero_os ON public.service_launches(numero_os);
CREATE INDEX IF NOT EXISTS idx_launches_status ON public.service_launches(status);

CREATE INDEX IF NOT EXISTS idx_services_codigo ON public.services(codigo);
CREATE INDEX IF NOT EXISTS idx_services_ativo ON public.services(ativo);

CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON public.clients(cnpj);
CREATE INDEX IF NOT EXISTS idx_clients_ativo ON public.clients(ativo);

-- 2. FUNÇÃO E TRIGGER PARA ATUALIZAR AUTOMATICAMENTE updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para cada tabela
DROP TRIGGER IF EXISTS set_company_profile_updated_at ON public.company_profile;
CREATE TRIGGER set_company_profile_updated_at
  BEFORE UPDATE ON public.company_profile
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_services_updated_at ON public.services;
CREATE TRIGGER set_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_clients_updated_at ON public.clients;
CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_goals_config_updated_at ON public.goals_config;
CREATE TRIGGER set_goals_config_updated_at
  BEFORE UPDATE ON public.goals_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_service_launches_updated_at ON public.service_launches;
CREATE TRIGGER set_service_launches_updated_at
  BEFORE UPDATE ON public.service_launches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
