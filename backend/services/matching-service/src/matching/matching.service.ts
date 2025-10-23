import { Injectable, Logger } from '@nestjs/common';
import { Difficulty, QueueMember, RedisService } from 'src/redis/redis.service';
import { MatchingGateway } from './matching.gateway';


/* -------------------- Interfaces -------------------- */
export interface MatchRequest {
    userId: string;
    language: string;
    topics: string[];
    difficulty: Difficulty;
}

export interface MatchResult {
    matchFound: boolean;
    matchedUserId?: string;
    queued: boolean;
    queueKey?: string;
}

/* -------------------- Constants -------------------- */
const MATCH_QUEUE_PREFIX = 'matching:queue:';
const CANDIDATE_PEEK_COUNT = 50;
const QUEUE_TTL_SECONDS = 300; // 5 minutes

/* -------------------- Matching Service Class -------------------- */
@Injectable()
export class MatchingService {
    
    private readonly logger = new Logger(MatchingService.name);

    constructor(
        private readonly redisService: RedisService,
        private readonly matchingGateway: MatchingGateway,    
    ) {}

    async findMatchOrQueueUser(user: MatchRequest): Promise<MatchResult> {
        const { difficulty } = user;

        // 1. Search primary queue (same difficulty)
        let result = await this.searchQueue(user, difficulty);
        if (result.matchFound) {
            return result;
        }

        // 2. Search fallback queues (other difficulties)
        const fallbackDifficulties = ['easy', 'medium', 'hard'].filter(d => d !== difficulty) as Difficulty[];
        for (const fallbackDifficulty of fallbackDifficulties) {
            result = await this.searchQueue(user, fallbackDifficulty);
            if (result.matchFound) {
                return result;
            }
        }

        // 3. No match found: queue user to wait
        await this.queueUser(user);
        return {
            matchFound: false,
            queued: true,
            queueKey: this.getQueueKey(difficulty),
        };
    }

    private async searchQueue(
        user: MatchRequest, 
        targetDifficulty: Difficulty
    ): Promise<MatchResult> {
        const key = this.getQueueKey(targetDifficulty);
        this.logger.debug(`Searching queue ${key} for user ${user.userId}`);

        const candidateStrings = await this.redisService.peekCandidates(key, CANDIDATE_PEEK_COUNT);

        for (const candidateStr of candidateStrings) {
            let potentialCandidate: QueueMember;
            try {
                potentialCandidate = JSON.parse(candidateStr) as QueueMember;
            }  catch (e) {
                this.logger.log(`Failed to parse queue member JSON: ${candidateStr}`, e.stack);
                await this.redisService.removeUserFromQueue(key, candidateStr); // remove malformed entry
                continue; // skip malformed entry
            }

            // Mandatory check for language match
            if (user.language !== potentialCandidate.language) {
                continue;
            }

            // Mandatory check for topic overlap
            const hasTopicOverlap = user.topics.some(topic => potentialCandidate.topics.includes(topic));
            if (!hasTopicOverlap) {
                continue;
            }

            // Match found!

            // (a) Finalise match by removing matched user from queue
            await this.finaliseMatch(user, potentialCandidate);

            // (b) Return matched result
            return {
                matchFound: true,
                matchedUserId: potentialCandidate.userId,
                queued: false,
            };
        }

        // No match found...
        return {
            matchFound: false,
            queued: false,
        }
    }

    private async queueUser(user: MatchRequest): Promise<void> {
        const key = this.getQueueKey(user.difficulty);
        const joinTime = Math.floor(Date.now() / 1000); // Current Unix time in seconds
        const expireTime = joinTime + QUEUE_TTL_SECONDS

        const queueMember: QueueMember = {
            ...user,
            expiresAt: expireTime,
        };

        const memberString = JSON.stringify(queueMember);
        await this.redisService.addUserToQueue(key, expireTime, memberString);
        this.logger.log(`User ${user.userId} queued in ${key}`);
    }

    private async finaliseMatch(
        user: MatchRequest,
        matchedCandidate: QueueMember
    ): Promise<void> {
        const matchedCandidateKey = this.getQueueKey(matchedCandidate.difficulty);
        const matchedCandidateStr = JSON.stringify(matchedCandidate);

        // Remove matched user from queue
        const removedCount = await this.redisService.removeUserFromQueue(matchedCandidateKey, matchedCandidateStr);

        if (removedCount !== 1) {
            this.logger.warn(`Potential race condition: Tried removing ${matchedCandidate.userId} but ZREM returned 0.`);
        } else {
            this.logger.log(`Match success! ${user.userId} paired with ${matchedCandidate.userId}`);
            
            // TODO: Change this to notify CollaborationService via Event Bus etc.
            const roomInfo = { roomId: `chat-${user.userId}-${matchedCandidate.userId}` };
            
            this.matchingGateway.notifyMatchFound(
                user.userId,
                matchedCandidate.userId,
                roomInfo
            );
        }
    }

    private getQueueKey(difficulty: Difficulty): string {
        return `${MATCH_QUEUE_PREFIX}${difficulty}`;
    }
}
