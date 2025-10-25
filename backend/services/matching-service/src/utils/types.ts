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