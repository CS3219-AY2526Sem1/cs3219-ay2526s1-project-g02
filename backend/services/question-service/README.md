# Question Service

The Question Service manages coding questions and problems for the NoClue platform. It provides a GraphQL API for creating, retrieving, updating, and deleting questions, as well as allocating questions for collaboration sessions.

## Features

- ✅ CRUD operations for coding questions
- ✅ Filter questions by difficulty (Easy, Medium, Hard)
- ✅ Filter questions by category/topic (Array, Hash Table, Dynamic Programming, etc.)
- ✅ Random question allocation for collaboration sessions with filters (FR17)
- ✅ Test cases with structured input/output in JSON format (FR18)
- ✅ Retrieve test cases for questions during sessions (FR18.1)
- ✅ Pub/Sub integration for match events and question assignments
- ✅ Question selection workflow with GraphQL mutation + status polling helpers
- ✅ GraphQL API with interactive playground
- ✅ Supabase integration for data persistence

## Prerequisites

- Node.js >= 20.11.0
- npm >= 9.0.0
- Supabase account and project

## Setup

### 1. Install Dependencies

From the project root:

```bash
cd /path/to/noclue
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend/services/question-service` directory:

```env
PORT=4002
CORS_ORIGIN=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your-anon-key-here
```

**Where to find these values:**
1. Go to https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **Project URL** and **anon/public key**

### 3. Set Up Database

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. Copy and paste the scripts below in order
4. Run each script by clicking **Run** or pressing `Ctrl+Enter`

#### Step 1: Create Questions Table

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

#### Step 2: Create Test Cases Table

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

#### Step 3: Create Question Selection Table

This table records each participant’s question pick for a match and tracks the final winner once both users have submitted.

```sql
create extension if not exists "pgcrypto";

create table if not exists public.question_selections (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null,
  question_id uuid not null references public.questions(id) on delete cascade,
  is_winner boolean,
  submitted_at timestamptz default now(),
  finalized_at timestamptz,
  created_at timestamptz default now()
);

create unique index if not exists question_selections_match_user_idx
  on public.question_selections(match_id, user_id);
```

The service uses this table to compute the winning question and emit the `QuestionAssigned` Pub/Sub message consumed by the Collaboration Service.

---

#### Step 4: Verify Tables

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

### 4. Start the Service

**Development mode (with hot reload):**

```bash
# From project root
npm run dev:question
```

The service will start on `http://localhost:4002`

**GraphQL Playground:** `http://localhost:4002/graphql`

## API Documentation

### Pub/Sub & Selection Overview

The Question Service sits between the Matching and Collaboration services in the event-driven flow:

1. **MatchFound** message arrives from `matching-queue` (published by the Matching Service).  
2. Depending on configuration, the Question Service either auto-assigns a question or waits for both users to submit a pick via GraphQL.  
3. When both selections are in, the service picks a winner, updates `question_selections`, and publishes a `QuestionAssigned` payload to `question-queue`.  
4. The Collaboration Service provisions the editor session and sends a `session_started` lifecycle event (with the new `sessionId`) back through Pub/Sub.

Key GraphQL operations that back the manual selection flow:
- `submitQuestionSelection(input: SubmitQuestionSelectionInput!)`
- `questionSelectionStatus(matchId: ID!)`

Both operations are documented below.

### Queries

#### Get All Questions

```graphql
query {
  questions {
    id
    title
    description
    difficulty
    category
    examples
    constraints
    createdAt
    updatedAt
  }
}
```

#### Get Single Question by ID

```graphql
query {
  question(id: "your-question-id") {
    id
    title
    description
    difficulty
    category
  }
}
```

#### Get Questions by Difficulty

```graphql
query {
  questionsByDifficulty(difficulty: "Easy") {
    id
    title
    difficulty
  }
}
```

**Difficulty options:** `Easy`, `Medium`, `Hard`

#### Get Questions by Category

```graphql
query {
  questionsByCategory(category: "Array") {
    id
    title
    category
  }
}
```

**Common categories:** Array, Hash Table, String, Dynamic Programming, Tree, Graph, Linked List, Stack, Queue, Binary Search, etc.

