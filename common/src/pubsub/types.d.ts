export interface MatchFoundPayload {
    matchId: string;
    user1Id: string;
    user2Id: string;
    difficulty: 'easy' | 'medium' | 'hard';
    language: string;
    commonTopics: string[];
}
export interface QuestionAssignedPayload {
    matchId: string;
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
export interface SessionEventPayload {
    matchId: string;
    eventType: 'session_started' | 'session_ended' | 'session_expired';
    timestamp: string;
}
export type PubSubMessage = MatchFoundPayload | QuestionAssignedPayload | SessionEventPayload;
export declare const TOPICS: {
    readonly MATCHING_QUEUE: "matching-queue";
    readonly QUESTION_QUEUE: "question-queue";
    readonly SESSION_QUEUE: "session-queue";
};
export declare const SUBSCRIPTIONS: {
    readonly MATCHING_QUEUE_SUB: "matching-queue-sub";
    readonly QUESTION_QUEUE_SUB: "question-queue-sub";
    readonly SESSION_QUEUE_SUB: "session-queue-sub";
};
