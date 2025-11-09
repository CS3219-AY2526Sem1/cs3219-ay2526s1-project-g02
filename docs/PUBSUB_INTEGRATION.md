# Google Cloud Pub/Sub Integration

This document describes the Pub/Sub messaging architecture for the noclue microservices.

## Overview

The application uses Google Cloud Pub/Sub for asynchronous communication between microservices. This enables decoupled, scalable, and reliable message passing.

## Architecture

### Message Flow

```
┌─────────────────┐
│ Matching Service│
└────────┬────────┘
         │ publishes to
         ▼
  ┌──────────────┐
  │matching-queue│
  └──────┬───────┘
         │ subscribes via matching-queue-sub
         ▼
┌─────────────────┐
│ Question Service│
└────────┬────────┘
         │ publishes to
         ▼
  ┌──────────────┐
  │question-queue│
  └──────┬───────┘
         │ subscribes via question-queue-sub
         ▼
┌──────────────────────┐
│ Collaboration Service│
└──────────┬───────────┘
           │ publishes to
           ▼
    ┌─────────────┐
    │session-queue│
    └──────┬──────┘
           │ subscribes via session-queue-sub
           ▼
    ┌─────────────────┐
    │ Matching Service│
    └─────────────────┘
```

## Topics and Subscriptions

### 1. matching-queue
- **Publisher**: Matching Service
- **Subscriber**: Question Service (via `matching-queue-sub`)
- **Purpose**: Notify when a match is found between two users
- **Message Schema**:
  ```typescript
  interface MatchFoundPayload {
    matchId: string;
    user1Id: string;
    user2Id: string;
    difficulty: 'easy' | 'medium' | 'hard';
    language: string;
    commonTopics: string[];
  }
  ```

### 2. question-queue
- **Publisher**: Question Service
- **Subscriber**: Collaboration Service (via `question-queue-sub`)
- **Purpose**: Deliver assigned question details to the collaboration layer
- **Message Schema**:
  ```typescript
  interface QuestionAssignedPayload {
    matchId: string;
    questionId: string;
    questionTitle: string;
    questionDescription: string;
    difficulty: 'easy' | 'medium' | 'hard';
    topics: string[];
    testCases: QuestionTestCasePayload[];
  }

  interface QuestionTestCasePayload {
    id: string;
    input: unknown;
    expectedOutput: unknown;
    isHidden: boolean;
    orderIndex: number;
  }
  ```

### 3. session-queue
- **Publisher**: Collaboration Service
- **Subscriber**: Matching Service (via `session-queue-sub`)
- **Purpose**: Notify about session lifecycle events
- **Message Schema**:
  ```typescript
  interface SessionEventPayload {
    matchId: string;
    sessionId: string;
    eventType: 'session_started' | 'session_ended' | 'session_expired';
    timestamp: string;
  }
  ```

  The `sessionId` identifies the collaboration session for both start and end events. When `eventType === 'session_started'`, the Matching Service forwards that identifier over WebSocket so the frontend can navigate directly to the collaborative editor without polling.

## Setup Instructions

### Prerequisites

1. **Google Cloud Project**
   - Create a GCP project
   - Enable the Pub/Sub API
   - Configure authentication (see detailed guide below)

2. **Authentication Setup**

   For production deployment, see the comprehensive guide:
   - **[Pub/Sub Authentication Setup Guide](./PUBSUB_AUTH_SETUP.md)** - Complete production setup with two methods:
     - Service Account Key (Quick setup)
     - Workload Identity (Recommended for production)

3. **Environment Variables**

   Add the following to your `.env` file:

   ```bash
   # Required
   GCP_PROJECT_ID=your-gcp-project-id

   # For production with service account key
   GCP_KEY_FILENAME=/path/to/service-account-key.json

   # For local development with emulator
   PUBSUB_EMULATOR_HOST=localhost:8085
   ```

### Local Development with Emulator

1. **Install Pub/Sub Emulator**
   ```bash
   gcloud components install pubsub-emulator
   ```

2. **Start the Emulator**
   ```bash
   gcloud beta emulators pubsub start --project=local-dev
   ```

3. **Set Environment Variable**
   ```bash
   export PUBSUB_EMULATOR_HOST=localhost:8085
   ```

4. **Initialize Topics and Subscriptions**
   ```bash
   npm run setup:pubsub
   ```

### Production Setup

