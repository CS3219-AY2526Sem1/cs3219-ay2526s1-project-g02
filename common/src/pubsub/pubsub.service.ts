/**
 * Pub/Sub Service - Shared service for publishing and subscribing to Google Cloud Pub/Sub
 */

import { PubSub, Topic, Subscription, Message } from '@google-cloud/pubsub';
import { PubSubConfig, SubscriptionConfig, DEFAULT_ACK_DEADLINE_SECONDS } from './config';

export type MessageHandler<T = any> = (data: T, message: Message) => Promise<void> | void;

export class PubSubService {
    private readonly client: PubSub;
    private readonly topics: Map<string, Topic> = new Map();
    private readonly subscriptions: Map<string, Subscription> = new Map();
    private readonly logger: Console | any;

    constructor(config: PubSubConfig, logger?: any) {
        this.logger = logger || console;

        // Initialize Pub/Sub client
        const clientConfig: any = {
            projectId: config.projectId,
        };

        // Use service account key file if provided
        if (config.keyFilename) {
            clientConfig.keyFilename = config.keyFilename;
        }

        // Use emulator for local development
        if (config.emulatorHost) {
            clientConfig.apiEndpoint = config.emulatorHost;
            this.logger.log(`[PubSub] Using emulator at ${config.emulatorHost}`);
        }

        this.client = new PubSub(clientConfig);
        this.logger.log(`[PubSub] Initialized with project: ${config.projectId}`);
    }

    /**
     * Get or create a topic
     */
    async getTopic(topicName: string): Promise<Topic> {
        if (this.topics.has(topicName)) {
            return this.topics.get(topicName)!;
        }

        const topic = this.client.topic(topicName);
        const [exists] = await topic.exists();

        if (!exists) {
            this.logger.warn(`[PubSub] Topic ${topicName} does not exist. Creating...`);
            await topic.create();
            this.logger.log(`[PubSub] Topic ${topicName} created successfully`);
        }

        this.topics.set(topicName, topic);
        return topic;
    }

    /**
     * Publish a message to a topic
     */
    async publish<T = any>(topicName: string, data: T, attributes?: Record<string, string>): Promise<string> {
        try {
            const topic = await this.getTopic(topicName);
            const dataBuffer = Buffer.from(JSON.stringify(data));

            const messageId = await topic.publishMessage({
                data: dataBuffer,
                attributes: attributes || {},
            });

            this.logger.log(`[PubSub] Published message ${messageId} to topic ${topicName}`);
            return messageId;
        } catch (error) {
            this.logger.error(`[PubSub] Failed to publish to ${topicName}:`, error);
            throw error;
        }
    }

    /**
     * Subscribe to a topic and handle messages
     */
    async subscribe<T = any>(
        subscriptionName: string,
        handler: MessageHandler<T>,
        config?: Partial<SubscriptionConfig>
    ): Promise<Subscription> {
        try {
            // Check if subscription already exists in memory
            if (this.subscriptions.has(subscriptionName)) {
                this.logger.warn(`[PubSub] Subscription ${subscriptionName} already active`);
                return this.subscriptions.get(subscriptionName)!;
            }

            const subscription = this.client.subscription(subscriptionName);
            const [exists] = await subscription.exists();

            if (!exists) {
                throw new Error(
                    `Subscription ${subscriptionName} does not exist. Please create it first.`
                );
            }

            // Configure subscription options
            subscription.setOptions({
                flowControl: {
                    maxMessages: 10, // Process up to 10 messages concurrently
                },
            });

            // Set up message handler
            subscription.on('message', async (message: Message) => {
                try {
                    const data = JSON.parse(message.data.toString()) as T;
                    this.logger.log(
                        `[PubSub] Received message ${message.id} from ${subscriptionName}`
                    );

                    await handler(data, message);
                    message.ack();
                    this.logger.log(`[PubSub] Successfully processed message ${message.id}`);
                } catch (error) {
                    this.logger.error(
                        `[PubSub] Error processing message ${message.id}:`,
                        error
                    );
                    // Nack the message to retry
                    message.nack();
                }
            });

            // Handle errors
            subscription.on('error', (error) => {
                this.logger.error(`[PubSub] Subscription ${subscriptionName} error:`, error);
            });

            this.subscriptions.set(subscriptionName, subscription);
            this.logger.log(`[PubSub] Subscribed to ${subscriptionName}`);

            return subscription;
        } catch (error) {
            this.logger.error(`[PubSub] Failed to subscribe to ${subscriptionName}:`, error);
            throw error;
        }
    }

    /**
     * Create a subscription for a topic (admin operation)
     */
    async createSubscription(config: SubscriptionConfig): Promise<void> {
        try {
            const topic = await this.getTopic(config.topicName);
            const [subscription] = await topic.createSubscription(config.name, {
                ackDeadlineSeconds: config.ackDeadlineSeconds || DEFAULT_ACK_DEADLINE_SECONDS,
                messageRetentionDuration: config.messageRetentionDuration
                    ? { seconds: this.parseDuration(config.messageRetentionDuration) }
                    : undefined,
                retryPolicy: config.retryPolicy
                    ? {
                          minimumBackoff: config.retryPolicy.minimumBackoff
                              ? { seconds: this.parseDuration(config.retryPolicy.minimumBackoff) }
                              : undefined,
                          maximumBackoff: config.retryPolicy.maximumBackoff
                              ? { seconds: this.parseDuration(config.retryPolicy.maximumBackoff) }
                              : undefined,
                      }
                    : undefined,
                deadLetterPolicy: config.deadLetterPolicy,
                enableMessageOrdering: config.enableMessageOrdering || false,
            });

            this.logger.log(`[PubSub] Created subscription ${config.name} for topic ${config.topicName}`);
        } catch (error) {
            if ((error as any).code === 6) {
                // Already exists
                this.logger.log(`[PubSub] Subscription ${config.name} already exists`);
            } else {
                throw error;
            }
        }
    }

    /**
     * Gracefully close all subscriptions
     */
    async close(): Promise<void> {
        this.logger.log('[PubSub] Closing all subscriptions...');

        for (const [name, subscription] of this.subscriptions.entries()) {
            await subscription.close();
            this.logger.log(`[PubSub] Closed subscription ${name}`);
        }

        this.subscriptions.clear();
        this.topics.clear();
        this.logger.log('[PubSub] All subscriptions closed');
    }

    /**
     * Helper to parse duration strings (e.g., '10s', '7d') to seconds
     */
    private parseDuration(duration: string): number {
        const match = duration.match(/^(\d+)([smhd])$/);
        if (!match) {
            throw new Error(`Invalid duration format: ${duration}`);
        }

        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
            case 's':
                return value;
            case 'm':
                return value * 60;
            case 'h':
                return value * 3600;
            case 'd':
                return value * 86400;
            default:
                throw new Error(`Unknown duration unit: ${unit}`);
        }
    }
}
