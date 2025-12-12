-- supabase/migrations/20251212_016_pricing_seed_v2.sql
-- ============================================
-- SEED DE PREÇOS V2 (Nova Estrutura)
-- ============================================

-- Limpar tabela para garantir seed limpo
DELETE FROM pricing_config;

-- REELS (Vertical 9:16)
INSERT INTO pricing_config (video_type, editing_style, duration_category, base_price, estimated_delivery_days, platform_fee_percent) VALUES
  -- Reels Lo-fi (Edição básica, cortes simples)
  ('reels', 'lofi', '30s', 80.00, 3, 15),
  ('reels', 'lofi', '1m', 100.00, 4, 15),
  ('reels', 'lofi', '1m30s', 120.00, 4, 15),
  ('reels', 'lofi', '2m', 140.00, 5, 15),
  ('reels', 'lofi', '3m', 160.00, 6, 15),

  -- Reels Dynamic (Legendas animadas, broll, transições)
  ('reels', 'dynamic', '30s', 120.00, 4, 15),
  ('reels', 'dynamic', '1m', 150.00, 5, 15),
  ('reels', 'dynamic', '1m30s', 180.00, 6, 15),
  ('reels', 'dynamic', '2m', 210.00, 7, 15),
  ('reels', 'dynamic', '3m', 250.00, 8, 15),

  -- Reels Motion (Gráficos avançados, motion design pesado)
  ('reels', 'motion', '30s', 200.00, 6, 15),
  ('reels', 'motion', '1m', 300.00, 8, 15),
  ('reels', 'motion', '1m30s', 380.00, 9, 15),
  ('reels', 'motion', '2m', 450.00, 10, 15),
  ('reels', 'motion', '3m', 550.00, 12, 15);


-- YOUTUBE (Horizontal 16:9)
INSERT INTO pricing_config (video_type, editing_style, duration_category, base_price, estimated_delivery_days, platform_fee_percent) VALUES
  -- YouTube Lo-fi (Vlog simples, cortes secos)
  ('youtube', 'lofi', '8m', 250.00, 5, 15),
  ('youtube', 'lofi', '12m', 320.00, 6, 15),
  ('youtube', 'lofi', '15m', 380.00, 7, 15),
  ('youtube', 'lofi', '25m', 500.00, 9, 15),

  -- YouTube Dynamic (Estilo MrBeast/Retention, muitas interações)
  ('youtube', 'dynamic', '8m', 450.00, 8, 15),
  ('youtube', 'dynamic', '12m', 600.00, 10, 15),
  ('youtube', 'dynamic', '15m', 750.00, 12, 15),
  ('youtube', 'dynamic', '25m', 1000.00, 15, 15),

  -- YouTube Motion (Documentário, explicado com motion graphics)
  ('youtube', 'motion', '8m', 800.00, 12, 15),
  ('youtube', 'motion', '12m', 1100.00, 15, 15),
  ('youtube', 'motion', '15m', 1400.00, 18, 15),
  ('youtube', 'motion', '25m', 2000.00, 25, 15);

-- Confirmar seed
-- SELECT count(*) FROM pricing_config;