1. **Authenticate with GCP**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Create Service Account** (if not already created)
   ```bash
   gcloud iam service-accounts create pubsub-service \
     --display-name="Pub/Sub Service Account"

   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:pubsub-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/pubsub.admin"

   gcloud iam service-accounts keys create key.json \
     --iam-account=pubsub-service@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

3. **Initialize Topics and Subscriptions**
   ```bash
   npm run setup:pubsub
   ```

## Usage Examples

### Publishing a Message (Matching Service)

```typescript
import { EventBusService } from './event-bus/event-bus.service';
import { MatchFoundPayload } from '@noclue/common';

@Injectable()
export class MatchingService {
  constructor(private readonly eventBusService: EventBusService) {}

  async notifyMatchFound(matchData: any) {
    const payload: MatchFoundPayload = {
      matchId: matchData.id,
      user1Id: matchData.user1Id,
      user2Id: matchData.user2Id,
      difficulty: matchData.difficulty,
      language: matchData.language,
      commonTopics: matchData.topics,
    };

    await this.eventBusService.publishMatchFound(payload);
  }
}
```

### Subscribing to Messages (Question Service)

```typescript
import { EventBusService } from './event-bus/event-bus.service';
import { MatchFoundPayload } from '@noclue/common';

@Injectable()
export class QuestionService implements OnModuleInit {
  constructor(private readonly eventBusService: EventBusService) {}

  async onModuleInit() {
    // Register handler for match found events
    this.eventBusService.registerMatchFoundHandler(
      async (payload: MatchFoundPayload) => {
        await this.handleMatchFound(payload);
      }
    );
  }

  private async handleMatchFound(payload: MatchFoundPayload) {
    // Assign a question based on difficulty and topics
    const question = await this.findSuitableQuestion(
      payload.difficulty,
      payload.commonTopics
    );

    // Publish to collaboration service
    await this.eventBusService.publishQuestionAssigned({
      matchId: payload.matchId,
      questionId: question.id,
      questionTitle: question.title,
      questionDescription: question.description,
      difficulty: question.difficulty,
      topics: question.topics,
    });
  }
}
```

## Error Handling

The Pub/Sub service includes built-in error handling:

1. **Automatic Retries**: Failed messages are automatically retried with exponential backoff
   - Minimum backoff: 10 seconds
   - Maximum backoff: 600 seconds (10 minutes)

2. **Message Acknowledgment**:
   - Messages are automatically acknowledged on successful processing
   - Failed messages are nacked and will be redelivered

3. **Logging**: All publish/subscribe events and errors are logged

## Monitoring

### Check Topic Status
```bash
gcloud pubsub topics list
```

### Check Subscription Status
```bash
gcloud pubsub subscriptions list
```

### View Undelivered Messages
```bash
   gcloud pubsub subscriptions pull matching-queue-sub --limit=10
```

## Cleanup

To delete all topics and subscriptions (use with caution):

```bash
npm run cleanup:pubsub
```

## Best Practices

1. **Message Idempotency**: Ensure handlers can safely process duplicate messages
2. **Timeouts**: Keep message processing under 60 seconds (ack deadline)
3. **Error Logging**: Log all errors with context for debugging
4. **Schema Validation**: Validate message payloads before processing
5. **Graceful Shutdown**: Close subscriptions properly on service shutdown

## Troubleshooting

### Messages Not Being Received

1. Check subscription exists:
   ```bash
   gcloud pubsub subscriptions describe matching-queue-sub
   ```

2. Verify service is subscribed:
   - Check service logs for "Subscribed to..." message

3. Check for undelivered messages:
   ```bash
   gcloud pubsub subscriptions pull matching-queue-sub --limit=1
   ```

### Authentication Errors

1. Verify GCP_PROJECT_ID is set correctly
2. Check service account permissions
3. Ensure key file path is correct (if using GCP_KEY_FILENAME)

### Emulator Issues

1. Ensure emulator is running:
   ```bash
   ps aux | grep pubsub-emulator
   ```

2. Check PUBSUB_EMULATOR_HOST is set:
   ```bash
   echo $PUBSUB_EMULATOR_HOST
   ```

## References

- [Google Cloud Pub/Sub Documentation](https://cloud.google.com/pubsub/docs)
- [Node.js Pub/Sub Client Library](https://googleapis.dev/nodejs/pubsub/latest/)
- [Pub/Sub Best Practices](https://cloud.google.com/pubsub/docs/publisher)
