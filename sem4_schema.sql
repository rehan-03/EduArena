-- ============================================================
-- EduArena — Semester IV Schema
-- K.K. Wagh Institute, B.Tech Computer Engineering (2023 Pattern)
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. USERS
-- ─────────────────────────────────────────────
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,          -- must end with @kkwagh.edu.in
  name         TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'student'
                 CHECK (role IN ('student', 'faculty', 'super_admin')),
  branch       TEXT NOT NULL DEFAULT 'CE',
  semester     INT  NOT NULL DEFAULT 4,
  prn          TEXT UNIQUE,                   -- college PRN number
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 2. SUBJECTS  (Sem IV only)
-- ─────────────────────────────────────────────
CREATE TABLE subjects (
  id           SERIAL PRIMARY KEY,
  course_code  TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  course_type  TEXT,                          -- PCC / BSC / MDM / OE / VSEC / AEC
  semester     INT NOT NULL DEFAULT 4,
  has_mcq      BOOLEAN DEFAULT true,         -- false for lab-only / value courses
  has_coding   BOOLEAN DEFAULT false
);

INSERT INTO subjects (course_code, title, course_type, has_mcq, has_coding) VALUES
  ('2300211A', 'Probability & Statistics',             'BSC', true,  false),
  ('2301212',  'Data Structures',                      'PCC', true,  true),
  ('2301213',  'Software Engineering',                 'PCC', true,  false),
  ('2301214',  'Java Programming Lab',                 'PCC', false, true),
  ('2301215',  'Data Structures Lab',                  'PCC', false, true),
  ('2301216',  'Data Communication and Networking',    'MDM', true,  false),
  ('2301217',  'DCN Lab',                              'MDM', false, false),
  ('2301218',  'Customer Relationship Management',     'OE',  true,  false),
  ('2301219',  'Universal Human Values',               'VSEC',true,  false),
  ('2301220',  'Foreign Language',                     'AEC', false, false);

-- ─────────────────────────────────────────────
-- 3. UNITS  (per subject, exact from syllabus)
-- ─────────────────────────────────────────────
CREATE TABLE units (
  id           SERIAL PRIMARY KEY,
  subject_id   INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  unit_number  INT NOT NULL,
  title        TEXT NOT NULL,
  hours        INT,                           -- lecture hours as per syllabus
  co_mapped    TEXT                           -- e.g. 'CO1,CO2'
);

-- Probability & Statistics  (2300211A)
INSERT INTO units (subject_id, unit_number, title, hours, co_mapped) VALUES
  (1, 1, 'Descriptive Measures',                      8, 'CO1,CO2,CO4,CO5'),
  (1, 2, 'Random Variable & Distribution Functions',  7, 'CO1,CO3,CO4,CO5'),
  (1, 3, 'Probability Distributions',                 7, 'CO1,CO3,CO4,CO5'),
  (1, 4, 'Bivariate Distribution Functions',          7, 'CO1,CO3,CO4,CO5'),
  (1, 5, 'Correlation and Regression',                7, 'CO1,CO2,CO4,CO5');

-- Data Structures  (2301212)
INSERT INTO units (subject_id, unit_number, title, hours, co_mapped) VALUES
  (2, 1, 'Introduction to Data Structures and Algorithms', 9, 'CO1,CO2,CO3'),
  (2, 2, 'Multidimensional Arrays and Memory Representation', 8, 'CO1,CO2,CO3'),
  (2, 3, 'Linked Lists',                              8, 'CO1,CO2,CO3'),
  (2, 4, 'Stack & Queue',                             9, 'CO1,CO2,CO4'),
  (2, 5, 'Hashing',                                   6, 'CO1,CO2,CO5');

-- Software Engineering  (2301213)
INSERT INTO units (subject_id, unit_number, title, hours, co_mapped) VALUES
  (3, 1, 'Introduction to SE and Software Process Models', 8, 'CO1'),
  (3, 2, 'Software Requirements Engineering and Analysis', 7, 'CO2'),
  (3, 3, 'Estimation and Scheduling',                  7, 'CO3'),
  (3, 4, 'Design Engineering',                         7, 'CO4'),
  (3, 5, 'Software Testing',                           7, 'CO5');

-- Data Communication and Networking  (2301216)
INSERT INTO units (subject_id, unit_number, title, hours, co_mapped) VALUES
  (6, 1, 'Data Communications',                       6, 'CO1'),
  (6, 2, 'Data Link Layer',                           8, 'CO2'),
  (6, 3, 'Network Layer',                             8, 'CO3'),
  (6, 4, 'Transport Layer',                           8, 'CO4'),
  (6, 5, 'Application Layer',                         6, 'CO5');

-- Customer Relationship Management  (2301218)
INSERT INTO units (subject_id, unit_number, title, hours, co_mapped) VALUES
  (8, 1, 'Evolution of Customer Relationship',        4, 'CO1'),
  (8, 2, 'CRM Concepts',                              6, 'CO2'),
  (8, 3, 'Planning for CRM',                          6, 'CO3'),
  (8, 4, 'Marketing Strategy',                        4, 'CO4'),
  (8, 5, 'CRM Planning and Implementation',           4, 'CO5');

-- Universal Human Values  (2301219)
INSERT INTO units (subject_id, unit_number, title, hours, co_mapped) VALUES
  (9, 1, 'Introduction - Basic Human Aspiration',     5, 'CO1'),
  (9, 2, 'Right Understanding',                       5, 'CO2'),
  (9, 3, 'Understanding Human Being',                 5, 'CO3'),
  (9, 4, 'Understanding Nature and Existence',        5, 'CO4'),
  (9, 5, 'Human Conduct and Holistic Living',         5, 'CO5');

