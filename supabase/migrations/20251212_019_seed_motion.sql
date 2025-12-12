-- supabase/migrations/20251212_019_seed_motion.sql
-- ============================================
-- PREÇOS: MOTION DESIGN (Task 29.37.4)
-- ============================================

-- Limpar dados anteriores de Motion para evitar duplicatas
DELETE FROM pricing_config WHERE video_type = 'motion';

-- Motion Design - PRO
INSERT INTO pricing_config (video_type, editing_style, duration_category, base_price, platform_fee_percent, estimated_delivery_days) VALUES
  ('motion', 'pro', '1m', 350.00, 15.00, 7),
  ('motion', 'pro', '2m', 500.00, 15.00, 10),
  ('motion', 'pro', '3m', 650.00, 15.00, 14),
  ('motion', 'pro', '5m', 900.00, 15.00, 21);

-- Motion Design - Motion Design (Premium)
INSERT INTO pricing_config (video_type, editing_style, duration_category, base_price, platform_fee_percent, estimated_delivery_days) VALUES
  ('motion', 'motion', '1m', 500.00, 15.00, 10),
  ('motion', 'motion', '2m', 700.00, 15.00, 14),
  ('motion', 'motion', '3m', 900.00, 15.00, 18),
  ('motion', 'motion', '5m', 1200.00, 15.00, 25);
