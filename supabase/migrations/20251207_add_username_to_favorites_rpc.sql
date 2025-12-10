-- Add username to get_creator_favorites function return
-- This is needed for navigating to the correct profile URL /editor/profile/:username

CREATE OR REPLACE FUNCTION get_creator_favorites(
  p_creator_id UUID,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  favorite_id UUID,
  editor_id UUID,
  editor_name TEXT,
  editor_username TEXT, -- Added username
  editor_email TEXT,
  editor_photo TEXT,
  editor_bio TEXT,
  editor_specialties TEXT[],
  editor_rating NUMERIC,
  editor_total_projects INTEGER,
  note TEXT,
  favorited_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cf.id as favorite_id,
    cf.editor_id,
    COALESCE(u.full_name, 'Editor') as editor_name,
    COALESCE(u.username, '') as editor_username, -- Added username selection
    u.email as editor_email,
    u.profile_photo_url as editor_photo,
    ep.bio as editor_bio,
    ep.specialties as editor_specialties,
    COALESCE(
      (SELECT AVG(r.rating_overall) FROM reviews r WHERE r.reviewee_id = cf.editor_id),
      0
    )::NUMERIC as editor_rating,
    COALESCE(
      (SELECT COUNT(*) FROM projects pr 
       WHERE pr.assigned_editor_id = cf.editor_id 
       AND pr.status = 'completed')::INTEGER,
      0
    ) as editor_total_projects,
    cf.note,
    cf.created_at as favorited_at
  FROM creator_favorites cf
  JOIN users u ON u.id = cf.editor_id
  LEFT JOIN editor_profiles ep ON ep.user_id = cf.editor_id
  WHERE cf.creator_id = p_creator_id
    AND (
      p_search IS NULL
      OR u.full_name ILIKE '%' || p_search || '%'
      OR u.username ILIKE '%' || p_search || '%' -- Added search by username
      OR u.email ILIKE '%' || p_search || '%'
      OR cf.note ILIKE '%' || p_search || '%'
    )
  ORDER BY cf.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
