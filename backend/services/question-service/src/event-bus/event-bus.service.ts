import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    PubSubService,
    MatchFoundPayload,
    QuestionAssignedPayload,
    TOPICS,
    SUBSCRIPTIONS
} from "@noclue/common";

@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(EventBusService.name);
    private pubsubService: PubSubService;
    private matchFoundHandler?: (payload: MatchFoundPayload) => Promise<void>;

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

        // Subscribe to match found events from Matching Service
        try {
            await this.subscribeToMatchFoundEvents();
            this.logger.log('Event Bus Service initialized successfully');
        } catch (error) {
            this.logger.warn('Event Bus Service initialization failed - running without Pub/Sub');
            this.logger.warn('To enable Pub/Sub: Set PUBSUB_EMULATOR_HOST or configure GCP credentials');
        }
    }

    async onModuleDestroy() {
        this.logger.log('Shutting down Event Bus Service...');
        await this.pubsubService.close();
    }

    /**
     * Register a handler for match found events
     */
    public registerMatchFoundHandler(handler: (payload: MatchFoundPayload) => Promise<void>): void {
        this.matchFoundHandler = handler;
        this.logger.log('Match found handler registered');
    }

    /**
     * Subscribe to match found events from Matching Service
     */
    private async subscribeToMatchFoundEvents(): Promise<void> {
        await this.pubsubService.subscribe<MatchFoundPayload>(
            SUBSCRIPTIONS.MATCHING_QUEUE_SUB,
            async (data) => {
                await this.handleMatchFound(data);
            }
        );
        this.logger.log(`Subscribed to ${SUBSCRIPTIONS.MATCHING_QUEUE_SUB}`);
    }

    /**
     * Handle match found event
     */
    private async handleMatchFound(payload: MatchFoundPayload): Promise<void> {
        this.logger.log(`Received match found event for match ${payload.matchId}`);

        if (this.matchFoundHandler) {
            try {
                await this.matchFoundHandler(payload);
            } catch (error) {
                this.logger.error('Error in match found handler:', error);
                throw error;
            }
        } else {
            this.logger.warn('No match found handler registered');
        }
    }

    /**
     * Publish question assigned event to Collaboration Service
     */
    public async publishQuestionAssigned(payload: QuestionAssignedPayload): Promise<void> {
        try {
            await this.pubsubService.publish(TOPICS.QUESTION_QUEUE, payload);
            this.logger.log(`Published question assigned event for match ${payload.matchId}`);
        } catch (error) {
            this.logger.error('Failed to publish question assigned event:', error);
            throw error;
        }
    }

    /**
     * Get PubSub service instance for advanced usage
     */
    public getPubSubService(): PubSubService {
        return this.pubsubService;
    }
}
