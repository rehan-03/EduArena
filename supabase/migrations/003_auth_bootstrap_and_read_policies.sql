-- ============================================================
-- EduArena Semester IV - Auth bootstrap + missing read policies
-- ============================================================

-- ------------------------------------------------------------
-- 1) Ensure RLS is enabled on catalog/content tables
-- ------------------------------------------------------------
ALTER TABLE subjects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE units          ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_problems ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 2) users table policies
-- ------------------------------------------------------------
DROP POLICY IF EXISTS users_self_select ON users;
CREATE POLICY users_self_select ON users
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS users_authenticated_read ON users;
CREATE POLICY users_authenticated_read ON users
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS users_self_insert ON users;
CREATE POLICY users_self_insert ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS users_self_update ON users;
CREATE POLICY users_self_update ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------
-- 3) Read policies for syllabus/catalog tables
-- ------------------------------------------------------------
DROP POLICY IF EXISTS subjects_public_read ON subjects;
CREATE POLICY subjects_public_read ON subjects
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS units_public_read ON units;
CREATE POLICY units_public_read ON units
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS mcq_questions_public_read ON mcq_questions;
CREATE POLICY mcq_questions_public_read ON mcq_questions
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS coding_problems_public_read ON coding_problems;
CREATE POLICY coding_problems_public_read ON coding_problems
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 4) Auto-create public.users row from auth.users
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Student');

  INSERT INTO public.users (id, email, name, role, branch, semester)
  VALUES (NEW.id, NEW.email, v_name, 'student', 'CE', 4)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_auth_user();

-- ------------------------------------------------------------
-- 5) RPC for frontend safety: ensure profile row exists
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_current_user_profile()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_email TEXT;
  v_name TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT au.email, COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1), 'Student')
  INTO v_email, v_name
  FROM auth.users au
  WHERE au.id = v_uid;

  INSERT INTO public.users (id, email, name, role, branch, semester)
  VALUES (v_uid, v_email, v_name, 'student', 'CE', 4)
  ON CONFLICT (id) DO NOTHING;

  RETURN v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_current_user_profile() TO authenticated;
