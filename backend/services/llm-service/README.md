# LLM Service

AI-powered service for problem analysis and solution generation.

## Endpoints

### POST /problem
Analyzes a coding problem and provides insights.

**Request Body:**
```json
{
  "problemDescription": "string",
  "difficulty": "string (optional)",
  "tags": ["string"] (optional),
  "context": "string (optional)"
}
```

**Response:**
```json
{
  "analysis": {
    "difficulty": "string",
    "topics": ["string"],
    "timeComplexity": "string",
    "spaceComplexity": "string",
    "hints": ["string"],
    "similarProblems": []
  },
  "timestamp": "string"
}
```

### POST /solution
Generates a solution for a coding problem.

**Request Body:**
```json
{
  "problemDescription": "string",
  "language": "string (optional)",
  "existingCode": "string (optional)",
  "approach": "string (optional)",
  "constraints": ["string"] (optional)
}
```

**Response:**
```json
{
  "solution": {
    "code": "string",
    "explanation": "string",
    "approach": "string",
    "language": "string",
    "testCases": [
      {
        "input": "string",
        "expectedOutput": "string",
        "explanation": "string"
      }
    ]
  },
  "timestamp": "string"
}
```

## Environment Variables

- `PORT`: Service port (default: 4005)
- `NODE_ENV`: Environment (development/production)
- `LLM_API_KEY`: API key for LLM provider (OpenAI, Anthropic, etc.)
- `LLM_MODEL`: Model to use (e.g., gpt-4, claude-3-opus)

## Development

```bash
# Install dependencies
npm install

# Start in dev mode
npm run start:dev

# Build
npm run build

# Start production
npm run start:prod
```

## TODO

- [ ] Integrate with actual LLM API (OpenAI, Anthropic, Google Gemini, etc.)
- [ ] Add rate limiting
- [ ] Add caching for repeated queries
- [ ] Add streaming responses for large outputs
- [ ] Add authentication/authorization
- [ ] Add monitoring and logging
- [ ] Add unit and integration tests

