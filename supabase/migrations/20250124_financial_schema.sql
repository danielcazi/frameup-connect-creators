-- =====================================================
-- FASE 15: GESTÃO FINANCEIRA E DESCONTOS
-- =====================================================

-- Cupons de desconto
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL CHECK (char_length(code) BETWEEN 3 AND 50),
  
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount')) NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  min_project_value DECIMAL(10,2),
  
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  
  allowed_video_types text[], -- Changed from video_type_enum[] to text[]
  allowed_user_ids UUID[],
  first_purchase_only BOOLEAN DEFAULT FALSE,
  
  description TEXT,
  internal_notes TEXT,
  created_by UUID REFERENCES admin_users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(code) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_discount_codes_valid ON discount_codes(valid_from, valid_until);

-- Uso de cupons
CREATE TABLE IF NOT EXISTS discount_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discount_code_id UUID REFERENCES discount_codes(id) NOT NULL,
  project_id UUID REFERENCES projects(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  discount_applied DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2) NOT NULL,
  final_price DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_usage_code ON discount_usage(discount_code_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_user ON discount_usage(user_id);

-- Ajustes manuais de preço
CREATE TABLE IF NOT EXISTS project_price_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) UNIQUE NOT NULL,
  original_price DECIMAL(10,2) NOT NULL,
  new_price DECIMAL(10,2) NOT NULL CHECK (new_price > 0),
  reason TEXT NOT NULL,
  approved_by UUID REFERENCES admin_users(id) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alterar tabela projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES discount_codes(id);

-- FUNÇÃO PARA APLICAR DESCONTO
CREATE OR REPLACE FUNCTION apply_discount_code(
  p_code TEXT,
  p_user_id UUID,
  p_project_id UUID,
  p_original_price DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  v_discount RECORD;
  v_discount_amount DECIMAL;
  v_final_price DECIMAL;
BEGIN
  -- Buscar cupom
  SELECT * INTO v_discount
  FROM discount_codes
  WHERE code = p_code
  AND is_active = TRUE
  AND (valid_from IS NULL OR valid_from <= NOW())
  AND (valid_until IS NULL OR valid_until >= NOW())
  AND (max_uses IS NULL OR current_uses < max_uses)
  AND (min_project_value IS NULL OR p_original_price >= min_project_value);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupom inválido ou expirado');
  END IF;
  
  -- Calcular desconto
  IF v_discount.discount_type = 'percentage' THEN
    v_discount_amount := p_original_price * (v_discount.discount_value / 100);
  ELSE
    v_discount_amount := v_discount.discount_value;
  END IF;
  
  v_final_price := GREATEST(p_original_price - v_discount_amount, 0);
  
  -- Registrar uso
  INSERT INTO discount_usage (discount_code_id, project_id, user_id, discount_applied, original_price, final_price)
  VALUES (v_discount.id, p_project_id, p_user_id, v_discount_amount, p_original_price, v_final_price);
  
  -- Incrementar contador
  UPDATE discount_codes SET current_uses = current_uses + 1 WHERE id = v_discount.id;
  
  RETURN jsonb_build_object(
    'valid', true,
    'discount_amount', v_discount_amount,
    'final_price', v_final_price
  );
END;
$$ LANGUAGE plpgsql;
