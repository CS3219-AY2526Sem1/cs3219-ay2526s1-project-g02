# LLM Service

AI-powered service for code explanation and problem-solving assistance using OpenAI's GPT models.

## Features

### 1. AI-Assisted Question Explanation
Explains the coding problem/question to help users understand what is being asked, including:
- Problem breakdown
- Key concepts and relevant data structures
- Possible approaches (high-level)
- Helpful hints
- Complexity considerations

### 2. AI-Assisted Problem Solving (Chat Interface)
Interactive chat-based assistance for problem-solving with:
- Hints and guidance
- Problem statement explanations
- Suggested approaches
- Real-time streaming responses

## Endpoints

### POST /explain-question
Explains a coding problem/question to help users understand what is being asked.

**Request Body:**
```json
{
  "questionId": "string (UUID from questions table)"
}
```

**Response:**
```json
{
  "questionId": "string",
  "explanation": "string (detailed explanation of the problem)",
  "analysis": {
    "keyConc epts": ["string"],
    "approaches": ["string"],
    "hints": ["string"],
    "complexity": "string"
  },
  "timestamp": "string (ISO 8601)"
}
```

**Example:**
```bash
curl -X POST http://localhost:4005/explain-question \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

### POST /chat
Interactive problem-solving chat with streaming responses (Server-Sent Events).

**Request Body:**
```json
{
  "questionId": "string (UUID from questions table)",
  "message": "string (user's question/prompt)",
  "conversationHistory": [
    {
      "role": "user | assistant",
      "content": "string"
    }
  ] // optional, for maintaining conversation context
}
```

**Response:**
Streams data using Server-Sent Events (SSE) format:
```
data: {"content": "chunk of response"}

data: {"content": "another chunk"}

data: {"done": true}
```

**Example (JavaScript/Fetch):**
```javascript
const response = await fetch('http://localhost:4005/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    questionId: '123e4567-e89b-12d3-a456-426614174000',
    message: 'Can you give me a hint about the approach?',
    conversationHistory: []
  })
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
        console.log(data.content);
      }
      if (data.done) {
        console.log('Stream completed');
      }
    }
  }
}
```

**Example (cURL):**
```bash
curl -X POST http://localhost:4005/chat \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "123e4567-e89b-12d3-a456-426614174000",
    "message": "What approach should I use for this problem?"
  }' \
  --no-buffer
```

## Environment Variables

Required environment variables (create a `.env` file):

```env
# Server Configuration
PORT=4005
NODE_ENV=development

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

## Setup & Development

### Prerequisites
- Node.js 18+
- npm or yarn
- OpenAI API key
- Supabase project with questions table

### Installation

```bash
# Install dependencies
npm install

# Create .env file with required variables
cp .env.example .env
# Edit .env with your credentials
```

### Database Schema

The service expects a `questions` table in Supabase with the following structure:

```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT,
  category TEXT[],
  examples TEXT,
  constraints TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Running the Service

```bash
# Development mode with hot reload
npm run start:dev

# Production build
npm run build

# Production mode
npm run start:prod
```

The service will be available at `http://localhost:4005`

## Architecture

### Dependencies
- **NestJS**: Framework for building scalable Node.js applications
- **OpenAI SDK**: Official OpenAI API client with streaming support
- **Supabase**: Database client for fetching question data
- **class-validator**: Request validation

### Key Components

1. **LlmService**: Core service handling:
   - Question fetching from Supabase
   - OpenAI API integration
   - Question explanation generation
   - Chat streaming

2. **LlmController**: HTTP endpoints with:
   - Request validation
   - Response formatting
   - SSE streaming setup

3. **SupabaseModule**: Dependency injection for Supabase client

## API Models

### Models Used
- **Question Explanation**: `gpt-4o-mini` (optimized for cost and speed)
- **Chat**: `gpt-4o-mini` with streaming

Can be upgraded to `gpt-4` or other models by modifying the service.

## Features in Detail

### Question Explanation
- Fetches question context from Supabase
- Breaks down the problem statement
- Identifies key concepts and data structures
- Suggests high-level approaches
- Provides hints and complexity considerations

### Problem-Solving Chat
- Context-aware conversations
- Maintains conversation history
- Provides hints without giving away solutions
- Real-time streaming for better UX
- Educational and encouraging tone

## Error Handling

The service handles various error cases:
- Missing question IDs (404 Not Found)
- Invalid Supabase credentials (500 Internal Server Error)
- OpenAI API errors (500 Internal Server Error)
- Streaming interruptions (graceful termination)

## Future Enhancements

- [ ] Add rate limiting per user
- [ ] Cache frequent explanations
- [ ] Support multiple LLM providers (Anthropic, Google Gemini)
- [ ] Add conversation persistence
- [ ] Add feedback mechanism for improving responses
- [ ] Add unit and integration tests
- [ ] Add monitoring and analytics
- [ ] Support code execution and testing
- [ ] Multi-language support for explanations

## Testing

```bash
# Run linter
npm run lint

# Run tests (when implemented)
npm test

# Test question explanation endpoint
curl -X POST http://localhost:4005/explain-question \
  -H "Content-Type: application/json" \
  -d '{"questionId": "..."}'

# Test chat endpoint with streaming
curl -X POST http://localhost:4005/chat \
  -H "Content-Type: application/json" \
  -d '{"questionId": "...", "message": "Can you help me?"}' \
  --no-buffer
```

## Notes

- The chat endpoint uses Server-Sent Events (SSE) for streaming responses
- Conversation history should be maintained client-side for context
- The service prioritizes educational guidance over complete solutions
- Questions are fetched from Supabase on each request (consider caching for production)
