"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PubSubService = void 0;
const pubsub_1 = require("@google-cloud/pubsub");
const config_1 = require("./config");
class PubSubService {
    constructor(config, logger) {
        this.topics = new Map();
        this.subscriptions = new Map();
        this.logger = logger || console;
        const clientConfig = {
            projectId: config.projectId,
        };
        if (config.keyFilename) {
            clientConfig.keyFilename = config.keyFilename;
        }
        if (config.emulatorHost) {
            clientConfig.apiEndpoint = config.emulatorHost;
            this.logger.log(`[PubSub] Using emulator at ${config.emulatorHost}`);
        }
        this.client = new pubsub_1.PubSub(clientConfig);
        this.logger.log(`[PubSub] Initialized with project: ${config.projectId}`);
    }
    async getTopic(topicName) {
        if (this.topics.has(topicName)) {
            return this.topics.get(topicName);
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
    async publish(topicName, data, attributes) {
        try {
            const topic = await this.getTopic(topicName);
            const dataBuffer = Buffer.from(JSON.stringify(data));
            const messageId = await topic.publishMessage({
                data: dataBuffer,
                attributes: attributes || {},
            });
            this.logger.log(`[PubSub] Published message ${messageId} to topic ${topicName}`);
            return messageId;
        }
        catch (error) {
            this.logger.error(`[PubSub] Failed to publish to ${topicName}:`, error);
            throw error;
        }
    }
    async subscribe(subscriptionName, handler, config) {
        try {
            if (this.subscriptions.has(subscriptionName)) {
                this.logger.warn(`[PubSub] Subscription ${subscriptionName} already active`);
                return this.subscriptions.get(subscriptionName);
            }
            const subscription = this.client.subscription(subscriptionName);
            const [exists] = await subscription.exists();
            if (!exists) {
                throw new Error(`Subscription ${subscriptionName} does not exist. Please create it first.`);
            }
            subscription.setOptions({
                flowControl: {
                    maxMessages: 10,
                },
            });
            subscription.on('message', async (message) => {
                try {
                    const data = JSON.parse(message.data.toString());
                    this.logger.log(`[PubSub] Received message ${message.id} from ${subscriptionName}`);
                    await handler(data, message);
                    message.ack();
                    this.logger.log(`[PubSub] Successfully processed message ${message.id}`);
                }
                catch (error) {
                    this.logger.error(`[PubSub] Error processing message ${message.id}:`, error);
                    message.nack();
                }
            });
            subscription.on('error', (error) => {
                this.logger.error(`[PubSub] Subscription ${subscriptionName} error:`, error);
            });
            this.subscriptions.set(subscriptionName, subscription);
            this.logger.log(`[PubSub] Subscribed to ${subscriptionName}`);
            return subscription;
        }
        catch (error) {
            this.logger.error(`[PubSub] Failed to subscribe to ${subscriptionName}:`, error);
            throw error;
        }
    }
    async createSubscription(config) {
        try {
            const topic = await this.getTopic(config.topicName);
            const [subscription] = await topic.createSubscription(config.name, {
                ackDeadlineSeconds: config.ackDeadlineSeconds || config_1.DEFAULT_ACK_DEADLINE_SECONDS,
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
        }
        catch (error) {
            if (error.code === 6) {
                this.logger.log(`[PubSub] Subscription ${config.name} already exists`);
            }
            else {
                throw error;
            }
        }
    }
    async close() {
        this.logger.log('[PubSub] Closing all subscriptions...');
        for (const [name, subscription] of this.subscriptions.entries()) {
            await subscription.close();
            this.logger.log(`[PubSub] Closed subscription ${name}`);
        }
        this.subscriptions.clear();
        this.topics.clear();
        this.logger.log('[PubSub] All subscriptions closed');
    }
    parseDuration(duration) {
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
exports.PubSubService = PubSubService;
