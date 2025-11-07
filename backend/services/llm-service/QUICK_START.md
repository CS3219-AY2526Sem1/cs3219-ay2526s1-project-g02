# Quick Start Guide - LLM Service

## What Was Built

Two AI-powered features for the coding collaboration platform:

### 1. **Question Explanation** (`/explain-question`)
- Explains the coding problem/question
- Helps users understand what is being asked
- Provides key concepts, approaches, and hints
- Uses OpenAI GPT-4o-mini

### 2. **Problem-Solving Chat** (`/chat`)
- Interactive chat interface for hints and guidance
- Streaming responses via Server-Sent Events (SSE)
- Maintains conversation history
- Helps without giving complete solutions

## Setup in 3 Steps

### Step 1: Environment Variables
Create `.env` file in `backend/services/llm-service/`:

```env
PORT=4005
NODE_ENV=development
OPENAI_API_KEY=sk-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### Step 2: Install & Build
```bash
cd backend/services/llm-service
npm install
npm run build
```

### Step 3: Run
```bash
npm run start:dev
```

Service runs on `http://localhost:4005`

## Quick Test

### Test Question Explanation
```bash
curl -X POST http://localhost:4005/explain-question \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "your-question-uuid"
  }'
```

### Test Chat (Streaming)
```bash
curl -X POST http://localhost:4005/chat \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "your-question-uuid",
    "message": "Can you give me a hint about this problem?"
  }' \
  --no-buffer
```

## Integration with Frontend

### Question Explanation (Simple Fetch)
```typescript
const explainQuestion = async (questionId: string) => {
  const response = await fetch('http://localhost:4005/explain-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId })
  });
  return await response.json();
};
```

### Chat with Streaming (EventSource or Fetch)
```typescript
const streamChat = async (questionId: string, message: string) => {
  const response = await fetch('http://localhost:4005/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId, message })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.content) {
          // Display streaming content
          console.log(data.content);
        }
        if (data.done) {
          // Stream completed
          break;
        }
      }
    }
  }
};
```

## Required Database Schema

Ensure your Supabase has a `questions` table:

```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT,
  category TEXT[],
  examples TEXT,
  constraints TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Architecture Flow

```
User Request
    ↓
Controller (validates request)
    ↓
Service
    ├─→ Fetch question from Supabase
    ├─→ Build prompt with context
    └─→ Call OpenAI API
        ├─→ Question Explanation (non-streaming)
        └─→ Chat (streaming via SSE)
    ↓
Response to User
```

## Key Files

| File | Purpose |
|------|---------|
| `src/llm/llm.service.ts` | Core AI logic, OpenAI integration |
| `src/llm/llm.controller.ts` | HTTP endpoints, SSE streaming |
| `src/llm/dto/llm.dto.ts` | Request/response types |
| `src/supabase/supabase.module.ts` | Supabase DI setup |
| `README.md` | Full documentation |
| `IMPLEMENTATION.md` | Implementation details |

## Troubleshooting

### "OPENAI_API_KEY is not set"
- Add `OPENAI_API_KEY=sk-...` to `.env` file
- Restart the service

### "Question not found"
- Verify question UUID exists in Supabase
- Check SUPABASE_URL and SUPABASE_KEY are correct

### Streaming not working
- Ensure client doesn't buffer responses
- Use `--no-buffer` with curl
- In fetch API, read response.body as stream

### Build errors
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (requires 18+)

## What's Different

| Before | After |
|--------|-------|
| Mock responses | Real OpenAI integration |
| No streaming | SSE streaming for chat |
| No database | Fetches questions from Supabase |
| Static data | Dynamic AI-generated content |

## Cost Estimates

Using GPT-4o-mini:
- Question explanation: ~$0.001 per request
- Chat message: ~$0.0003 per message
- Very affordable for development and production

## Next Steps for Production

1. Add rate limiting
2. Add authentication
3. Cache frequent questions
4. Monitor token usage
5. Add error tracking (Sentry)
6. Add usage analytics
7. Consider Redis for conversation history

---

For detailed documentation, see `README.md` and `IMPLEMENTATION.md`.

