import { Difficulty, QueueMember, RedisService } from "src/redis/redis.service";
import { mockRedisService, mockMatchingGateway } from "./matching.mocks";
import { MatchingService, MatchRequest } from "./matching.service";
import { Test, TestingModule } from '@nestjs/testing';
import { MatchingGateway } from "./matching.gateway";
import { ConsoleLogger, Logger } from "@nestjs/common";

export const USER_A_REQUEST: MatchRequest = {
    userId: 'user-a',
    language: 'Python',
    topics: ['Algorithms', 'Data Structures'],
    difficulty: 'medium' as Difficulty,
};

export const USER_B_REQUEST: MatchRequest = {
    userId: 'user-b',
    language: 'Javascript',
    topics: ['Algorithms', 'Data Structures', 'Trees'],
    difficulty: 'easy' as Difficulty,
}

export const USER_C_MEMBER: QueueMember = {
    userId: 'user-c',
    language: 'Python',
    topics: ['Algorithms', 'Graph Theory'],
    difficulty: 'medium' as Difficulty,
    expiresAt: Math.floor(Date.now() / 1000) + 100 // arbitrary future timestamp
};

export const USER_D_MEMBER: QueueMember = {
    userId: 'user-d',
    language: 'Python',
    topics: ['Algorithms', 'Dynamic Programming', 'Searching'],
    difficulty: 'easy' as Difficulty,
    expiresAt: Math.floor(Date.now() / 1000) + 100 // arbitrary future timestamp
};

export const USER_E_MEMBER: QueueMember = {
    userId: 'user-e',
    language: 'Python',
    topics: ['Algorithms', 'Sliding Window', 'Sorting'],
    difficulty: 'hard' as Difficulty,
    expiresAt: Math.floor(Date.now() / 1000) + 100 // arbitrary future timestamp
};

export const USER_F_MEMBER: QueueMember = {
    userId: 'user-f',
    language: 'Python',
    topics: ['Trees', 'Recursion'],
    difficulty: 'medium' as Difficulty,
    expiresAt: Math.floor(Date.now() / 1000) + 100 // arbitrary future timestamp
};

export const USER_G_MEMBER: QueueMember = {
    userId: 'user-g',
    language: 'Python',
    topics: ['Graphs'],
    difficulty: 'easy' as Difficulty,
    expiresAt: Math.floor(Date.now() / 1000) + 100 // arbitrary future timestamp
}

const getQueueKey = (d: Difficulty) => `matching:queue:${d}`;

