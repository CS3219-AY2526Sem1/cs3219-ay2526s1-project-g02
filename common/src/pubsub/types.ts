/**
 * Message type definitions for Pub/Sub topics
 */

/**
 * Payload published to matching-queue when a match is found
 * Published by: Matching Service
 * Consumed by: Question Service
 */
export interface MatchFoundPayload {
    matchId: string;
    user1Id: string;
    user2Id: string;
    difficulty: 'easy' | 'medium' | 'hard';
    language: string;
    commonTopics: string[];
}

/**
 * Payload published to question-queue when a question is assigned
 * Published by: Question Service
 * Consumed by: Collaboration Service
 */
export interface QuestionAssignedPayload {
    matchId: string;
    sessionId?: string;
    user1Id: string;
    user2Id: string;
    questionId: string;
    questionTitle: string;
    questionDescription: string;
    difficulty: 'easy' | 'medium' | 'hard';
    topics: string[];
    testCases: QuestionTestCasePayload[];
}

export interface QuestionTestCasePayload {
    id: string;
    input: any;
    expectedOutput: any;
    isHidden: boolean;
    orderIndex: number;
}

/**
 * Payload published to session-queue for session lifecycle events
 * Published by: Collaboration Service
 * Consumed by: Matching Service
 */
export interface SessionEventPayload {
    matchId: string;
    eventType: 'session_started' | 'session_ended' | 'session_expired';
    timestamp: string;
}

/**
 * Union type of all message payloads
 */
export type PubSubMessage =
    | MatchFoundPayload
    | QuestionAssignedPayload
    | SessionEventPayload;

/**
 * Topic names as constants
 */
export const TOPICS = {
    MATCHING_QUEUE: 'matching-queue',
    QUESTION_QUEUE: 'question-queue',
    SESSION_QUEUE: 'session-queue',
} as const;

/**
 * Subscription names as constants
 */
export const SUBSCRIPTIONS = {
    MATCHING_QUEUE_SUB: 'matching-queue-sub',
    QUESTION_QUEUE_SUB: 'question-queue-sub',
    SESSION_QUEUE_SUB: 'session-queue-sub',
} as const;
