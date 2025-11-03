# Collaboration Service

Real-time collaborative coding service with event-driven session management.

## Features

- **Event-Driven Architecture**: Listens to QuestionAssigned events and automatically creates sessions
- **Session Management**: Creates and manages collaborative coding sessions in Supabase
- **YJS Integration**: Real-time collaborative editing with Y.js
- **Session Lifecycle Events**: Publishes session_started events for downstream services

## Architecture

### Event Flow

```
QuestionService -> [QuestionAssigned Event]
                          ↓
                  CollaborationService
                          ↓
        ┌─────────────────┼─────────────────┐
        ↓                 ↓                  ↓
  Create Session    Initialize YJS    Publish Event
  (Supabase)        Document          [session_started]
```

### Services Integration

1. **Listens to**: `question-queue` (QuestionAssigned events from Question Service)
2. **Publishes to**: `session-queue` (SessionEvent events to Matching Service)

## Setup

### 1. Database Migration

Run the migration to add `question_id` to sessions table:

```bash
# Connect to your Supabase instance and run:
psql $DATABASE_URL -f src/migrations/001_add_question_id_to_sessions.sql
```

Or manually via Supabase Dashboard SQL Editor:

```sql
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES questions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_question_id ON sessions(question_id);
```

### 2. Environment Variables

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# Pub/Sub
GCP_PROJECT_ID=your_project_id
PUBSUB_EMULATOR_HOST=localhost:8085  # For local development

# Service Configuration
PORT=4004
YJS_PORT=1234
CORS_ORIGIN=*
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Service

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## Event Handling

### Incoming: QuestionAssigned

**Topic**: `question-queue`  
**Subscription**: `question-queue-sub`

```typescript
interface QuestionAssignedPayload {
  matchId: string;
  questionId: string;
  questionTitle: string;
  questionDescription: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topics: string[];
}
```

**Handler Logic**:
1. Creates new session in Supabase with:
   - `match_id`: From event payload
   - `question_id`: From event payload
   - `code`: Initial code template with question title
   - `language`: Default 'javascript'
   - `status`: 'active'
2. Initializes YJS document for the session
3. Publishes `session_started` event

### Outgoing: SessionEvent

**Topic**: `session-queue`

```typescript
interface SessionEventPayload {
  matchId: string;
  eventType: 'session_started' | 'session_ended' | 'session_expired';
  timestamp: string;
}
```

## Session Schema

```typescript
interface Session {
  id: string;              // UUID (auto-generated)
  match_id: string;        // Reference to match
  question_id?: string;    // Reference to question (NEW)
  code: string;            // Collaborative code content
  language: string;        // Programming language
  status: string;          // 'active', 'ended'
  created_at: string;      // ISO timestamp
  ended_at?: string;       // ISO timestamp
  updated_at: string;      // ISO timestamp
}
```

## YJS Server

The YJS server manages real-time collaborative editing documents.

**Key Methods**:
- `createSessionDocument(sessionId)`: Creates a new YJS document
- `getSessionDocument(sessionId)`: Retrieves an existing document
- `removeSessionDocument(sessionId)`: Cleans up a document

**WebSocket Port**: 1234 (configurable via `YJS_PORT`)

## Testing the Integration

### 1. Start Pub/Sub Emulator

```bash
gcloud beta emulators pubsub start --host-port=localhost:8085
```

### 2. Setup Pub/Sub Topics/Subscriptions

```bash
cd /path/to/project
npm run setup:pubsub
```

### 3. Publish a Test Event

```typescript
// Using PubSubService
const payload: QuestionAssignedPayload = {
  matchId: 'test-match-123',
  questionId: 'question-uuid',
  questionTitle: 'Two Sum',
  questionDescription: 'Find two numbers that add up to target',
  difficulty: 'easy',
  topics: ['arrays', 'hash-table']
};

await pubsubService.publish('question-queue', payload);
```

### 4. Verify Session Creation

Check Supabase for the newly created session:

```sql
SELECT * FROM sessions WHERE match_id = 'test-match-123';
```

## GraphQL API

### Queries

```graphql
query GetSession($sessionId: ID!) {
  getSession(sessionId: $sessionId) {
    id
    match_id
    question_id
    code
    language
    status
    created_at
    ended_at
  }
}
```

### Mutations

```graphql
mutation CreateSession($matchId: String!) {
  createSession(matchId: $matchId) {
    id
    match_id
    status
  }
}

mutation UpdateCode($sessionId: ID!, $code: String!) {
  updateCode(sessionId: $sessionId, code: $code) {
    id
    code
    updated_at
  }
}

mutation EndSession($sessionId: ID!) {
  endSession(sessionId: $sessionId) {
    id
    status
    ended_at
  }
}
```

## Monitoring

The service logs key events:

- QuestionAssigned event received
- Session creation success/failure
- YJS document creation
- SessionEvent publication

Example logs:

```
[EventBusService] Received question assigned event for match test-match-123
[CollaborationService] Creating session for match test-match-123 with question question-uuid
[CollaborationService] Session created successfully: session-uuid
Created YJS document for session session-uuid
[EventBusService] Published session event: session_started for match test-match-123
```

## Error Handling

- If session creation fails, the error is logged and thrown
- If YJS document already exists, it returns the existing document
- If SessionEvent publish fails, the error is logged but doesn't block the flow

## Future Enhancements

- [ ] YJS document persistence to Supabase
- [ ] Real-time code synchronization via WebSocket
- [ ] Code execution integration
- [ ] Session timeout handling
- [ ] Automatic session cleanup for ended matches

