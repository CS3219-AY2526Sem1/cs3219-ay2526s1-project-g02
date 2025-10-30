// General types
export type Difficulty = 'easy' | 'medium' | 'hard';

// Redis-specific types
export interface QueueMember {
    userId: string;
    language: string;
    topics: string[];
    difficulty: Difficulty;
    expiresAt: number; // Unix timestamp
    requestId: string;
}

// Matching service-specific types
export interface MatchRequest {
    userId: string;
    language: string;
    topics: string[];
    difficulty: Difficulty;
    requestId?: string;
}

export interface MatchResult {
    matchFound: boolean;
    matchedUserId?: string;
    queued: boolean;
    queueKey?: string;
    requestId?: string;
    reason?: string;
}