describe('MatchingService', () => {
    let service: MatchingService;
    let testLogger: ConsoleLogger;
    const redisServiceMock = mockRedisService as any;
    const gatewayMock = mockMatchingGateway as any;

    beforeEach(async () => {
        // 1. Build testing module
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MatchingService,
                {
                    provide: RedisService,
                    useValue: redisServiceMock,
                },
                {
                    provide: MatchingGateway,
                    useValue: gatewayMock,
                },
            ],
        })
        .setLogger(new ConsoleLogger())
        .compile();
        service = module.get<MatchingService>(MatchingService);
        testLogger = new ConsoleLogger('Testing');

        // 2. Cleanup and Reset before each test
        jest.clearAllMocks();
        redisServiceMock.resetQueueData();
    });

    // Scenario 1: Find Match in Primary Queue and Finalise.
    it("should find a match in the primary queue and finalise", async () => {
        testLogger.log("SCENARIO 1");

        // Arrange: Put a valid candidate in the primary queue
        const primaryKey = USER_A_REQUEST.difficulty; // 'medium'
        redisServiceMock.setQueueState(primaryKey, [USER_C_MEMBER]);

        // Act: Request Match
        const result = await service.findMatchOrQueueUser(USER_A_REQUEST);
        
        // Assert: Match Found
        expect(result.matchFound).toBe(true);
        expect(result.matchedUserId).toBeDefined();
        expect(result.matchedUserId).toBe(USER_C_MEMBER.userId);
        expect(result.queued).toBe(false);

        // Verify: Correct Redis calls
        expect(redisServiceMock.peekCandidates).toHaveBeenCalledTimes(1);
        expect(redisServiceMock.addUserToQueue).not.toHaveBeenCalled();

        // Verify: Finalisation steps
        const expectedMemberString = JSON.stringify(USER_C_MEMBER);
        expect(redisServiceMock.removeUserFromQueue).toHaveBeenCalledTimes(1);
        expect(redisServiceMock.removeUserFromQueue).toHaveBeenCalledWith(
            getQueueKey(primaryKey),
            expectedMemberString
        );
        expect(gatewayMock.notifyMatchFound).toHaveBeenCalledTimes(1);

        // Verify: Queue does not contain matched user anymore
        const remainingMembers = await redisServiceMock.peekCandidates(
            getQueueKey(primaryKey),
            10
        );
        expect(remainingMembers.length).toBe(0);
    });

    // Scenario 2: Find Match in Next Fallback Queue (after Primary fails) and Finalise.
    it("should find a match in the fallback queue and finalise", async () => {
        testLogger.log("SCENARIO 2");
        
        // Arrange: Put a valid candidate in the 'easy' queue (fallback)
        const fallbackKey = 'easy';
        redisServiceMock.setQueueState(fallbackKey, [USER_D_MEMBER]);

        // Act: Request Match
        const result = await service.findMatchOrQueueUser(USER_A_REQUEST);

        // Assert: Match Found
        expect(result.matchFound).toBe(true);
        expect(result.matchedUserId).toBeDefined();
        expect(result.matchedUserId).toBe(USER_D_MEMBER.userId);
        expect(result.queued).toBe(false);

        // Verify: Correct Redis calls
        expect(redisServiceMock.peekCandidates).toHaveBeenCalledTimes(2);
        expect(redisServiceMock.peekCandidates).toHaveBeenNthCalledWith(
            1,
            getQueueKey('medium'),
            expect.any(Number)
        );
        expect(redisServiceMock.peekCandidates).toHaveBeenLastCalledWith(
            getQueueKey(fallbackKey),
            expect.any(Number)
        );
        expect(redisServiceMock.addUserToQueue).not.toHaveBeenCalled();

        // Verify: Finalisation steps
        const expectedMemberString = JSON.stringify(USER_D_MEMBER);
        expect(redisServiceMock.removeUserFromQueue).toHaveBeenCalledTimes(1);
        expect(redisServiceMock.removeUserFromQueue).toHaveBeenCalledWith(
            getQueueKey(fallbackKey),
            expectedMemberString
        );
        expect(gatewayMock.notifyMatchFound).toHaveBeenCalledTimes(1);

        // Verify: Queue does not contain matched user anymore
        const remainingMembers = await redisServiceMock.peekCandidates(
            getQueueKey(fallbackKey),
            10
        );
        expect(remainingMembers.length).toBe(0);
    });

    // Scenario 3: Find Match in Last Fallback Queue (after Pri/Sec fails) and Finalise.
    it("should find a match in the last fallback queue and finalise", async () => {
        testLogger.log("SCENARIO 3");

        // Arrange: Put a valid candidate in the 'hard' queue (last fallback)
        const lastFallbackKey = 'hard';
        redisServiceMock.setQueueState(lastFallbackKey, [USER_E_MEMBER]);

        // Act: Request Match
        const result = await service.findMatchOrQueueUser(USER_A_REQUEST);

        // Assert: Match Found
        expect(result.matchFound).toBe(true);
        expect(result.matchedUserId).toBeDefined();
        expect(result.matchedUserId).toBe(USER_E_MEMBER.userId);
        expect(result.queued).toBe(false);

        // Verify: Correct Redis calls
        expect(redisServiceMock.peekCandidates).toHaveBeenCalledTimes(3);
        expect(redisServiceMock.peekCandidates).toHaveBeenNthCalledWith(
            1,
            getQueueKey('medium'),
            expect.any(Number)
        );
        expect(redisServiceMock.peekCandidates).toHaveBeenNthCalledWith(
            2,
            getQueueKey('easy'),
            expect.any(Number)
        );
        expect(redisServiceMock.peekCandidates).toHaveBeenLastCalledWith(
            getQueueKey(lastFallbackKey),
            expect.any(Number)
        );
        expect(redisServiceMock.addUserToQueue).not.toHaveBeenCalled();

        // Verify: Finalisation steps
        const expectedMemberString = JSON.stringify(USER_E_MEMBER);
        expect(redisServiceMock.removeUserFromQueue).toHaveBeenCalledTimes(1);
        expect(redisServiceMock.removeUserFromQueue).toHaveBeenCalledWith(
            getQueueKey(lastFallbackKey),
            expectedMemberString
        );
        expect(gatewayMock.notifyMatchFound).toHaveBeenCalledTimes(1);

        // Verify: Queue does not contain matched user anymore
        const remainingMembers = await redisServiceMock.peekCandidates(
            getQueueKey(lastFallbackKey),
            10
        );
        expect(remainingMembers.length).toBe(0);
    });

    // Scenario 4: No match found due to incompatible language. Queue user.
    it("should queue user if no other user with compatible language is found", async () => {
        testLogger.log("SCENARIO 4");
        
        // Arrange: Put 3 candidates with Python in various queues (B is Javascript)
        const primaryKey = USER_D_MEMBER.difficulty; // 'easy'
        const secondaryKey = USER_C_MEMBER.difficulty; // 'medium'
        const tertiaryKey = USER_E_MEMBER.difficulty; // 'hard'
        redisServiceMock.setQueueState(primaryKey, [USER_D_MEMBER]);
        redisServiceMock.setQueueState(secondaryKey, [USER_C_MEMBER]);
        redisServiceMock.setQueueState(tertiaryKey, [USER_E_MEMBER]);

        // Act: Request Match
        const result = await service.findMatchOrQueueUser(USER_B_REQUEST);

        // Assert: No match found
        expect(result.matchFound).toBe(false);
        expect(result.matchedUserId).toBeUndefined();
        expect(result.queued).toBe(true);
        expect(result.queueKey).toBeDefined();
        expect(result.queueKey).toBe(getQueueKey(USER_B_REQUEST.difficulty));

        // Verify: Correct Redis calls
        expect(redisServiceMock.peekCandidates).toHaveBeenCalledTimes(3);
        expect(redisServiceMock.addUserToQueue).toHaveBeenCalledTimes(1);
        expect(redisServiceMock.addUserToQueue).toHaveBeenCalledWith(
            getQueueKey(USER_B_REQUEST.difficulty),
            expect.any(Number),
            expect.stringContaining(USER_B_REQUEST.userId)
        );

        // Verify: No finalisation steps called
        expect(redisServiceMock.removeUserFromQueue).not.toHaveBeenCalled();
        expect(gatewayMock.notifyMatchFound).not.toHaveBeenCalled();

        // Verify: User is actually in the queue
        const queuedMembers = await redisServiceMock.peekCandidates(
            getQueueKey(USER_B_REQUEST.difficulty),
            10
        );
        expect(queuedMembers.length).toBe(2);
        const queuedMember = JSON.parse(queuedMembers[1]) as QueueMember;
        expect(queuedMember.userId).toBe(USER_B_REQUEST.userId);
    }); 

    // Scenario 5: No match found due to incompatible topics. Queue user. 
    it("should queue user if no other user with overlapping topics is found", async () => {
        testLogger.log("SCENARIO 5");
        
        // Arrange: Put 2 candidates with non-overlapping topics with A in various queues
        const primaryKey = USER_F_MEMBER.difficulty; // 'medium'
        const secondaryKey = USER_G_MEMBER.difficulty; // 'easy'
        redisServiceMock.setQueueState(primaryKey, [USER_F_MEMBER]);
        redisServiceMock.setQueueState(secondaryKey, [USER_G_MEMBER]);

        // Act: Request Match
        const result = await service.findMatchOrQueueUser(USER_A_REQUEST);

        // Assert: No match found
        expect(result.matchFound).toBe(false);
        expect(result.matchedUserId).toBeUndefined();
        expect(result.queued).toBe(true);
        expect(result.queueKey).toBeDefined();
        expect(result.queueKey).toBe(getQueueKey(USER_A_REQUEST.difficulty));

        // Verify: Correct Redis calls
        expect(redisServiceMock.peekCandidates).toHaveBeenCalledTimes(3);
        expect(redisServiceMock.addUserToQueue).toHaveBeenCalledTimes(1);
        expect(redisServiceMock.addUserToQueue).toHaveBeenCalledWith(
            getQueueKey(USER_A_REQUEST.difficulty),
            expect.any(Number),
            expect.stringContaining(USER_A_REQUEST.userId)
        );

        // Verify: No finalisation steps called
        expect(redisServiceMock.removeUserFromQueue).not.toHaveBeenCalled();
        expect(gatewayMock.notifyMatchFound).not.toHaveBeenCalled();

        // Verify: User is actually in the queue
        const queuedMembers = await redisServiceMock.peekCandidates(
            getQueueKey(USER_A_REQUEST.difficulty),
            10
        );
        expect(queuedMembers.length).toBe(2);
        const queuedMember = JSON.parse(queuedMembers[1]) as QueueMember;
        expect(queuedMember.userId).toBe(USER_A_REQUEST.userId);
    });

    // Scenario 6: No match found due to empty queues. Queue user. 
    it('should queue user if no match found due to all queues empty', async () => {
        testLogger.log("SCENARIO 6");

        // Act: Request Match
        const result = await service.findMatchOrQueueUser(USER_A_REQUEST);

        // Assert: No match found
        expect(result.matchFound).toBe(false);
        expect(result.matchedUserId).toBeUndefined();
        expect(result.queued).toBe(true);
        expect(result.queueKey).toBeDefined();
        expect(result.queueKey).toBe(getQueueKey(USER_A_REQUEST.difficulty));
        
        // Verify: Correct Redis calls  
        expect(redisServiceMock.peekCandidates).toHaveBeenCalledTimes(3);
        expect(redisServiceMock.addUserToQueue).toHaveBeenCalledTimes(1);
        expect(redisServiceMock.addUserToQueue).toHaveBeenCalledWith(
            getQueueKey(USER_A_REQUEST.difficulty),
            expect.any(Number),
            expect.stringContaining(USER_A_REQUEST.userId)
        );

        // Verify: No finalisation steps called
        expect(redisServiceMock.removeUserFromQueue).not.toHaveBeenCalled();
        expect(gatewayMock.notifyMatchFound).not.toHaveBeenCalled();

        // Verify: User added to queue
        const queuedMembers = await redisServiceMock.peekCandidates(
            getQueueKey(USER_A_REQUEST.difficulty),
            10
        );
        expect(queuedMembers.length).toBe(1);
        const queuedMember = JSON.parse(queuedMembers[0]) as QueueMember;
        expect(queuedMember.userId).toBe(USER_A_REQUEST.userId);
    }); 

    // Scenario 7: Corrupted Queue Data. Remove corrupted entry. Find match. 
    it('should handle corrupted queue data gracefully and continue searching', async () => {
        testLogger.log("SCENARIO 7");

        // Arrange: Put a corrupted entry and a valid candidate in the primary queue
        const primaryKey = USER_A_REQUEST.difficulty; // 'medium'
        const corruptedEntry = { invalidField: 'corrupted-data' };
        const corruptedEntryString = JSON.stringify(corruptedEntry);
        redisServiceMock.setQueueState(primaryKey, [corruptedEntry, USER_C_MEMBER]);

        // Act: Request Match
        const result = await service.findMatchOrQueueUser(USER_A_REQUEST);

        // Assert: Match Found
        expect(result.matchFound).toBe(true);
        expect(result.matchedUserId).toBeDefined();
        expect(result.matchedUserId).toBe(USER_C_MEMBER.userId);
        expect(result.queued).toBe(false);
        expect(result.queueKey).toBeUndefined();

        // Verify: Correct Redis calls
        expect(redisServiceMock.peekCandidates).toHaveBeenCalledTimes(1);
        expect(redisServiceMock.addUserToQueue).not.toHaveBeenCalled();

        // Verify: Corrupted entry removed and valid candidate finalised
        const expectedMemberString = JSON.stringify(USER_C_MEMBER);
        expect(redisServiceMock.removeUserFromQueue).toHaveBeenCalledTimes(2);
        expect(redisServiceMock.removeUserFromQueue).toHaveBeenNthCalledWith(
            1,
            getQueueKey(primaryKey),
            corruptedEntryString
        );
        expect(redisServiceMock.removeUserFromQueue).toHaveBeenNthCalledWith(
            2,
            getQueueKey(primaryKey),
            expectedMemberString
        );
        expect(gatewayMock.notifyMatchFound).toHaveBeenCalledTimes(1);

        // Verify: Queue does not contain matched user anymore
        const remainingMembers = await redisServiceMock.peekCandidates(
            getQueueKey(primaryKey),
            10
        );
        expect(remainingMembers.length).toBe(0);
    });

})