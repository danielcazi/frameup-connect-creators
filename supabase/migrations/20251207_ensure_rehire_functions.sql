-- ================================================
-- RE-APPLY REHIRE FUNCTIONS
-- Ensures all necessary functions for rehire system are present
-- ================================================

-- 1. Ensure Types
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status_enum') THEN
        ALTER TYPE project_status_enum ADD VALUE IF NOT EXISTS 'pending_acceptance' AFTER 'draft';
    END IF;
END$$;

-- 2. Ensure Columns
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS is_rehire BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rehire_editor_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rehire_message TEXT,
ADD COLUMN IF NOT EXISTS rehire_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rehire_responded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rehire_rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_pending_acceptance 
ON projects(rehire_editor_id, status) 
WHERE status = 'pending_acceptance';

-- 3. Ensure View
CREATE OR REPLACE VIEW creator_worked_editors AS
SELECT DISTINCT
  p.creator_id,
  p.assigned_editor_id as editor_id,
  pr.full_name as editor_name,
  pr.username as editor_username,
  pr.profile_photo_url as editor_photo,
  ep.rating_average as editor_rating,
  (SELECT COUNT(*) FROM projects WHERE assigned_editor_id = p.assigned_editor_id AND status = 'completed') as editor_total_projects,
  ep.specialties as editor_specialties,
  COUNT(p.id) OVER (PARTITION BY p.creator_id, p.assigned_editor_id) as projects_together,
  MAX(p.updated_at) OVER (PARTITION BY p.creator_id, p.assigned_editor_id) as last_project_at,
  (
    SELECT r.rating_overall 
    FROM reviews r 
    WHERE r.reviewer_id = p.creator_id 
      AND r.reviewee_id = p.assigned_editor_id 
    ORDER BY r.created_at DESC 
    LIMIT 1
  ) as last_rating_given
FROM projects p
JOIN users pr ON pr.id = p.assigned_editor_id
LEFT JOIN editor_profiles ep ON ep.user_id = p.assigned_editor_id
WHERE p.status = 'completed'
  AND p.assigned_editor_id IS NOT NULL;

-- 4. Create Functions

-- can_rehire_editor
CREATE OR REPLACE FUNCTION can_rehire_editor(
  p_creator_id UUID,
  p_editor_id UUID
) RETURNS TABLE (
  can_rehire BOOLEAN,
  reason TEXT
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM projects 
    WHERE creator_id = p_creator_id 
    AND assigned_editor_id = p_editor_id 
    AND status = 'completed'
  ) THEN
    RETURN QUERY SELECT FALSE, 'Você nunca trabalhou com este editor';
    RETURN;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM projects 
    WHERE creator_id = p_creator_id 
    AND rehire_editor_id = p_editor_id 
    AND status = 'pending_acceptance'
  ) THEN
    RETURN QUERY SELECT FALSE, 'Você já tem uma proposta pendente para este editor';
    RETURN;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_editor_id 
    AND user_type = 'editor'
  ) THEN
    RETURN QUERY SELECT FALSE, 'Este editor não está mais disponível';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_rehire_editors
CREATE OR REPLACE FUNCTION get_rehire_editors(p_creator_id UUID)
RETURNS TABLE (
  editor_id UUID,
  editor_name TEXT,
  editor_photo TEXT,
  editor_rating NUMERIC,
  editor_specialties TEXT[],
  projects_together BIGINT,
  last_project_at TIMESTAMP WITH TIME ZONE,
  last_rating_given NUMERIC,
  has_pending_proposal BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cwe.editor_id,
    cwe.editor_name,
    cwe.editor_photo,
    cwe.editor_rating,
    cwe.editor_specialties,
    cwe.projects_together,
    cwe.last_project_at,
    cwe.last_rating_given,
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.creator_id = p_creator_id 
      AND p.rehire_editor_id = cwe.editor_id 
      AND p.status = 'pending_acceptance'
    ) as has_pending_proposal
  FROM creator_worked_editors cwe
  WHERE cwe.creator_id = p_creator_id
  ORDER BY cwe.last_project_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- create_rehire_project
