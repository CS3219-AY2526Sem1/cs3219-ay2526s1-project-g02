import { Difficulty } from "./types";

// Helper methods

export function getQueueKey(difficulty: Difficulty): string {
    return `matching:queue:${difficulty}`;
}

export function getCurrentUnixTimestamp(): number {
    return Math.floor(Date.now() / 1000); // in seconds
}