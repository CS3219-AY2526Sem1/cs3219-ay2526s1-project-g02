import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { MatchingGateway } from './matching.gateway';
import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseService } from 'src/database/database.service';
import { CheckService } from 'src/check/check.service';
import { CancellationResultOutput } from './matching.dto';
import { EventBusService } from 'src/event-bus/event-bus.service';
import { Difficulty, MatchRequest, MatchResult, QueueMember } from 'src/utils/types';
import { getCurrentUnixTimestamp } from 'src/utils/utils';

/* -------------------- Constants -------------------- */
const MATCH_QUEUE_PREFIX = 'matching:queue:';
const CANDIDATE_PEEK_COUNT = 50;
const QUEUE_TTL_SECONDS = 300; // 5 minutes

/* -------------------- Matching Service Class -------------------- */
@Injectable()
export class MatchingService {

    private readonly logger = new Logger(MatchingService.name);
    private readonly supabase: SupabaseClient;

    constructor(
        private readonly redisService: RedisService,
        private readonly matchingGateway: MatchingGateway,
        private readonly dbService: DatabaseService,
        private readonly checkService: CheckService,
        private readonly eventBusService: EventBusService,
    ) {
        this.supabase = this.dbService.getClient();
    }

    public async findMatchOrQueueUser(user: MatchRequest): Promise<MatchResult> {
        const { userId, difficulty } = user;

        // Step 1. Check if user is already in active session
        if (await this.checkService.isUserInActiveMatch(userId)) {
            this.logger.warn(`Match request blocked: User ${userId} is already in an active match.`);
            return {
                matchFound: false,
                queued: false,
                reason: 'User already in active match',
            }
        }

        // Step 2. Record the match request in database
        const requestId = await this.recordNewMatchRequest(user);
        const requestWithId: MatchRequest = { ...user, requestId };

        // Step 3: Search primary queue (same difficulty)
        let result = await this.searchQueue(requestWithId, difficulty);
        if (result.matchFound) {
            return { ...result, requestId };
        }

        // Step 4: Search fallback queues (other difficulties)
        const fallbackDifficulties = ['easy', 'medium', 'hard'].filter(d => d !== difficulty) as Difficulty[];
        for (const fallbackDifficulty of fallbackDifficulties) {
            result = await this.searchQueue(requestWithId, fallbackDifficulty);
            if (result.matchFound) {
                return { ...result, requestId };
            }
        }

        // Step 5: No match found - queue user to wait
        await this.queueUser(requestWithId);
        return {
            matchFound: false,
            queued: true,
            queueKey: this.getQueueKey(difficulty),
            requestId: requestId,
        };
    }

    public async cancelMatchRequest(requestId: string): Promise<CancellationResultOutput> {
        this.logger.log(`Attempting to cancel match request with ID ${requestId}`);
        
        // Step 1: Search all queues for the request
        const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
        let matchedQueueKey: string | null = null;
        let memberString: string | null = null;

        for (const difficulty of difficulties) {
            const key = this.getQueueKey(difficulty);
            const candidateStrings = await this.redisService.peekCandidates(key, CANDIDATE_PEEK_COUNT); // maybe increase CANDIDATE_PEEK_COUNT if needed
            for (const candidateStr of candidateStrings) {
                try {
                    const candidate = JSON.parse(candidateStr) as QueueMember;
                    if (candidate.requestId === requestId) {
                        matchedQueueKey = key;
                        memberString = candidateStr;
                        break;
                    }
                } catch (e) {
                    this.logger.warn(`Failed to parse queue member JSON during cancellation request: ${candidateStr}`);
                    continue; // skip malformed entry
                }
            }
            if (matchedQueueKey) break;
        }

        // Step 2: Check if request is (a) already matched or (b) expired
        if (!matchedQueueKey || !memberString) {
            const { data, error } = await this.supabase
                .from('match_requests')
                .select('status')
                .eq('id', requestId)
                .single();
            
            // Not pending means either matched or expired
            if (data && data.status !== 'pending') {
                return { success: false, reason: 'Request already matched or expired' };
            }

            return { success: false, reason: 'Request not found in active queues. It may have just been matched or expired.' };
        }

        // Step 3: Remove from Redis queue
        const removedCount = await this.redisService.removeUserFromQueue(matchedQueueKey, memberString);
        if (removedCount !== 1) {
            this.logger.warn(`Cancellation race condition: Redis ZREM returned ${removedCount} for ID ${requestId}. Proceeding to DB update.`);
        }

        // Step 4: Update DB status to 'cancelled'
        const { error: dbError } = await this.supabase
            .from('match_requests')
            .update({ status: 'cancelled' })
            .eq('id', requestId);
        if (dbError) {
            this.logger.error(`Fatal DB Write Error during cancellation for request ID ${requestId}: ${dbError.message}`);
            return { success: false, reason: 'Database error during cancellation' };
        }

        this.logger.log(`Successfully cancelled match request with ID ${requestId}`);
        return { success: true };

    }

