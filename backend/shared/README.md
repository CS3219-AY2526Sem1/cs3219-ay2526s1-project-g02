# Shared Backend Utilities

This directory contains shared code used across all microservices.

## Directory Structure

```
shared/
├── kafka/
│   ├── kafka.service.ts      # Kafka producer/consumer wrapper
│   └── kafka.module.ts        # NestJS module
├── events/
│   ├── user.events.ts         # User event definitions
│   ├── match.events.ts        # Matching event definitions
│   └── session.events.ts      # Session event definitions
├── interfaces/
│   └── common.interfaces.ts   # Shared TypeScript interfaces
└── utils/
    └── helpers.ts             # Utility functions
```

## Usage

### 1. Kafka Service

Import and use in any service:

```typescript
import { KafkaService } from '../../shared/kafka/kafka.service';

@Injectable()
export class YourService implements OnModuleInit, OnModuleDestroy {
  private kafka: KafkaService;

  constructor() {
    this.kafka = new KafkaService('your-service', 'your-group');
  }

  async onModuleInit() {
    await this.kafka.connect();

    // Start consuming
    await this.kafka.consume('user-events', async (event) => {
      console.log('Received event:', event);
    });
  }

  async onModuleDestroy() {
    await this.kafka.disconnect();
  }

  async someMethod() {
    // Produce event
    await this.kafka.produce('user-events', {
      type: 'user.created',
      data: { ... }
    });
  }
}
```

### 2. Event Definitions

Import shared event types:

```typescript
import { USER_EVENTS, UserCreatedEvent } from '../../shared/events/user.events';

const event: UserCreatedEvent = {
  type: USER_EVENTS.CREATED,
  userId: '123',
  email: 'user@example.com',
  timestamp: new Date().toISOString(),
};
```

## Setup

These files are optional and only needed if you implement:
- Kafka messaging
- CQRS pattern
- Event-driven architecture

See `ADVANCED_ARCHITECTURE.md` for implementation guide.
