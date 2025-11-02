import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    PubSubService,
    QuestionAssignedPayload,
    SessionEventPayload,
    TOPICS,
    SUBSCRIPTIONS
} from "@noclue/common";

@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(EventBusService.name);
    private pubsubService: PubSubService;
    private questionAssignedHandler?: (payload: QuestionAssignedPayload) => Promise<void>;

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

        // Subscribe to question assigned events from Question Service
        try {
            await this.subscribeToQuestionAssignedEvents();
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
     * Register a handler for question assigned events
     */
    public registerQuestionAssignedHandler(handler: (payload: QuestionAssignedPayload) => Promise<void>): void {
        this.questionAssignedHandler = handler;
        this.logger.log('Question assigned handler registered');
    }

    /**
     * Subscribe to question assigned events from Question Service
     */
    private async subscribeToQuestionAssignedEvents(): Promise<void> {
        await this.pubsubService.subscribe<QuestionAssignedPayload>(
            SUBSCRIPTIONS.QUESTION_QUEUE_SUB,
            async (data) => {
                await this.handleQuestionAssigned(data);
            }
        );
        this.logger.log(`Subscribed to ${SUBSCRIPTIONS.QUESTION_QUEUE_SUB}`);
    }

    /**
     * Handle question assigned event
     */
    private async handleQuestionAssigned(payload: QuestionAssignedPayload): Promise<void> {
        this.logger.log(`Received question assigned event for match ${payload.matchId}`);

        if (this.questionAssignedHandler) {
            try {
                await this.questionAssignedHandler(payload);
            } catch (error) {
                this.logger.error('Error in question assigned handler:', error);
                throw error;
            }
        } else {
            this.logger.warn('No question assigned handler registered');
        }
    }

    /**
     * Publish session event to Matching Service
     */
    public async publishSessionEvent(payload: SessionEventPayload): Promise<void> {
        try {
            await this.pubsubService.publish(TOPICS.SESSION_QUEUE, payload);
            this.logger.log(`Published session event: ${payload.eventType} for match ${payload.matchId}`);
        } catch (error) {
            this.logger.error('Failed to publish session event:', error);
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
