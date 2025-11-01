import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    PubSubService,
    MatchFoundPayload,
    SessionEventPayload,
    TOPICS,
    SUBSCRIPTIONS
} from "@noclue/common";

@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(EventBusService.name);
    private pubsubService: PubSubService;

    constructor(private readonly configService: ConfigService) {
        const projectId = this.configService.get<string>('GCP_PROJECT_ID');
        const keyFilename = this.configService.get<string>('GCP_KEY_FILENAME');
        const emulatorHost = this.configService.get<string>('PUBSUB_EMULATOR_HOST');

        if (!projectId) {
            throw new Error('GCP_PROJECT_ID environment variable is required');
        }

        this.pubsubService = new PubSubService(
            {
                projectId,
                keyFilename,
                emulatorHost,
            },
            this.logger
        );
    }

    async onModuleInit() {
        this.logger.log('Initializing Event Bus Service...');

        // Subscribe to session events from Collaboration Service
        await this.subscribeToSessionEvents();

        this.logger.log('Event Bus Service initialized successfully');
    }

    async onModuleDestroy() {
        this.logger.log('Shutting down Event Bus Service...');
        await this.pubsubService.close();
    }

    /**
     * Publish match found event to Question Service
     */
    public async publishMatchFound(payload: MatchFoundPayload): Promise<void> {
        try {
            await this.pubsubService.publish(TOPICS.MATCHING_QUEUE, payload);
            this.logger.log(`Published match found event for match ${payload.matchId}`);
        } catch (error) {
            this.logger.error('Failed to publish match found event:', error);
            throw error;
        }
    }

    /**
     * Subscribe to session events from Collaboration Service
     */
    private async subscribeToSessionEvents(): Promise<void> {
        try {
            await this.pubsubService.subscribe<SessionEventPayload>(
                SUBSCRIPTIONS.SESSION_QUEUE_SUB,
                async (data) => {
                    await this.handleSessionEvent(data);
                }
            );
            this.logger.log(`Subscribed to ${SUBSCRIPTIONS.SESSION_QUEUE_SUB}`);
        } catch (error) {
            this.logger.error('Failed to subscribe to session events:', error);
            throw error;
        }
    }

    /**
     * Handle session events (session ended, expired, etc.)
     */
    private async handleSessionEvent(payload: SessionEventPayload): Promise<void> {
        this.logger.log(`Received session event: ${payload.eventType} for match ${payload.matchId}`);

        // This method can be called by the matching service to update match status
        // For now, just logging - the actual implementation should be in matching.service.ts
    }

    /**
     * Get PubSub service instance for advanced usage
     */
    public getPubSubService(): PubSubService {
        return this.pubsubService;
    }
}