    /* -------------------- Private Helper Methods -------------------- */
    
    // Records new match request in DB
    private async recordNewMatchRequest(request: MatchRequest): Promise<string> {
        const { userId, language, difficulty, topics } = request;
        const expiresAt = new Date(Date.now() + QUEUE_TTL_SECONDS * 1000).toISOString();

        this.logger.debug(`Recording new match request for user ${userId}`);

        const { data, error } = await this.supabase
            .from('match_requests')
            .insert({
                user_id: userId,
                preferred_language: language,
                preferred_difficulty: difficulty,
                preferred_topics: topics,
                expires_at: expiresAt
            })
            .select('id')
            .single();
        
        if (error) {
            this.logger.error(`Failed to record match request for user ${userId}: ${error.message}`);
            throw new Error('Failed to persist match request');
        }

        return data!.id;
    }
    
    // Searches selected queue
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
                if (!potentialCandidate || !potentialCandidate.userId) {
                    throw new Error("Malformed candidate");
                }
            }  catch (e) {
                this.logger.warn(`Failed to parse queue member JSON: ${candidateStr}`);
                await this.redisService.removeUserFromQueue(key, candidateStr); // remove malformed entry
                this.logger.log(`Removing malformed entry ${potentialCandidate?.userId} from queue ${key}`);
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
        this.logger.log(`No match found for user ${user.userId}`);
        return {
            matchFound: false,
            queued: false,
        }
    }

    // Adds specified user to appropriate queue
    private async queueUser(user: MatchRequest): Promise<void> {
        const key = this.getQueueKey(user.difficulty);
        const joinTime = getCurrentUnixTimestamp();
        const expireTime = joinTime + QUEUE_TTL_SECONDS

        const queueMember: QueueMember = {
            ...user,
            expiresAt: expireTime,
            requestId: user.requestId!,
        };

        const memberString = JSON.stringify(queueMember);
        await this.redisService.addUserToQueue(key, expireTime, memberString);
        this.logger.log(`User ${user.userId} queued in ${key}. DB ID: ${user.requestId}`);
    }

    // Cleanup - removes matched candidate from queue 
    private async finaliseMatch(
        user: MatchRequest,
        matchedCandidate: QueueMember
    ): Promise<void> {

        // Step 1: Redis cleanup - remove matched candidate from queue
        const matchedCandidateKey = this.getQueueKey(matchedCandidate.difficulty);
        const matchedCandidateStr = JSON.stringify(matchedCandidate);
        
        const removedCount = await this.redisService.removeUserFromQueue(matchedCandidateKey, matchedCandidateStr);
        this.logger.log(`Removing matched user ${matchedCandidate.userId} from queue ${matchedCandidateKey}`);
        
        if (removedCount !== 1) {
            this.logger.warn(`Potential race condition: Tried removing ${matchedCandidate.userId} but ZREM returned 0.`);
        }

        // Step 2: Record the finalised match in database
        const {data: matchData, error: matchError } = await this.supabase
            .from('matches')
            .insert({
                user1_id: user.userId,
                user2_id: matchedCandidate.userId,
                status: 'active',
            })
            .select('id')
            .single();
        
        const { error: req1Error } = await this.supabase
            .from('match_requests')
            .update({ status: 'matched' })
            .eq('id', user.requestId!);

        const { error: req2Error } = await this.supabase
            .from('match_requests')
            .update({ status: 'matched' })
            .eq('id', matchedCandidate.requestId!);
        
        if (matchError || req1Error || req2Error) {
            this.logger.error(`Fatal DB Write error during finalisation: ${matchError?.message || req1Error?.message || req2Error?.message}`);
        }

        // Step 3: Notify both users via WebSocket
        this.matchingGateway.notifyMatchFound(
            user.userId,
            matchedCandidate.userId,
            matchData!.id,
        )

        // Step 4: Publish to Event Bus (to notify Collaboration Service)
        const user1TopicsSet = new Set(user.topics);
        const commonTopics = matchedCandidate.topics.filter(topic => user1TopicsSet.has(topic));
        this.eventBusService.publishMatchFound({
            matchId: matchData!.id,
            user1Id: user.userId,
            user2Id: matchedCandidate.userId,
            difficulty: user.difficulty,
            language: user.language,
            commonTopics: commonTopics,
        })
    }

    // Helper method to get queue key based on difficulty
    private getQueueKey(difficulty: Difficulty): string {
        return `${MATCH_QUEUE_PREFIX}${difficulty}`;
    }
}