#### Get Test Cases for Question (FR18)

Retrieve all test cases for a specific question. All test cases are visible to users.

```graphql
query {
  testCasesForQuestion(questionId: "your-question-id") {
    id
    questionId
    input
    expectedOutput
    orderIndex
  }
}
```

**Returns structured JSON data (FR18.1.2):**
```json
[
  {
    "id": "test-case-id-1",
    "questionId": "question-id",
    "input": {"nums": [2, 7, 11, 15], "target": 9},
    "expectedOutput": {"result": [0, 1]},
    "orderIndex": 1
  }
]
```

#### Allocate Questions for Session (FR17)

Retrieve K random questions with optional filters for collaboration sessions:

```graphql
query {
  allocateQuestionsForSession(
    count: 3
    difficulty: "Medium"
    categories: ["Array", "Dynamic Programming"]
  ) {
    id
    title
    difficulty
    category
  }
}
```

**Parameters:**
- `count` (required): Number of questions to allocate
- `difficulty` (optional): Filter by difficulty level
- `categories` (optional): Filter by one or more categories

**Examples:**

```graphql
# Get 5 random questions (no filters)
query {
  allocateQuestionsForSession(count: 5) {
    id
    title
  }
}

# Get 2 Easy questions
query {
  allocateQuestionsForSession(count: 2, difficulty: "Easy") {
    id
    title
    difficulty
  }
}

# Get 3 questions about Arrays or Hash Tables
query {
  allocateQuestionsForSession(count: 3, categories: ["Array", "Hash Table"]) {
    id
    title
    category
  }
}
```

### Mutations

#### Create Question

```graphql
mutation {
  createQuestion(input: {
    title: "Two Sum"
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target."
    difficulty: "Easy"
    category: ["Array", "Hash Table"]
    examples: "Example 1:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]"
    constraints: "2 <= nums.length <= 10^4"
  }) {
    id
    title
    difficulty
  }
}
```

**Note:** Test cases are managed separately in the `test_cases` table. After creating a question, you can add test cases by inserting directly into the database or through a future API endpoint.

#### Create Test Cases (via SQL)

Currently, test cases must be created directly in the database. In your Supabase SQL Editor:

```sql
-- Insert test cases for a question
INSERT INTO test_cases (question_id, input, expected_output, is_hidden, order_index)
VALUES 
  (
    'your-question-id-here',
    '{"nums": [2, 7, 11, 15], "target": 9}'::jsonb,
    '{"result": [0, 1]}'::jsonb,
    false,
    1
  ),
  (
    'your-question-id-here',
    '{"nums": [3, 2, 4], "target": 6}'::jsonb,
    '{"result": [1, 2]}'::jsonb,
    false,
    2
  );
```

**Fields:**
- `question_id`: UUID of the question (required)
- `input`: JSONB object with input parameters (required)
- `expected_output`: JSONB object with expected result (required)
- `is_hidden`: Whether to hide from users (default: false)
- `order_index`: Display order (required)

#### Update Question

```graphql
mutation {
  updateQuestion(
    id: "your-question-id"
    input: {
      title: "Updated Title"
      difficulty: "Medium"
    }
  ) {
    id
    title
    difficulty
  }
}
```

#### Submit Question Selection

Used by the frontend when users pick their preferred question for a match.

```graphql
mutation SubmitQuestionSelection($input: SubmitQuestionSelectionInput!) {
  submitQuestionSelection(input: $input) {
    status
    pendingUserIds
    selections {
      userId
      questionId
      isWinner
      submittedAt
      finalizedAt
    }
    finalQuestion {
      id
      title
      difficulty
      category
      description
    }
  }
}
```

- When both users have submitted, the service marks a winner, publishes a `QuestionAssigned` event, and returns `status = COMPLETE`.
- If a question was already assigned earlier in the match lifecycle (e.g., automated pick on `MatchFound`), the same mutation responds with `status = ALREADY_ASSIGNED`.

#### Check Question Selection Status

Clients poll this query while waiting for the other participant or for the final decision to propagate.

