-- Add question_id column to sessions table
-- This migration adds support for tracking which question is being worked on in a session

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES questions(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_question_id ON sessions(question_id);

-- Add comment for documentation
COMMENT ON COLUMN sessions.question_id IS 'Reference to the question being worked on in this session';

