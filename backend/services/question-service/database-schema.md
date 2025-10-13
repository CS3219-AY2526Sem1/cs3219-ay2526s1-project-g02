# Database Schema Setup

This document contains the SQL scripts to set up the database schema for the Question Service.

## Prerequisites

- Supabase account and project
- Access to Supabase SQL Editor

## Setup Instructions

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. Copy and paste the scripts below in order
4. Run each script by clicking **Run** or pressing `Ctrl+Enter`

---

## Step 1: Create Questions Table

This table stores coding questions with their descriptions, difficulty levels, and categories.

```sql
-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  category TEXT[] NOT NULL,
  examples TEXT,
  constraints TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions USING GIN(category);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations (adjust based on your auth requirements)
CREATE POLICY "Enable all access for questions" ON questions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Step 2: Create Test Cases Table

This table stores test cases for questions with structured JSON input/output (FR18).

```sql
-- Create test_cases table
CREATE TABLE IF NOT EXISTS test_cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  input JSONB NOT NULL,
  expected_output JSONB NOT NULL,
  is_hidden BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by question_id
CREATE INDEX IF NOT EXISTS idx_test_cases_question_id ON test_cases(question_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_order ON test_cases(question_id, order_index);

-- Enable Row Level Security
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations (adjust based on your auth requirements)
CREATE POLICY "Enable all access for test_cases" ON test_cases
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_test_cases_updated_at
  BEFORE UPDATE ON test_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Step 3: Verify Tables

Run this query to verify that both tables were created successfully:

```sql
-- Check if tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('questions', 'test_cases')
ORDER BY table_name;

-- Check columns for questions table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'questions'
ORDER BY ordinal_position;

-- Check columns for test_cases table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'test_cases'
ORDER BY ordinal_position;
```