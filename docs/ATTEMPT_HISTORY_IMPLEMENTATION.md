# Attempt History & Suggested Solutions

Tracks questions users have attempted and provides solution hints.

## Features

### Question Attempts
- Automatic logging when questions assigned to matches
- Powers attempt history page showing coding journey
- Tracks: user, question, match, timestamp

### Suggested Solutions
- Educational solution hints for attempted questions
- Includes: code, explanation, complexity analysis
- 10 pre-built solutions for existing questions

## Setup

Run the complete SQL script in Supabase:
**`backend/services/question-service/src/integration_tests/createTestData.sql`**

This creates all tables (questions, test_cases, suggested_solutions, question_attempts) plus sample data.

## Flow

```
Match Found → Question Selected → Attempt Logged → Collaboration → View History → Access Solutions
```

## API

**Attempt History:**
```graphql
query { questionAttemptsByUser(userId: "id") { id attemptedAt question { title difficulty } } }
```

**Solutions:**
```graphql
query { suggestedSolutions(questionId: "id") { approachName solutionCode timeComplexity } }
```

## Files

- Backend: `backend/services/question-service/src/questions/` (service + resolver)
- Frontend: `frontend/src/app/attempt-history/page.tsx`
- SQL: `backend/services/question-service/src/integration_tests/createTestData.sql`

## Next Steps

- Add "View Solution" button on attempt history page
- Progressive hints system (algorithmic approach → code)
- AI-generated solutions via LLM service
- Community-submitted solutions with voting
