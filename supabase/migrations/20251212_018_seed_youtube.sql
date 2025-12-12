-- supabase/migrations/20251212_018_seed_youtube.sql
-- ============================================
-- SEED DE PREÇOS: YOUTUBE (Task 29.37.3)
-- ============================================

-- Limpar dados anteriores de YouTube para evitar duplicatas
DELETE FROM pricing_config WHERE video_type = 'youtube';

-- YouTube - Lo-fi Simples
INSERT INTO pricing_config (video_type, editing_style, duration_category, base_price, platform_fee_percent, estimated_delivery_days) VALUES
  ('youtube', 'lofi', '8m', 200.00, 15.00, 5),
  ('youtube', 'lofi', '12m', 280.00, 15.00, 7),
  ('youtube', 'lofi', '15m', 350.00, 15.00, 8),
  ('youtube', 'lofi', '25m', 500.00, 15.00, 12);

-- YouTube - Dinâmico
INSERT INTO pricing_config (video_type, editing_style, duration_category, base_price, platform_fee_percent, estimated_delivery_days) VALUES
  ('youtube', 'dynamic', '8m', 300.00, 15.00, 6),
  ('youtube', 'dynamic', '12m', 420.00, 15.00, 8),
  ('youtube', 'dynamic', '15m', 525.00, 15.00, 10),
  ('youtube', 'dynamic', '25m', 750.00, 15.00, 14);

-- YouTube - PRO
INSERT INTO pricing_config (video_type, editing_style, duration_category, base_price, platform_fee_percent, estimated_delivery_days) VALUES
  ('youtube', 'pro', '8m', 400.00, 15.00, 7),
  ('youtube', 'pro', '12m', 560.00, 15.00, 10),
  ('youtube', 'pro', '15m', 700.00, 15.00, 12),
  ('youtube', 'pro', '25m', 1000.00, 15.00, 18);

-- YouTube - Motion Design
INSERT INTO pricing_config (video_type, editing_style, duration_category, base_price, platform_fee_percent, estimated_delivery_days) VALUES
  ('youtube', 'motion', '8m', 800.00, 15.00, 14),
  ('youtube', 'motion', '12m', 1100.00, 15.00, 18),
  ('youtube', 'motion', '15m', 1400.00, 15.00, 21),
  ('youtube', 'motion', '25m', 2000.00, 15.00, 30);
