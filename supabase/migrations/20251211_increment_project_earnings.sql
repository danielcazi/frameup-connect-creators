-- =====================================================
-- FUNÇÃO RPC: Incrementar ganhos liberados do projeto
-- =====================================================
CREATE OR REPLACE FUNCTION increment_project_earnings(
  p_project_id UUID,
  p_amount DECIMAL(10,2)
)
RETURNS VOID AS $$
BEGIN
  UPDATE projects
  SET 
    editor_earnings_released = COALESCE(editor_earnings_released, 0) + p_amount,
    videos_approved = COALESCE(videos_approved, 0) + 1,
    updated_at = NOW()
  WHERE id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION increment_project_earnings TO authenticated;
