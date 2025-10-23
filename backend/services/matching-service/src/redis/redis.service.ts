import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QueueMember {
    userId: string;
    language: string;
    topics: string[];
    difficulty: Difficulty;
    expiresAt: number; // Unix timestamp
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    public client: Redis;

    constructor() {
        this.client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
        })
    }

    onModuleInit() {
        this.client.on("connect", () => {
            console.log("Connected to Redis");
        });
        this.client.on("error", (err) => {
            console.error("Redis Client Error", err);
        })
    }

    onModuleDestroy() {
        this.client.quit();
    }

    /* -------------------- Core Queue Operations -------------------- */
    // note: 'member: string' is a JSON-stringified QueueMember object
    // note: 'score' is the expiration timestamp. expiration = join time + TTL

    /**
     * Adds a member to the specific difficulty queue for waiting.
     * @param key The Redis key.
     * @param score The timestamp score (expiration time).
     * @param member The JSON string of the member to add.
     * @returns The number of elements added to the sorted set.
     */
    async addUserToQueue(key: string, score: number, member: string): Promise<number> {
        return this.client.zadd(key, score, member);
    }

    /**
     * Fetches the 'count' number of candidates from front of queue without removing them.
     * @param key The Redis key.
     * @param count The number of candidates to peek.
     * @returns The JSON strings of members.
     */
    async peekCandidates(key: string, count: number): Promise<string[]> {
        return this.client.zrange(key, 0, count - 1);
    }

    /**
     * Removes one or more members from the queue.
     * @param key The Redis key.
     * @param members The JSON strings of members to remove.
     * @returns The number of members removed.
     */
    async removeUserFromQueue(key: string, members: string | string[]): Promise<number> {
        return this.client.zrem(key, ...(Array.isArray(members) ? members : [members]));
    }

    /**
     * Retrieves members whose timestamps are expired (i.e., less than or equal to maxScore).
     * @param key The Redis key.
     * @param maxScore The maximum timestamp to check against.
     * @returns An array of expired members as strings.
     */
    async getExpiredMembers(key: string, maxScore: number): Promise<string[]> {
        return this.client.zrangebyscore(key, '-inf', maxScore);
    }

    /**
     * Removes members whose scores (timestamps) are expired.
     * @param key The Redis key.
     * @param maxScore The maximum TTL.
     * @returns The number of members removed.
     */
    async removeExpiredMembers(key: string, maxScore: number): Promise<number> {
        return this.client.zremrangebyscore(key, '-inf', maxScore);
    }
}
