/**
 * Pub/Sub configuration interface and defaults
 */

export interface PubSubConfig {
    projectId: string;
    keyFilename?: string; // Optional: path to service account key file
    emulatorHost?: string; // Optional: for local development with emulator
}

export interface TopicConfig {
    name: string;
    enableMessageOrdering?: boolean;
    messageRetentionDuration?: string; // e.g., '7d' for 7 days
}

export interface SubscriptionConfig {
    name: string;
    topicName: string;
    ackDeadlineSeconds?: number; // Default: 10 seconds
    messageRetentionDuration?: string; // How long to retain undelivered messages
    retryPolicy?: {
        minimumBackoff?: string; // e.g., '10s'
        maximumBackoff?: string; // e.g., '600s'
    };
    deadLetterPolicy?: {
        deadLetterTopic: string;
        maxDeliveryAttempts: number;
    };
    enableMessageOrdering?: boolean;
}

export const DEFAULT_PUBSUB_CONFIG: Partial<PubSubConfig> = {
    // These will be overridden by environment variables
};

export const DEFAULT_ACK_DEADLINE_SECONDS = 60; // 1 minute
export const DEFAULT_MESSAGE_RETENTION = '7d'; // 7 days
export const MAX_RETRY_ATTEMPTS = 5;
