-- ============================================================
-- EduArena Semester IV - Leaderboard automation + helper RPCs
-- ============================================================

-- -----------------------------
-- 1) RLS fixes for INSERT paths
-- -----------------------------
DROP POLICY IF EXISTS students_own_sessions ON quiz_sessions;
CREATE POLICY students_own_sessions ON quiz_sessions
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY students_insert_own_sessions ON quiz_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY students_update_own_sessions ON quiz_sessions
  FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS students_own_attempts ON mcq_attempts;
CREATE POLICY students_own_attempts ON mcq_attempts
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM quiz_sessions WHERE student_id = auth.uid()
    )
  );

CREATE POLICY students_insert_own_attempts ON mcq_attempts
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM quiz_sessions WHERE student_id = auth.uid()
    )
  );

CREATE POLICY students_update_own_attempts ON mcq_attempts
  FOR UPDATE
  USING (
    session_id IN (
      SELECT id FROM quiz_sessions WHERE student_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM quiz_sessions WHERE student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS students_own_submissions ON code_submissions;
CREATE POLICY students_own_submissions ON code_submissions
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY students_insert_own_submissions ON code_submissions
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY students_update_own_submissions ON code_submissions
  FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS questions_public_read ON mcq_questions;
CREATE POLICY questions_public_read ON mcq_questions
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY faculty_manage_questions ON mcq_questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('faculty', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('faculty', 'super_admin')
    )
  );

-- -----------------------------
-- 2) Leaderboard auto-update
-- -----------------------------
CREATE OR REPLACE FUNCTION update_leaderboard_for_subject(p_student_id UUID, p_subject_id INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_score INT;
  v_quizzes_taken INT;
  v_total_max_score INT;
  v_avg_accuracy NUMERIC(5,2);
BEGIN
  SELECT
    COALESCE(SUM(score), 0),
    COUNT(*),
    COALESCE(SUM(max_score), 0)
  INTO v_total_score, v_quizzes_taken, v_total_max_score
  FROM quiz_sessions
  WHERE student_id = p_student_id
    AND subject_id = p_subject_id
    AND status IN ('submitted', 'timed_out');

  IF v_total_max_score = 0 THEN
    v_avg_accuracy := 0;
  ELSE
    v_avg_accuracy := ROUND((v_total_score::NUMERIC / v_total_max_score::NUMERIC) * 100, 2);
  END IF;

  INSERT INTO leaderboard (
    student_id,
    subject_id,
    total_score,
    quizzes_taken,
    avg_accuracy,
    last_updated
  )
  VALUES (
    p_student_id,
    p_subject_id,
    v_total_score,
    v_quizzes_taken,
    v_avg_accuracy,
    NOW()
  )
  ON CONFLICT (student_id, subject_id)
  DO UPDATE SET
    total_score = EXCLUDED.total_score,
    quizzes_taken = EXCLUDED.quizzes_taken,
    avg_accuracy = EXCLUDED.avg_accuracy,
    last_updated = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION trg_quiz_sessions_sync_leaderboard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IN ('submitted', 'timed_out') THEN
    PERFORM update_leaderboard_for_subject(NEW.student_id, NEW.subject_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quiz_sessions_sync_leaderboard ON quiz_sessions;
CREATE TRIGGER quiz_sessions_sync_leaderboard
AFTER INSERT OR UPDATE OF status, score, max_score, subject_id, student_id
ON quiz_sessions
FOR EACH ROW
EXECUTE FUNCTION trg_quiz_sessions_sync_leaderboard();

-- -----------------------------
-- 3) Admin helper RPCs
-- -----------------------------
CREATE OR REPLACE FUNCTION check_question_duplicate(
  p_unit_id INT,
  p_question_text TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM mcq_questions q
    WHERE q.unit_id = p_unit_id
      AND lower(trim(q.question_text)) = lower(trim(p_question_text))
  );
$$;

CREATE OR REPLACE FUNCTION create_mcq_question(
  p_unit_id INT,
  p_question_text TEXT,
  p_option_a TEXT,
  p_option_b TEXT,
  p_option_c TEXT,
  p_option_d TEXT,
  p_correct_option CHAR(1),
  p_difficulty TEXT DEFAULT 'medium',
  p_explanation TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF check_question_duplicate(p_unit_id, p_question_text) THEN
    RAISE EXCEPTION 'Duplicate question text detected for this unit';
  END IF;

  INSERT INTO mcq_questions (
    unit_id,
    question_text,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_option,
    difficulty,
    explanation,
    uploaded_by
  )
  VALUES (
    p_unit_id,
    p_question_text,
    p_option_a,
    p_option_b,
    p_option_c,
    p_option_d,
    p_correct_option,
    p_difficulty,
    p_explanation,
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION check_question_duplicate(INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_mcq_question(INT, TEXT, TEXT, TEXT, TEXT, TEXT, CHAR(1), TEXT, TEXT) TO authenticated;