-- ─────────────────────────────────────────────
-- 4. MCQ QUESTIONS
-- ─────────────────────────────────────────────
CREATE TABLE mcq_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id         INT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  option_a        TEXT NOT NULL,
  option_b        TEXT NOT NULL,
  option_c        TEXT NOT NULL,
  option_d        TEXT NOT NULL,
  correct_option  CHAR(1) NOT NULL CHECK (correct_option IN ('A','B','C','D')),
  difficulty      TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  explanation     TEXT,                              -- shown after attempt
  uploaded_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 5. CODING PROBLEMS
-- ─────────────────────────────────────────────
CREATE TABLE coding_problems (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id      INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  unit_id         INT REFERENCES units(id),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  constraints     TEXT,
  sample_input    TEXT,
  sample_output   TEXT,
  test_cases      JSONB NOT NULL DEFAULT '[]',
  -- test_cases format: [{ "input": "5\n3", "expected_output": "8" }, ...]
  difficulty      TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  time_limit_ms   INT DEFAULT 2000,
  memory_limit_kb INT DEFAULT 256000,
  uploaded_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 6. QUIZ SESSIONS
-- ─────────────────────────────────────────────
CREATE TABLE quiz_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id      INT  NOT NULL REFERENCES subjects(id),
  unit_id         INT  REFERENCES units(id),         -- NULL = full-subject quiz
  total_questions INT  NOT NULL DEFAULT 10,
  duration_sec    INT  NOT NULL DEFAULT 600,          -- 10 min default
  started_at      TIMESTAMPTZ DEFAULT now(),
  submitted_at    TIMESTAMPTZ,
  score           INT  DEFAULT 0,
  max_score       INT,
  time_taken_sec  INT,
  status          TEXT DEFAULT 'ongoing'
                    CHECK (status IN ('ongoing','submitted','timed_out'))
);

-- ─────────────────────────────────────────────
-- 7. MCQ ATTEMPTS  (one row per question per session)
-- ─────────────────────────────────────────────
CREATE TABLE mcq_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES mcq_questions(id),
  selected_option CHAR(1) CHECK (selected_option IN ('A','B','C','D')),
  is_correct      BOOLEAN,
  answered_at     TIMESTAMPTZ
);

-- ─────────────────────────────────────────────
-- 8. CODE SUBMISSIONS
-- ─────────────────────────────────────────────
CREATE TABLE code_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id      UUID NOT NULL REFERENCES coding_problems(id),
  language        TEXT NOT NULL DEFAULT 'cpp'
                    CHECK (language IN ('cpp','java','python')),
  code            TEXT NOT NULL,
  verdict         TEXT DEFAULT 'pending'
                    CHECK (verdict IN ('pending','accepted','wrong_answer',
                                       'time_limit_exceeded','compilation_error',
                                       'runtime_error')),
  test_cases_passed INT DEFAULT 0,
  total_test_cases  INT,
  execution_time_ms INT,
  submitted_at    TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 9. LEADERBOARD  (materialised per subject)
-- ─────────────────────────────────────────────
CREATE TABLE leaderboard (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id      INT  NOT NULL REFERENCES subjects(id),
  total_score     INT  DEFAULT 0,
  quizzes_taken   INT  DEFAULT 0,
  problems_solved INT  DEFAULT 0,
  avg_accuracy    NUMERIC(5,2) DEFAULT 0.00,    -- percentage
  last_updated    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, subject_id)
);

-- ─────────────────────────────────────────────
-- 10. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────

ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_attempts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard      ENABLE ROW LEVEL SECURITY;

-- Students can only read/write their own quiz sessions
CREATE POLICY "students_own_sessions" ON quiz_sessions
  FOR ALL USING (auth.uid() = student_id);

-- Students can only read/write their own MCQ attempts
CREATE POLICY "students_own_attempts" ON mcq_attempts
  FOR ALL USING (
    session_id IN (
      SELECT id FROM quiz_sessions WHERE student_id = auth.uid()
    )
  );

-- Students can only read/write their own code submissions
CREATE POLICY "students_own_submissions" ON code_submissions
  FOR ALL USING (auth.uid() = student_id);

-- Leaderboard is readable by all authenticated users, writable only by service role
CREATE POLICY "leaderboard_public_read" ON leaderboard
  FOR SELECT USING (auth.role() = 'authenticated');

-- Questions and units are readable by all authenticated users
CREATE POLICY "questions_public_read" ON mcq_questions
  FOR SELECT USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────
-- 11. REALTIME  (enable for leaderboard)
-- ─────────────────────────────────────────────

-- Run in Supabase Dashboard > Database > Replication
-- ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard;
-- ALTER PUBLICATION supabase_realtime ADD TABLE quiz_sessions;

-- ─────────────────────────────────────────────
-- 12. INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX idx_mcq_unit        ON mcq_questions(unit_id);
CREATE INDEX idx_mcq_difficulty  ON mcq_questions(difficulty);
CREATE INDEX idx_sessions_student ON quiz_sessions(student_id);
CREATE INDEX idx_sessions_subject ON quiz_sessions(subject_id);
CREATE INDEX idx_leaderboard_subj ON leaderboard(subject_id, total_score DESC);
CREATE INDEX idx_submissions_student ON code_submissions(student_id);
