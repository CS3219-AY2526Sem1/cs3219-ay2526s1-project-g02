# Matching Service

The Matching Service is responsible for pairing two users for a collaborative coding session based on their predefined preferences (difficulty, topics, etc.). It manages the real-time matching queue and publishes events to initiate the subsequent collaboration session.

## Features

* Real-time Matching Queue: Uses Redis to hold users actively waiting for a match.
* Matchmaking Logic: Implements logic to pair users based on common topics and difficulty levels (e.g., 'easy', 'medium', 'hard').
* Event Publishing: Publishes a MatchFoundPayload event to the central event bus (Pub/Sub) upon successful pairing.
* Session Event Relay: Listens for collaboration lifecycle events and pushes `sessionStarted` notifications to clients via WebSocket.
* Match Status Management: Updates the status of a match in the database (Supabase) upon session completion or expiry.
* Cancel/Expiry Logic: Includes logic to handle match attempts that time out or cancelled.

## Setup

The service is containerized using Docker. 
- For local dev, just `npm install --workspace=@noclue/common --workspace=@noclue/matching-service` and `npm run dev:matching` from the root dir.
- For local containerising, see `DOCKER-README.md`, `DOCKER-SETUP.md` and `docker-compose.yml`. 
- For production containerising, see `k8s/` folder.

Even the local containerising is setup to work with live PostgreSQL (Supabase), Redis (GCP MemoryStore) and Events (GCP Pub/Sub).

## Schema

This service only deals with 2 tables: matches and match_requests.

### Match Requests Table
```sql
CREATE TABLE match_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  preferred_language VARCHAR(50) NOT NULL,
  preferred_difficulty VARCHAR(50) NOT NULL,
  preferred_topics JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### Matches Table
```sql
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE
);
```

## Event Handling

The Matching Service **publishes** and **subscribes** to events to manage the match lifecycle.

| Pub/Sub           | Queue          | Description                           |
| :---------------- | :------------- | :------------------------------------ |
| Publishes to      | matching-queue | When match is found                   |
| Subscribes to     | session-queue  | Session lifecycle events (`session_started`, `session_ended`, `session_expired`) |

1. When match is found, the service publishes a MatchFoundPayload to the `matching-queue`. This is consumed by the Question Service. 
```ts
export interface MatchFoundPayload {
    matchId: string;
    user1Id: string;
    user2Id: string;
    difficulty: 'easy' | 'medium' | 'hard';
    language: string;
    commonTopics: string[];
}
```

2. When session lifecycle events occur, the Collaboration Service publishes a `SessionEventPayload` to the `session-queue`. This is consumed by the Matching Service, which:
   - pushes a `sessionStarted` WebSocket event (containing the new `sessionId`) to both users for immediate editor navigation
   - updates match status for `session_ended` / `session_expired`
```ts
export interface SessionEventPayload {
    matchId: string;
    sessionId: string;
    eventType: 'session_started' | 'session_ended' | 'session_expired';
    timestamp: string;
}
```

## Endpoints

The current endpoints (queries/mutations) are called by the frontend/client alone, and not by other services.

1. Mutation: `findMatch`
2. Mutation: `cancelMatch`

## Socket Connection (WS)

Upon arriving at the matching page, a web socket connection to the matching service is automatically established. This is for the client to receive asynchronous messages from the matching service. There are three possible asynchronous messages:

(a) `matchFound`  
(b) `requestExpired`  
(c) `sessionStarted` – sent after the Collaboration Service provisions the shared editor and includes `{ matchId, sessionId }`.

## TTL Service

Every minute, a TTL cleanup service searches through all Redis queue(s) and removes expired match requests (i.e. requests that exceeded the 2-minute TTL). This service also notifies the user via WS as stated above. See `tt.service.ts`.

## Flow

There are 4 possible 'flows' a user can experience while attempting to match with another user. 

### Scenario 1: Match Found Immediately

1.  The client sends the initial match request. `findMatch` mutation sent.
2. `findMatch` **GraphQL** response received. Match is Success. matchedUserId is sent here.
3. `matchFound` **WS** response received. matchId is sent here.
4. Once the collaboration session is created, a `sessionStarted` **WS** event arrives with the editor `sessionId`.

### Scenario 2: Match Found After Queueing

1.  The client sends the initial match request. `findMatch` mutation sent.
2. `findMatch` **GraphQL** response received. Match is Queued.
3. ... sometime later...
4. `matchFound` **WS** response received. matchId is sent here.
5. After both users finish question selection, a `sessionStarted` **WS** event arrives with the collaborative editor `sessionId`.

### Scenario 3: Request Expired

1.  The client sends the initial match request. `findMatch` mutation sent.
2. `findMatch` **GraphQL** response received. Match is Queued.
3. ... sometime later...
4. `requestExpired` **WS** response received. User has to re-request. 

### Scenario 4: Request Cancelled

1.  The client sends the initial match request. `findMatch` mutation sent.
2. `findMatch` **GraphQL** response received. Match is Queued.
3.  The client attempts to cancel match request. `cancelMatch` mutation sent. 
4. `cancelMatch` **GraphQL** response received. Success. 

## Monitoring

All events described above are logged. Additionally, number of active web socket connections are shown each time a user connects or disconnects. 

## Future Enhancements

- [ ] User Rating Integration (e.g. Take 'Elo'-style rating and/or history into account while matching) 
- [ ] Dynamic Expiry (intelligently adjusts the TTL expiry time based on current queue volume)
