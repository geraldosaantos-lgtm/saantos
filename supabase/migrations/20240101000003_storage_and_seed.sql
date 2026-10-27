-- ==============================================================================
-- MIGRATION: 20240101000003_storage_and_seed.sql
-- Descrição: Configuração de bucket no Supabase Storage e dados padrão de inicialização
-- ==============================================================================

-- 1. BUCKET DE STORAGE PÚBLICO PARA LOGOS E ASSINATURAS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'autolava_media',
  'autolava_media',
  true,
  5242880, -- 5MB limite por arquivo
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880;

-- Políticas de Storage
DROP POLICY IF EXISTS "Permitir leitura publica de midia autolava" ON storage.objects;
CREATE POLICY "Permitir leitura publica de midia autolava"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'autolava_media');

DROP POLICY IF EXISTS "Permitir upload publico de midia autolava" ON storage.objects;
CREATE POLICY "Permitir upload publico de midia autolava"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'autolava_media');

DROP POLICY IF EXISTS "Permitir update publico de midia autolava" ON storage.objects;
CREATE POLICY "Permitir update publico de midia autolava"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'autolava_media');

DROP POLICY IF EXISTS "Permitir delete publico de midia autolava" ON storage.objects;
CREATE POLICY "Permitir delete publico de midia autolava"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'autolava_media');

-- 2. SEED: DADOS INICIAIS DE METAS (Se tabela estiver vazia)
INSERT INTO public.goals_config (
  id, meta_diaria, meta_semanal, meta_mensal, meta_diaria_qtd, meta_semanal_qtd, meta_mensal_qtd
) VALUES (
  'default', 800.00, 4800.00, 22000.00, 12, 70, 300
)
ON CONFLICT (id) DO NOTHING;

-- 3. SEED: CATÁLOGO PADRÃO DE SERVIÇOS AUTOMOTIVOS
INSERT INTO public.services (id, codigo, nome, categoria, preco_padrao, descricao, ativo)
VALUES
  ('srv-1', 'LAV-01', 'Lavagem Simples (Ducha + Secagem)', 'Passeio / Leve', 35.00, 'Lavagem externa com xampu neutro, caixa de rodas e secagem rápida', true),
  ('srv-2', 'LAV-02', 'Lavagem Completa com Cera Líquida', 'Passeio / Leve', 60.00, 'Lavagem externa, aspiração interna profunda, silicone nos plásticos e cera de proteção', true),
  ('srv-3', 'LAV-03', 'Lavagem Completa SUV / Camionete', 'SUV / Caminhonete', 85.00, 'Lavagem externa detalhada, aspiração de porta-malas, revitalização de pneus e painel', true),
  ('srv-4', 'LAV-04', 'Higienização Interna e Bancos', 'Especial', 180.00, 'Higienização a vapor dos bancos, teto, carpetes e eliminação de odores', true),
  ('srv-5', 'LAV-05', 'Polimento Técnico e Cristalização', 'Especial', 350.00, 'Correção de verniz, eliminação de micro-riscos e selante de alta durabilidade', true),
  ('srv-6', 'LAV-06', 'Lavagem de Chassi e Motor', 'Pesado / Utilitário', 120.00, 'Desengraxe térmico de motor e lavagem de suspensão com produto biodegradável', true)
ON CONFLICT (id) DO NOTHING;
