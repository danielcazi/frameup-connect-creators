-- supabase/migrations/20251212_017_seed_reels.sql
-- ============================================
-- SEED DE PREÇOS: REELS (Task 29.37.2)
-- ============================================

-- Limpar dados anteriores de Reels para evitar duplicatas/conflitos
DELETE FROM pricing_config WHERE video_type = 'reels';

-- Reels - Lo-fi Simples
INSERT INTO pricing_config (video_type, editing_style, duration_category, base_price, platform_fee_percent, estimated_delivery_days) VALUES
  ('reels', 'lofi', '30s', 80.00, 15.00, 3),
  ('reels', 'lofi', '1m', 100.00, 15.00, 4),
  ('reels', 'lofi', '1m30s', 110.00, 15.00, 4),
  ('reels', 'lofi', '2m', 120.00, 15.00, 5);

-- Reels - Dinâmico
INSERT INTO pricing_config (video_type, editing_style, duration_category, base_price, platform_fee_percent, estimated_delivery_days) VALUES
  ('reels', 'dynamic', '30s', 120.00, 15.00, 4),
  ('reels', 'dynamic', '1m', 150.00, 15.00, 5),
  ('reels', 'dynamic', '1m30s', 165.00, 15.00, 5),
  ('reels', 'dynamic', '2m', 180.00, 15.00, 6);

-- Reels - PRO
INSERT INTO pricing_config (video_type, editing_style, duration_category, base_price, platform_fee_percent, estimated_delivery_days) VALUES
  ('reels', 'pro', '30s', 180.00, 15.00, 5),
  ('reels', 'pro', '1m', 220.00, 15.00, 6),
  ('reels', 'pro', '1m30s', 240.00, 15.00, 6),
  ('reels', 'pro', '2m', 260.00, 15.00, 7);