```graphql
query QuestionSelectionStatus($matchId: ID!) {
  questionSelectionStatus(matchId: $matchId) {
    status
    pendingUserIds
    selections {
      userId
      questionId
      isWinner
    }
    finalQuestion {
      id
      title
      difficulty
    }
  }
}
```

#### Delete Question

```graphql
mutation {
  deleteQuestion(id: "your-question-id")
}
```

Returns `true` if successful.

## Data Model

### Question Type

```typescript
interface Question {
  id: string;              // UUID
  title: string;           // Question title
  description: string;     // Full problem description
  difficulty: string;      // "Easy", "Medium", or "Hard"
  category: string[];      // Array of topics/categories
  examples?: string;       // Example inputs/outputs (optional)
  constraints?: string;    // Problem constraints (optional)
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
}
```

### TestCase Type (FR18)

```typescript
interface TestCase {
  id: string;              // UUID
  questionId: string;      // Foreign key to Question
  input: any;              // JSONB - flexible input structure
  expectedOutput: any;     // JSONB - flexible output structure
  isHidden: boolean;       // Whether test case is hidden from participants
  orderIndex: number;      // Display order
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
}
```

**Example test case data:**
```json
{
  "id": "uuid",
  "questionId": "question-uuid",
  "input": {
    "nums": [2, 7, 11, 15],
    "target": 9
  },
  "expectedOutput": {
    "result": [0, 1]
  },
  "isHidden": false,
  "orderIndex": 1
}
```

## Testing

### Unit Tests

Run unit tests with mocked dependencies (no database required):

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov
```

**Test coverage includes:**
- ✅ All CRUD operations
- ✅ Query filters (difficulty, category)
- ✅ Random question allocation (FR17)
- ✅ Test case retrieval (FR18)
- ✅ Error handling
- ✅ Edge cases

### Integration Tests

For integration testing with a real database, see `src/integration_tests/TEST_QUERIES.md`.

### Using GraphQL Playground

1. Start the service: `npm run dev:question`
2. Open `http://localhost:4002/graphql` in your browser
3. Use the interactive playground to test queries and mutations
4. View the schema documentation in the right panel

### Using curl

```bash
# Get all questions
curl -X POST http://localhost:4002/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ questions { id title difficulty } }"}'

# Allocate 3 random questions
curl -X POST http://localhost:4002/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ allocateQuestionsForSession(count: 3) { id title } }"}'
```

## Project Structure

```
question-service/
├── src/
│   ├── questions/
│   │   ├── questions.module.ts        # Questions module
│   │   ├── questions.service.ts       # Business logic
│   │   ├── questions.service.spec.ts  # Unit tests
│   │   └── questions.resolver.ts      # GraphQL resolvers
│   ├── integration_tests/
│   │   ├── TEST_QUERIES.md            # Integration test queries
│   │   └── test.sql                   # Test data setup
│   ├── app.module.ts                  # Main app module
│   └── main.ts                        # Entry point
├── .env                               # Environment variables (not in git)
├── package.json                       # Dependencies
├── tsconfig.json                      # TypeScript config
└── README.md                          # This file
```

## Troubleshooting

### "Cannot find module '@supabase/supabase-js'"

Run `npm install` from the project root to install all dependencies.

### "supabaseUrl is required" or "Invalid supabaseUrl"

Check your `.env` file:
- Ensure `SUPABASE_URL` is set to your Supabase API URL (e.g., `https://xxxxx.supabase.co`)
- Do NOT use the PostgreSQL connection string
- Ensure `SUPABASE_KEY` is set to your anon/public key

### "Could not find the table 'public.questions'"

The `questions` table doesn't exist in your Supabase database. Run the SQL setup script from step 3 above.

### Service won't start

1. Check that port 4002 is not already in use
2. Verify all dependencies are installed: `npm install`
3. Check the console for error messages
4. Ensure your `.env` file exists and has valid values

## Contributing

When adding new features:

1. Add service methods in `questions.service.ts`
2. Add GraphQL resolvers in `questions.resolver.ts`
3. Update this README with new API documentation
4. Test thoroughly using the GraphQL Playground

## License

Private - NoClue Platform
