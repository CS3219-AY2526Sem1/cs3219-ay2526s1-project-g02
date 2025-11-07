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

1. Go to https://app.supabase.com → Your Project → **SQL Editor**
2. Copy the **complete setup script** from `src/integration_tests/createTestData.sql`
3. Paste and run it (creates tables, indexes, policies, sample data)

The script creates: `questions`, `test_cases`, `suggested_solutions`, `question_selections`, `question_attempts` tables with 10 sample questions.

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

### GraphQL API Overview

The service exposes a GraphQL API with the following capabilities:

**Queries:**
- Retrieve all questions or filter by difficulty/category
- Get single question by ID
- Allocate random questions for sessions (with optional filters)
- Get test cases for a question (JSON input/output format)
- Query attempt history by user
- Get suggested solutions for a question
- Check question selection status for a match

**Mutations:**
- Create, update, and delete questions
- Submit question selection for a match (both users pick, one wins)
- Create test cases for questions

All GraphQL schemas, types, and field descriptions are available in the interactive playground at `http://localhost:4002/graphql`. The resolver code in `questions.resolver.ts` provides complete implementation details.

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

| Issue | Solution |
|-------|----------|
| Module not found | Run `npm install` from project root |
| Invalid Supabase URL | Check `.env` - use API URL (https://xxx.supabase.co), not PostgreSQL string |
| Table not found | Run setup script from `src/integration_tests/createTestData.sql` |
| Port in use | Change `PORT` in `.env` or kill process on 4002 |
| Service won't start | Check `.env` exists with valid SUPABASE_URL and SUPABASE_KEY |

## Contributing

When adding new features:

1. Add service methods in `questions.service.ts`
2. Add GraphQL resolvers in `questions.resolver.ts`
3. Update this README with new API documentation
4. Test thoroughly using the GraphQL Playground

## License

Private - NoClue Platform