CREATE OR REPLACE FUNCTION create_rehire_project(
  p_creator_id UUID,
  p_editor_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_video_type TEXT,
  p_editing_style TEXT,
  p_duration_category TEXT,
  p_base_price DECIMAL,
  p_platform_fee DECIMAL,
  p_total_price DECIMAL,
  p_deadline_days INTEGER DEFAULT NULL,
  p_reference_files_url TEXT DEFAULT NULL,
  p_context_description TEXT DEFAULT NULL,
  p_rehire_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_can_rehire BOOLEAN;
  v_reason TEXT;
  v_project_id UUID;
BEGIN
  SELECT can_rehire, reason INTO v_can_rehire, v_reason
  FROM can_rehire_editor(p_creator_id, p_editor_id);
  
  IF NOT v_can_rehire THEN
    RAISE EXCEPTION '%', v_reason;
  END IF;
  
  INSERT INTO projects (
    creator_id,
    title,
    description,
    video_type,
    editing_style,
    duration_category,
    base_price,
    platform_fee,
    platform_fee_percentage,
    total_paid_by_creator,
    editor_receives,
    deadline_days,
    reference_files_url,
    context_description,
    status,
    is_rehire,
    rehire_editor_id,
    rehire_message,
    rehire_sent_at
  ) VALUES (
    p_creator_id,
    p_title,
    p_description,
    p_video_type,
    p_editing_style,
    p_duration_category,
    p_base_price,
    p_platform_fee,
    5,
    p_total_price,
    p_base_price,
    p_deadline_days,
    p_reference_files_url,
    p_context_description,
    'pending_acceptance',
    TRUE,
    p_editor_id,
    p_rehire_message,
    NOW()
  ) RETURNING id INTO v_project_id;
  
  RETURN v_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- accept_rehire_proposal
CREATE OR REPLACE FUNCTION accept_rehire_proposal(
  p_project_id UUID,
  p_editor_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_project RECORD;
BEGIN
  SELECT * INTO v_project
  FROM projects
  WHERE id = p_project_id 
    AND rehire_editor_id = p_editor_id
    AND status = 'pending_acceptance';
  
  IF v_project IS NULL THEN
    RAISE EXCEPTION 'Proposta não encontrada ou já respondida';
  END IF;
  
  UPDATE projects
  SET 
    status = 'open',
    assigned_editor_id = p_editor_id,
    rehire_responded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_project_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- reject_rehire_proposal
CREATE OR REPLACE FUNCTION reject_rehire_proposal(
  p_project_id UUID,
  p_editor_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE projects
  SET 
    status = 'draft',
    rehire_editor_id = NULL,
    rehire_responded_at = NOW(),
    rehire_rejection_reason = p_reason,
    is_rehire = FALSE,
    updated_at = NOW()
  WHERE id = p_project_id 
    AND rehire_editor_id = p_editor_id
    AND status = 'pending_acceptance';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_editor_rehire_proposals (MISSING FUNCTION)
CREATE OR REPLACE FUNCTION get_editor_rehire_proposals(p_editor_id UUID)
RETURNS TABLE (
  project_id UUID,
  project_title TEXT,
  project_description TEXT,
  video_type TEXT,
  editing_style TEXT,
  duration_category TEXT,
  base_price DECIMAL,
  deadline_days INTEGER,
  creator_id UUID,
  creator_name TEXT,
  creator_photo TEXT,
  rehire_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  projects_with_creator BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as project_id,
    p.title as project_title,
    p.description as project_description,
    p.video_type,
    p.editing_style,
    p.duration_category,
    p.base_price,
    p.deadline_days,
    p.creator_id,
    COALESCE(pr.full_name, pr.username, 'Creator') as creator_name,
    pr.profile_photo_url as creator_photo,
    p.rehire_message,
    p.rehire_sent_at as sent_at,
    (
      SELECT COUNT(*) FROM projects p2 
      WHERE p2.creator_id = p.creator_id 
      AND p2.assigned_editor_id = p_editor_id 
      AND p2.status = 'completed'
    ) as projects_with_creator
  FROM projects p
  JOIN users pr ON pr.id = p.creator_id
  WHERE p.rehire_editor_id = p_editor_id
    AND p.status = 'pending_acceptance'
  ORDER BY p.rehire_sent_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_pending_proposals_count
CREATE OR REPLACE FUNCTION get_pending_proposals_count(p_editor_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM projects
    WHERE rehire_editor_id = p_editor_id
      AND status = 'pending_acceptance'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Permissions
GRANT EXECUTE ON FUNCTION can_rehire_editor TO authenticated;
GRANT EXECUTE ON FUNCTION get_rehire_editors TO authenticated;
GRANT EXECUTE ON FUNCTION create_rehire_project TO authenticated;
GRANT EXECUTE ON FUNCTION accept_rehire_proposal TO authenticated;
GRANT EXECUTE ON FUNCTION reject_rehire_proposal TO authenticated;
GRANT EXECUTE ON FUNCTION get_editor_rehire_proposals TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_proposals_count TO authenticated;
GRANT SELECT ON creator_worked_editors TO authenticated;
