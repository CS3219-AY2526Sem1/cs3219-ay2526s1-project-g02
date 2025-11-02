export interface PubSubConfig {
    projectId: string;
    keyFilename?: string;
    emulatorHost?: string;
}
export interface TopicConfig {
    name: string;
    enableMessageOrdering?: boolean;
    messageRetentionDuration?: string;
}
export interface SubscriptionConfig {
    name: string;
    topicName: string;
    ackDeadlineSeconds?: number;
    messageRetentionDuration?: string;
    retryPolicy?: {
        minimumBackoff?: string;
        maximumBackoff?: string;
    };
    deadLetterPolicy?: {
        deadLetterTopic: string;
        maxDeliveryAttempts: number;
    };
    enableMessageOrdering?: boolean;
}
export declare const DEFAULT_PUBSUB_CONFIG: Partial<PubSubConfig>;
export declare const DEFAULT_ACK_DEADLINE_SECONDS = 60;
export declare const DEFAULT_MESSAGE_RETENTION = "7d";
export declare const MAX_RETRY_ATTEMPTS = 5;
