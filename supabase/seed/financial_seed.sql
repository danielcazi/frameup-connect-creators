-- ================================================
-- SEED DATA PARA TESTES - FINANCIAL
-- NÃO EXECUTE EM PRODUÇÃO!
-- ================================================

-- Limpar dados existentes (apenas em dev)
-- TRUNCATE transactions CASCADE;

-- Inserir transações de exemplo dos últimos 30 dias
DO $$
DECLARE
  v_user_ids UUID[];
  v_project_ids UUID[];
  v_date DATE;
  v_amount NUMERIC;
  v_type TEXT;
  i INTEGER;
BEGIN
  -- Buscar alguns user_ids e project_ids existentes
  SELECT ARRAY_AGG(id) INTO v_user_ids FROM users LIMIT 10;
  SELECT ARRAY_AGG(id) INTO v_project_ids FROM projects LIMIT 10;
  
  -- Se não houver usuários/projetos, sair
  IF v_user_ids IS NULL OR v_project_ids IS NULL THEN
    RAISE NOTICE 'Não há usuários ou projetos para seed';
    RETURN;
  END IF;
  
  -- Gerar transações para os últimos 30 dias
  FOR i IN 0..29 LOOP
    v_date := CURRENT_DATE - i;
    
    -- 2-5 transações por dia
    FOR j IN 1..(2 + floor(random() * 4)::int) LOOP
      -- Tipo aleatório (mais projetos que assinaturas)
      IF random() < 0.7 THEN
        v_type := 'project_payment';
        v_amount := 150 + floor(random() * 850)::numeric; -- R$150 a R$1000
      ELSE
        v_type := 'subscription_payment';
        v_amount := CASE WHEN random() < 0.6 THEN 39.99 ELSE 79.99 END;
      END IF;
      
      INSERT INTO transactions (
        type,
        status,
        amount,
        platform_fee,
        net_amount,
        user_id,
        project_id,
        created_at,
        processed_at
      ) VALUES (
        v_type::transaction_type,
        'completed',
        v_amount,
        CASE WHEN v_type = 'project_payment' THEN v_amount * 0.05 ELSE 0 END,
        v_amount - CASE WHEN v_type = 'project_payment' THEN v_amount * 0.05 ELSE 0 END,
        v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int],
        CASE WHEN v_type = 'project_payment' 
          THEN v_project_ids[1 + floor(random() * array_length(v_project_ids, 1))::int]
          ELSE NULL 
        END,
        v_date + (random() * interval '24 hours'),
        v_date + (random() * interval '24 hours')
      );
    END LOOP;
    
    -- Algumas transações falhas (10% de chance)
    IF random() < 0.1 THEN
      INSERT INTO transactions (
        type,
        status,
        amount,
        platform_fee,
        net_amount,
        user_id,
        created_at
      ) VALUES (
        'project_payment',
        'failed',
        200 + floor(random() * 300)::numeric,
        0,
        0,
        v_user_ids[1 + floor(random() * array_length(v_user_ids, 1))::int],
        v_date + (random() * interval '24 hours')
      );
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Seed de transações concluído!';
END $$;

-- Atualizar resumos diários
SELECT update_financial_daily_summary(d::date)
FROM generate_series(CURRENT_DATE - 30, CURRENT_DATE, '1 day'::interval) d;
