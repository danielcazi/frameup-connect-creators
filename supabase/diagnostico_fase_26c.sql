-- ============================================
-- DIAGNÓSTICO COMPLETO - FASE 26.C
-- ============================================

-- 1. Verificar se tabela portfolio_videos existe
SELECT 
  'portfolio_videos' as tabela,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'portfolio_videos'
  ) THEN '✅ EXISTE' ELSE '❌ NÃO EXISTE' END as status;

-- 2. Ver estrutura da tabela (se existir)
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'portfolio_videos'
ORDER BY ordinal_position;

-- 3. Verificar RLS está habilitado
SELECT 
  relname as tabela,
  CASE WHEN relrowsecurity THEN '✅ RLS ON' ELSE '❌ RLS OFF' END as rls_status
FROM pg_class
WHERE relname = 'portfolio_videos'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 4. Listar policies existentes
SELECT 
  policyname, 
  cmd, 
  qual::text as using_expression,
  with_check::text as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'portfolio_videos';

-- 5. Verificar bucket avatars
SELECT 
  id, 
  name, 
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'avatars';

-- 6. Verificar policies do storage para bucket avatars
SELECT 
  policyname, 
  cmd,
  qual::text as using_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%avatar%';

-- 7. Contar registros existentes
SELECT 
  (SELECT COUNT(*) FROM portfolio_videos) as total_videos,
  (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'avatars') as total_avatars;

-- 8. Verificar Foreign Keys (editor_id referenciando auth.users)
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'portfolio_videos';

-- 9. Verificar tabela users
SELECT 
  'users' as tabela,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'users'
  ) THEN '✅ EXISTE' ELSE '❌ NÃO EXISTE' END as status;

-- 10. Verificar coluna profile_photo_url na tabela users
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'profile_photo_url';

-- 11. Listar todas as migrações aplicadas
SELECT 
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
ORDER BY executed_at DESC
LIMIT 10;

-- 12. Verificar todos os buckets de storage
SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets
ORDER BY created_at DESC;

-- 13. Verificar se há registros de exemplo em portfolio_videos
SELECT 
  id,
  editor_id,
  video_url,
  video_type,
  position,
  created_at
FROM portfolio_videos
LIMIT 5;
