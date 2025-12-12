-- supabase/migrations/20251212_014_pricing_seed.sql
-- ============================================
-- POPULAR DADOS INICIAIS
-- ============================================

-- Inserir preços padrão (REELS)
INSERT INTO pricing_config (video_type, editing_style, duration_category, base_price, estimated_delivery_days) VALUES
  -- Reels Lo-fi
  ('reels', 'lofi', '30s', 80.00, 3),
  ('reels', 'lofi', '1m', 100.00, 4),
  ('reels', 'lofi', '2m', 120.00, 5),
  ('reels', 'lofi', '5m', 150.00, 7),
  
  -- Reels Dynamic
  ('reels', 'dynamic', '30s', 120.00, 4),
  ('reels', 'dynamic', '1m', 150.00, 5),
  ('reels', 'dynamic', '2m', 180.00, 6),
  ('reels', 'dynamic', '5m', 220.00, 8),
  
  -- Reels PRO
  ('reels', 'pro', '30s', 180.00, 5),
  ('reels', 'pro', '1m', 220.00, 6),
  ('reels', 'pro', '2m', 260.00, 7),
  ('reels', 'pro', '5m', 320.00, 10),
  
  -- YouTube Lo-fi
  ('youtube', 'lofi', '30s', 100.00, 3),
  ('youtube', 'lofi', '1m', 130.00, 4),
  ('youtube', 'lofi', '2m', 160.00, 5),
  ('youtube', 'lofi', '5m', 200.00, 7),
  
  -- YouTube Dynamic
  ('youtube', 'dynamic', '30s', 150.00, 4),
  ('youtube', 'dynamic', '1m', 190.00, 5),
  ('youtube', 'dynamic', '2m', 230.00, 6),
  ('youtube', 'dynamic', '5m', 280.00, 8),
  
  -- YouTube PRO
  ('youtube', 'pro', '30s', 220.00, 5),
  ('youtube', 'pro', '1m', 280.00, 6),
  ('youtube', 'pro', '2m', 340.00, 7),
  ('youtube', 'pro', '5m', 420.00, 10),
  
  -- Motion Design
  ('motion', 'motion', '30s', 300.00, 7),
  ('motion', 'motion', '1m', 400.00, 10),
  ('motion', 'motion', '2m', 550.00, 14),
  ('motion', 'motion', '5m', 750.00, 21)
ON CONFLICT (video_type, editing_style, duration_category) DO NOTHING;

-- Configurações globais padrão
INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
  ('batch_discounts', '{"4": 5, "7": 8, "10": 10}'::jsonb, 'Descontos progressivos por quantidade (quantidade: desconto%)'),
  ('platform_fee_percent', '15'::jsonb, 'Taxa da plataforma global (%)'),
  ('simultaneous_delivery_multiplier', '1.2'::jsonb, 'Multiplicador para entrega simultânea (+20%)'),
  ('free_revisions_limit', '2'::jsonb, 'Número de revisões gratuitas incluídas'),
  ('extra_revision_cost_percent', '20'::jsonb, 'Custo adicional de revisões extras (% do valor do vídeo)'),
  ('min_batch_quantity', '4'::jsonb, 'Quantidade mínima de vídeos em lote'),
  ('max_batch_quantity', '20'::jsonb, 'Quantidade máxima de vídeos em lote')
ON CONFLICT (setting_key) DO NOTHING;
