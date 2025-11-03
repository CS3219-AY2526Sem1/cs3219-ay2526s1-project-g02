import { Topic, Subscription, Message } from '@google-cloud/pubsub';
import { PubSubConfig, SubscriptionConfig } from './config';
export type MessageHandler<T = any> = (data: T, message: Message) => Promise<void> | void;
export declare class PubSubService {
    private readonly client;
    private readonly topics;
    private readonly subscriptions;
    private readonly logger;
    constructor(config: PubSubConfig, logger?: any);
    getTopic(topicName: string): Promise<Topic>;
    publish<T = any>(topicName: string, data: T, attributes?: Record<string, string>): Promise<string>;
    subscribe<T = any>(subscriptionName: string, handler: MessageHandler<T>, config?: Partial<SubscriptionConfig>): Promise<Subscription>;
    createSubscription(config: SubscriptionConfig): Promise<void>;
    close(): Promise<void>;
    private parseDuration;
}
