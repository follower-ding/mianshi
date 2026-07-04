CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  source_experience_id TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]',
  content TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  position JSONB NOT NULL DEFAULT '[]',
  type TEXT NOT NULL DEFAULT '基础',
  status TEXT NOT NULL DEFAULT 'draft',
  reference_answer TEXT NOT NULL DEFAULT '',
  key_points JSONB NOT NULL DEFAULT '[]',
  scoring_rubric TEXT NOT NULL DEFAULT '',
  follow_up_templates JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS experiences (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  result TEXT NOT NULL,
  rounds INTEGER NOT NULL,
  author TEXT NOT NULL,
  date TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  position TEXT NOT NULL,
  experience TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  answer_count INTEGER NOT NULL,
  summary TEXT NOT NULL,
  strengths JSONB NOT NULL DEFAULT '[]',
  improvements JSONB NOT NULL DEFAULT '[]',
  overall_rating TEXT NOT NULL,
  next_steps JSONB NOT NULL DEFAULT '[]',
  score_breakdown JSONB NOT NULL DEFAULT '[]',
  transcript JSONB NOT NULL DEFAULT '[]',
  rounds JSONB NOT NULL DEFAULT '[]',
  source_question_id TEXT,
  source_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metric_counters (
  name TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS llm_cache (
  cache_key TEXT PRIMARY KEY,
  response TEXT NOT NULL,
  prompt_variant TEXT NOT NULL DEFAULT 'default',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS llm_prompt_variants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  weight INTEGER NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  suffix TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS candidate_questions (
  id TEXT PRIMARY KEY,
  experience_id TEXT NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]',
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '基础',
  reference_answer TEXT NOT NULL DEFAULT '',
  key_points JSONB NOT NULL DEFAULT '[]',
  scoring_rubric TEXT NOT NULL DEFAULT '',
  follow_up_templates JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_questions_status ON candidate_questions(status);
CREATE INDEX IF NOT EXISTS idx_llm_cache_expires ON llm_cache(expires_at);

CREATE TABLE IF NOT EXISTS user_question_progress (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'practiced',
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_user_question_progress_user ON user_question_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_question_progress_favorite ON user_question_progress(user_id, favorite);

CREATE TABLE IF NOT EXISTS job_postings (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  position TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  salary TEXT NOT NULL DEFAULT '',
  experience TEXT NOT NULL DEFAULT '不限',
  education TEXT NOT NULL DEFAULT '本科',
  jd TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'applied',
  greeting TEXT NOT NULL DEFAULT '',
  resume_summary TEXT NOT NULL DEFAULT '',
  session_id TEXT,
  report_id TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_applications_user ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_id);

ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS external_url TEXT;
ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS crawled_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_postings_boss_external ON job_postings(source, external_id) WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS job_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  target_companies JSONB NOT NULL DEFAULT '[]',
  target_cities JSONB NOT NULL DEFAULT '[]',
  target_positions JSONB NOT NULL DEFAULT '[]',
  salary_min INTEGER,
  salary_max INTEGER,
  exclude_keywords JSONB NOT NULL DEFAULT '[]',
  daily_apply_limit INTEGER NOT NULL DEFAULT 10,
  auto_apply_mode TEXT NOT NULL DEFAULT 'review',
  resume_summary TEXT NOT NULL DEFAULT '',
  last_crawl_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_matches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'C',
  reasons JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending_review',
  suggested_greeting TEXT NOT NULL DEFAULT '',
  matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_matches_user ON job_matches(user_id);

CREATE TABLE IF NOT EXISTS crawl_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'boss',
  query TEXT NOT NULL DEFAULT '',
  jobs_found INTEGER NOT NULL DEFAULT 0,
  jobs_new INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running',
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_resumes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '我的简历',
  template_id TEXT NOT NULL DEFAULT 'tech-simple',
  content JSONB NOT NULL DEFAULT '{}',
  raw_text TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  optimized_text TEXT NOT NULL DEFAULT '',
  layout_config JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_resumes_user_id ON user_resumes(user_id);

CREATE TABLE IF NOT EXISTS resume_shares (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '我的简历',
  template_id TEXT NOT NULL DEFAULT 'tech-simple',
  content JSONB NOT NULL DEFAULT '{}',
  layout_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_resume_shares_user_resume ON resume_shares(user_id, resume_id);
