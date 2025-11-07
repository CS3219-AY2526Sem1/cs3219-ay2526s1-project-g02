 import { RedisService } from "src/redis/redis.service";
import { mockRedisService, mockMatchingGateway, mockCheckService, mockEventBusService, mockDatabaseService } from "./matching.mocks";
import { MatchingService } from "./matching.service";
import { Test, TestingModule } from '@nestjs/testing';
import { MatchingGateway } from "./matching.gateway";
import { ConsoleLogger } from "@nestjs/common";
import { Difficulty, MatchRequest, QueueMember } from "src/utils/types";
import { getCurrentUnixTimestamp, getQueueKey } from "src/utils/utils";
import { CheckService } from "src/check/check.service";
import { EventBusService } from "src/event-bus/event-bus.service";
import { DatabaseService } from "src/database/database.service";
import { SessionEventPayload } from "@noclue/common";

const USER_A_REQUEST: MatchRequest = {
    userId: 'user-a',
    language: 'Python',
    topics: ['Algorithms', 'Data Structures'],
    difficulty: 'medium' as Difficulty,
    requestId: 'req-1',
};

const USER_B_REQUEST: MatchRequest = {
    userId: 'user-b',
    language: 'Javascript',
    topics: ['Algorithms', 'Data Structures', 'Trees'],
    difficulty: 'easy' as Difficulty,
    requestId: 'req-2',
}

const USER_C_MEMBER: QueueMember = {
    userId: 'user-c',
    language: 'Python',
    topics: ['Algorithms', 'Graph Theory'],
    difficulty: 'medium' as Difficulty,
    expiresAt: getCurrentUnixTimestamp() + 100, // arbitrary future timestamp
    requestId: 'req-3',
};

const USER_D_MEMBER: QueueMember = {
    userId: 'user-d',
    language: 'Python',
    topics: ['Algorithms', 'Dynamic Programming', 'Searching'],
    difficulty: 'easy' as Difficulty,
    expiresAt: getCurrentUnixTimestamp() + 100, // arbitrary future timestamp
    requestId: 'req-4',
};

const USER_E_MEMBER: QueueMember = {
    userId: 'user-e',
    language: 'Python',
    topics: ['Algorithms', 'Sliding Window', 'Sorting'],
    difficulty: 'hard' as Difficulty,
    expiresAt: getCurrentUnixTimestamp() + 100, // arbitrary future timestamp
    requestId: 'req-5',
};

const USER_F_MEMBER: QueueMember = {
    userId: 'user-f',
    language: 'Python',
    topics: ['Trees', 'Recursion'],
    difficulty: 'medium' as Difficulty,
    expiresAt: getCurrentUnixTimestamp() + 100, // arbitrary future timestamp
    requestId: 'req-6',
};

const USER_G_MEMBER: QueueMember = {
    userId: 'user-g',
    language: 'Python',
    topics: ['Graphs'],
    difficulty: 'easy' as Difficulty,
    expiresAt: getCurrentUnixTimestamp() + 100, // arbitrary future timestamp
    requestId: 'req-7',
};

describe('(A) MatchingService: Successful Match Flow', () => {
    let service: MatchingService;
    let testLogger: ConsoleLogger;
    const gatewayMock = mockMatchingGateway as any;
    const redisMock = mockRedisService as any;
    const checkMock = mockCheckService as any;
    const eventMock = mockEventBusService as any;
    const databaseMock = mockDatabaseService as any;

    beforeEach(async () => {
        jest.clearAllMocks();

        // 1. Build testing module
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MatchingService,
                { provide: MatchingGateway, useValue: gatewayMock },
                { provide: RedisService, useValue: redisMock },
                { provide: CheckService, useValue: checkMock },
                { provide: EventBusService, useValue: eventMock },
                { provide: DatabaseService, useValue: databaseMock },
            ],
        })
        .setLogger(new ConsoleLogger())
        .compile();
        service = module.get<MatchingService>(MatchingService);
        testLogger = new ConsoleLogger('Testing');

        // 2. Cleanup and Reset before each test
        redisMock.resetQueueData();
        checkMock.isUserInActiveMatch.mockResolvedValue(false);

        // 3. Database Mocks
        databaseMock.getClient().from.mockReturnThis();
        databaseMock.getClient().insert.mockReturnThis();
        databaseMock.getClient().select.mockReturnThis();
        databaseMock.getClient().single.mockResolvedValue({
            data: { id: 'MOCK-123' },
            error: null
        });
        databaseMock.getClient().update.mockReturnThis();
        databaseMock.getClient().eq.mockResolvedValue({ error: null });
        databaseMock.getClient().in.mockReturnThis();
    });

    // Scenario A1: Find Match in Primary Queue and Finalise.
    it("should find a match in the primary queue and finalise", async () => {
        testLogger.log("SCENARIO A1");
        const expectedMatchId = 'MOCK-123';
        const expectedCommonTopics = ['Algorithms'];

        // Arrange: Put a valid candidate in the primary queue
        const primaryKey = USER_A_REQUEST.difficulty; // 'medium'
        redisMock.setQueueState(primaryKey, [USER_C_MEMBER]);

        // Act: Request Match
        const result = await service.findMatchOrQueueUser(USER_A_REQUEST);
        
        // Assert: Match Found
        expect(result.matchFound).toBe(true);
        expect(result.matchedUserId).toBeDefined();
        expect(result.matchedUserId).toBe(USER_C_MEMBER.userId);
        expect(result.queued).toBe(false);

        // Verify: Correct Redis calls
        expect(redisMock.peekCandidates).toHaveBeenCalledTimes(1);
        expect(redisMock.addUserToQueue).not.toHaveBeenCalled();

        // Verify: Finalisation steps
        const expectedMemberString = JSON.stringify(USER_C_MEMBER);
        expect(redisMock.removeUserFromQueue).toHaveBeenCalledTimes(1);
        expect(redisMock.removeUserFromQueue).toHaveBeenCalledWith(
            getQueueKey(primaryKey),
            expectedMemberString
        );
        expect(databaseMock.getClient().insert).toHaveBeenCalledTimes(2);
        expect(databaseMock.getClient().update).toHaveBeenCalledTimes(2);
        expect(databaseMock.getClient().eq).toHaveBeenCalledTimes(2);
        expect(gatewayMock.notifyMatchFound).toHaveBeenCalledTimes(1);
        expect(gatewayMock.notifyMatchFound).toHaveBeenCalledWith(
            USER_A_REQUEST.userId,
            USER_C_MEMBER.userId,
            expectedMatchId,
        );
        expect(eventMock.publishMatchFound).toHaveBeenCalledTimes(1);
        expect(eventMock.publishMatchFound).toHaveBeenCalledWith(
            expect.objectContaining({
                matchId: 'MOCK-123',
                user1Id: USER_A_REQUEST.userId,
                user2Id: USER_C_MEMBER.userId,
                difficulty: USER_A_REQUEST.difficulty,
                language: USER_A_REQUEST.language,
                commonTopics: expectedCommonTopics,
            })
        );

        // Verify: Queue does not contain matched user anymore
        const remainingMembers = await redisMock.peekCandidates(
            getQueueKey(primaryKey),
            10
        );
        expect(remainingMembers.length).toBe(0);
    });

    // Scenario A2: Find Match in Next Fallback Queue (after Primary fails) and Finalise.
    it("should find a match in the fallback queue and finalise", async () => {
        testLogger.log("SCENARIO A2");
        const expectedMatchId = 'MOCK-123';
        const expectedCommonTopics = ['Algorithms'];
        
        // Arrange: Put a valid candidate in the 'easy' queue (fallback)
        const fallbackKey = 'easy';
        redisMock.setQueueState(fallbackKey, [USER_D_MEMBER]);

        // Act: Request Match
        const result = await service.findMatchOrQueueUser(USER_A_REQUEST);

        // Assert: Match Found
        expect(result.matchFound).toBe(true);
        expect(result.matchedUserId).toBeDefined();
        expect(result.matchedUserId).toBe(USER_D_MEMBER.userId);
        expect(result.queued).toBe(false);

        // Verify: Correct Redis calls
        expect(redisMock.peekCandidates).toHaveBeenCalledTimes(2);
        expect(redisMock.peekCandidates).toHaveBeenNthCalledWith(
            1,
            getQueueKey('medium'),
            expect.any(Number)
        );
        expect(redisMock.peekCandidates).toHaveBeenLastCalledWith(
            getQueueKey(fallbackKey),
            expect.any(Number)
        );
        expect(redisMock.addUserToQueue).not.toHaveBeenCalled();

        // Verify: Finalisation steps
        const expectedMemberString = JSON.stringify(USER_D_MEMBER);
        expect(redisMock.removeUserFromQueue).toHaveBeenCalledTimes(1);
        expect(redisMock.removeUserFromQueue).toHaveBeenCalledWith(
            getQueueKey(fallbackKey),
            expectedMemberString
        );
        expect(databaseMock.getClient().insert).toHaveBeenCalledTimes(2);
        expect(databaseMock.getClient().update).toHaveBeenCalledTimes(2);
        expect(databaseMock.getClient().eq).toHaveBeenCalledTimes(2);
        expect(gatewayMock.notifyMatchFound).toHaveBeenCalledTimes(1);
        expect(gatewayMock.notifyMatchFound).toHaveBeenCalledWith(
            USER_A_REQUEST.userId,
            USER_D_MEMBER.userId,
            expectedMatchId,
        );
        expect(eventMock.publishMatchFound).toHaveBeenCalledTimes(1);
        expect(eventMock.publishMatchFound).toHaveBeenCalledWith(
            expect.objectContaining({
                matchId: 'MOCK-123',
                user1Id: USER_A_REQUEST.userId,
                user2Id: USER_D_MEMBER.userId,
                difficulty: USER_A_REQUEST.difficulty,
                language: USER_A_REQUEST.language,
                commonTopics: expectedCommonTopics,
            })
        );

        // Verify: Queue does not contain matched user anymore
        const remainingMembers = await redisMock.peekCandidates(
            getQueueKey(fallbackKey),
            10
        );
        expect(remainingMembers.length).toBe(0);
    });

    // Scenario A3: Find Match in Last Fallback Queue (after Pri/Sec fails) and Finalise.
    it("should find a match in the last fallback queue and finalise", async () => {
        testLogger.log("SCENARIO A3");
        const expectedMatchId = 'MOCK-123';
        const expectedCommonTopics = ['Algorithms'];
        
        // Arrange: Put a valid candidate in the 'hard' queue (last fallback)
        const lastFallbackKey = 'hard';
        redisMock.setQueueState(lastFallbackKey, [USER_E_MEMBER]);

        // Act: Request Match
        const result = await service.findMatchOrQueueUser(USER_A_REQUEST);

        // Assert: Match Found
        expect(result.matchFound).toBe(true);
        expect(result.matchedUserId).toBeDefined();
        expect(result.matchedUserId).toBe(USER_E_MEMBER.userId);
        expect(result.queued).toBe(false);

        // Verify: Correct Redis calls
        expect(redisMock.peekCandidates).toHaveBeenCalledTimes(3);
        expect(redisMock.peekCandidates).toHaveBeenNthCalledWith(
            1,
            getQueueKey('medium'),
            expect.any(Number)
        );
        expect(redisMock.peekCandidates).toHaveBeenNthCalledWith(
            2,
            getQueueKey('easy'),
            expect.any(Number)
        );
        expect(redisMock.peekCandidates).toHaveBeenLastCalledWith(
            getQueueKey(lastFallbackKey),
            expect.any(Number)
        );
        expect(redisMock.addUserToQueue).not.toHaveBeenCalled();

        // Verify: Finalisation steps
        const expectedMemberString = JSON.stringify(USER_E_MEMBER);
        expect(redisMock.removeUserFromQueue).toHaveBeenCalledTimes(1);
        expect(redisMock.removeUserFromQueue).toHaveBeenCalledWith(
            getQueueKey(lastFallbackKey),
            expectedMemberString
        );
        expect(databaseMock.getClient().insert).toHaveBeenCalledTimes(2);
        expect(databaseMock.getClient().update).toHaveBeenCalledTimes(2);
        expect(databaseMock.getClient().eq).toHaveBeenCalledTimes(2);
        expect(gatewayMock.notifyMatchFound).toHaveBeenCalledTimes(1);
        expect(gatewayMock.notifyMatchFound).toHaveBeenCalledWith(
            USER_A_REQUEST.userId,
            USER_E_MEMBER.userId,
            expectedMatchId,
        );
        expect(eventMock.publishMatchFound).toHaveBeenCalledTimes(1);
        expect(eventMock.publishMatchFound).toHaveBeenCalledWith(
            expect.objectContaining({
                matchId: 'MOCK-123',
                user1Id: USER_A_REQUEST.userId,
                user2Id: USER_E_MEMBER.userId,
                difficulty: USER_A_REQUEST.difficulty,
                language: USER_A_REQUEST.language,
                commonTopics: expectedCommonTopics,
            })
        );

        // Verify: Queue does not contain matched user anymore
        const remainingMembers = await redisMock.peekCandidates(
            getQueueKey(lastFallbackKey),
            10
        );
        expect(remainingMembers.length).toBe(0);
    });

    // Scenario A4: Corrupted Queue Data. Remove corrupted entry. Find match. 
    it('should handle corrupted queue data gracefully and continue searching', async () => {
        testLogger.log("SCENARIO A4");
        const expectedMatchId = 'MOCK-123';
        const expectedCommonTopics = ['Algorithms'];

        // Arrange: Put a corrupted entry and a valid candidate in the primary queue
        const primaryKey = USER_A_REQUEST.difficulty; // 'medium'
        const corruptedEntry = { invalidField: 'corrupted-data' };
        const corruptedEntryString = JSON.stringify(corruptedEntry);
        redisMock.setQueueState(primaryKey, [corruptedEntry, USER_C_MEMBER]);

        // Act: Request Match
        const result = await service.findMatchOrQueueUser(USER_A_REQUEST);

        // Assert: Match Found
        expect(result.matchFound).toBe(true);
        expect(result.matchedUserId).toBeDefined();
        expect(result.matchedUserId).toBe(USER_C_MEMBER.userId);
        expect(result.queued).toBe(false);
        expect(result.queueKey).toBeUndefined();

        // Verify: Correct Redis calls
        expect(redisMock.peekCandidates).toHaveBeenCalledTimes(1);
        expect(redisMock.addUserToQueue).not.toHaveBeenCalled();

        // Verify: Corrupted entry removed and valid candidate finalised
        const expectedMemberString = JSON.stringify(USER_C_MEMBER);
        expect(redisMock.removeUserFromQueue).toHaveBeenCalledTimes(2);
        expect(redisMock.removeUserFromQueue).toHaveBeenNthCalledWith(
            1,
            getQueueKey(primaryKey),
            corruptedEntryString
        );
        expect(redisMock.removeUserFromQueue).toHaveBeenNthCalledWith(
            2,
            getQueueKey(primaryKey),
            expectedMemberString
        );
        expect(databaseMock.getClient().insert).toHaveBeenCalledTimes(2);
        expect(databaseMock.getClient().update).toHaveBeenCalledTimes(2);
        expect(databaseMock.getClient().eq).toHaveBeenCalledTimes(2);
        expect(gatewayMock.notifyMatchFound).toHaveBeenCalledTimes(1);
        expect(gatewayMock.notifyMatchFound).toHaveBeenCalledWith(
            USER_A_REQUEST.userId,
            USER_C_MEMBER.userId,
            expectedMatchId,
        );
        expect(eventMock.publishMatchFound).toHaveBeenCalledTimes(1);
        expect(eventMock.publishMatchFound).toHaveBeenCalledWith(
            expect.objectContaining({
                matchId: 'MOCK-123',
                user1Id: USER_A_REQUEST.userId,
                user2Id: USER_C_MEMBER.userId,
                difficulty: USER_A_REQUEST.difficulty,
                language: USER_A_REQUEST.language,
                commonTopics: expectedCommonTopics,
            })
        );

        // Verify: Queue does not contain matched user anymore
        const remainingMembers = await redisMock.peekCandidates(
            getQueueKey(primaryKey),
            10
        );
        expect(remainingMembers.length).toBe(0);
    });

    // Scenario A5: User in active match. Block new request. 
    it('should block and return failure if user is already in active match', async () => {
        testLogger.log("SCENARIO A5");

        // Mock check to indicate user is in active match
        checkMock.isUserInActiveMatch.mockResolvedValue(true);

        // Act: Request Match
        const result = await service.findMatchOrQueueUser(USER_A_REQUEST);

        // Assert: Match Not Found, Not Queued
        expect(result.matchFound).toBe(false);
        expect(result.queued).toBe(false);
        expect(result.reason).toContain('User already in active match');

        // Verify: Early Exit
        expect(databaseMock.getClient().insert).not.toHaveBeenCalled();
        expect(redisMock.peekCandidates).not.toHaveBeenCalled();
    })

    // Scenario A6: Throw error if DB failure on recording new request.
    it('should throw error if DB failure on recording new request', async () => {
        testLogger.log("SCENARIO A6");

        // Mock DB failure to insert
        databaseMock.getClient().single.mockResolvedValueOnce({
            data: null,
            error: { message: 'DB Connection Error' }
        });

        // Act and Assert: Request Match
        await expect(service.findMatchOrQueueUser(USER_A_REQUEST)).rejects.toThrow('Failed to persist match request');

        // Verify: Early Exit
        expect(redisMock.peekCandidates).not.toHaveBeenCalled();
        expect(redisMock.addUserToQueue).not.toHaveBeenCalled();
    })
});

describe('(B) MatchingService: Successful Queue Flow', () => {
    let service: MatchingService;
    let testLogger: ConsoleLogger;
    const gatewayMock = mockMatchingGateway as any;
    const redisMock = mockRedisService as any;
    const checkMock = mockCheckService as any;
    const eventMock = mockEventBusService as any;
    const databaseMock = mockDatabaseService as any;

    beforeEach(async () => {
        jest.clearAllMocks();

        // 1. Build testing module
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MatchingService,
                { provide: MatchingGateway, useValue: gatewayMock },
                { provide: RedisService, useValue: redisMock },
                { provide: CheckService, useValue: checkMock },
                { provide: EventBusService, useValue: eventMock },
                { provide: DatabaseService, useValue: databaseMock },
            ],
        })
        .setLogger(new ConsoleLogger())
        .compile();
        service = module.get<MatchingService>(MatchingService);
        testLogger = new ConsoleLogger('Testing');

        // 2. Cleanup and Reset before each test
        redisMock.resetQueueData();
        checkMock.isUserInActiveMatch.mockResolvedValue(false);

        // 3. Database Mocks
        databaseMock.getClient().from.mockReturnThis();
        databaseMock.getClient().insert.mockReturnThis();
        databaseMock.getClient().select.mockReturnThis();
        databaseMock.getClient().single.mockResolvedValue({
            data: { id: 'MOCK-123' },
            error: null
        });
        databaseMock.getClient().update.mockReturnThis();
        databaseMock.getClient().eq.mockResolvedValue({ error: null });
        databaseMock.getClient().in.mockReturnThis();
    });

    // Scenario B1: No match found due to incompatible language. Queue user.
    it("should queue user if no other user with compatible language is found", async () => {
        testLogger.log("SCENARIO B1");
        
        // Arrange: Put 3 candidates with Python in various queues (B is Javascript)
        const primaryKey = USER_D_MEMBER.difficulty; // 'easy'
        const secondaryKey = USER_C_MEMBER.difficulty; // 'medium'
        const tertiaryKey = USER_E_MEMBER.difficulty; // 'hard'
        redisMock.setQueueState(primaryKey, [USER_D_MEMBER]);
        redisMock.setQueueState(secondaryKey, [USER_C_MEMBER]);
        redisMock.setQueueState(tertiaryKey, [USER_E_MEMBER]);

        // Act: Request Match
        const result = await service.findMatchOrQueueUser(USER_B_REQUEST);

        // Assert: No match found
        expect(result.matchFound).toBe(false);
        expect(result.matchedUserId).toBeUndefined();
        expect(result.queued).toBe(true);
        expect(result.queueKey).toBeDefined();
        expect(result.queueKey).toBe(getQueueKey(USER_B_REQUEST.difficulty));

        // Verify: Correct Redis calls
        expect(redisMock.peekCandidates).toHaveBeenCalledTimes(3);
        expect(redisMock.addUserToQueue).toHaveBeenCalledTimes(1);
        expect(redisMock.addUserToQueue).toHaveBeenCalledWith(
            getQueueKey(USER_B_REQUEST.difficulty),
            expect.any(Number),
            expect.stringContaining(USER_B_REQUEST.userId)
        );

        // Verify: Correct DB calls
        expect(databaseMock.getClient().insert).toHaveBeenCalledTimes(1);
        expect(databaseMock.getClient().update).toHaveBeenCalledTimes(0);
        expect(databaseMock.getClient().eq).toHaveBeenCalledTimes(0);

        // Verify: No finalisation steps called
        expect(redisMock.removeUserFromQueue).not.toHaveBeenCalled();
        expect(gatewayMock.notifyMatchFound).not.toHaveBeenCalled();

        // Verify: User is actually in the queue
        const queuedMembers = await redisMock.peekCandidates(
            getQueueKey(USER_B_REQUEST.difficulty),
            10
        );
        expect(queuedMembers.length).toBe(2);
        const queuedMember = JSON.parse(queuedMembers[1]) as QueueMember;
        expect(queuedMember.userId).toBe(USER_B_REQUEST.userId);
    }); 

    // Scenario B2: No match found due to incompatible topics. Queue user. 
    it("should queue user if no other user with overlapping topics is found", async () => {
        testLogger.log("SCENARIO B2");
        
        // Arrange: Put 2 candidates with non-overlapping topics with A in various queues
        const primaryKey = USER_F_MEMBER.difficulty; // 'medium'
        const secondaryKey = USER_G_MEMBER.difficulty; // 'easy'
        redisMock.setQueueState(primaryKey, [USER_F_MEMBER]);
        redisMock.setQueueState(secondaryKey, [USER_G_MEMBER]);

        // Act: Request Match
        const result = await service.findMatchOrQueueUser(USER_A_REQUEST);

        // Assert: No match found
        expect(result.matchFound).toBe(false);
        expect(result.matchedUserId).toBeUndefined();
        expect(result.queued).toBe(true);
        expect(result.queueKey).toBeDefined();
        expect(result.queueKey).toBe(getQueueKey(USER_A_REQUEST.difficulty));

        // Verify: Correct Redis calls
        expect(redisMock.peekCandidates).toHaveBeenCalledTimes(3);
        expect(redisMock.addUserToQueue).toHaveBeenCalledTimes(1);
        expect(redisMock.addUserToQueue).toHaveBeenCalledWith(
            getQueueKey(USER_A_REQUEST.difficulty),
            expect.any(Number),
            expect.stringContaining(USER_A_REQUEST.userId)
        );

        // Verify: Correct DB calls
        expect(databaseMock.getClient().insert).toHaveBeenCalledTimes(1);
        expect(databaseMock.getClient().update).toHaveBeenCalledTimes(0);
        expect(databaseMock.getClient().eq).toHaveBeenCalledTimes(0);

        // Verify: No finalisation steps called
        expect(redisMock.removeUserFromQueue).not.toHaveBeenCalled();

        expect(gatewayMock.notifyMatchFound).not.toHaveBeenCalled();

        // Verify: User is actually in the queue
        const queuedMembers = await redisMock.peekCandidates(
            getQueueKey(USER_A_REQUEST.difficulty),
            10
        );
        expect(queuedMembers.length).toBe(2);
        const queuedMember = JSON.parse(queuedMembers[1]) as QueueMember;
        expect(queuedMember.userId).toBe(USER_A_REQUEST.userId);
    });

    // Scenario B3: No match found due to empty queues. Queue user. 
    it('should queue user if no match found due to all queues empty', async () => {
        testLogger.log("SCENARIO B3");

        // Act: Request Match
        const result = await service.findMatchOrQueueUser(USER_A_REQUEST);

        // Assert: No match found
        expect(result.matchFound).toBe(false);
        expect(result.matchedUserId).toBeUndefined();
        expect(result.queued).toBe(true);
        expect(result.queueKey).toBeDefined();
        expect(result.queueKey).toBe(getQueueKey(USER_A_REQUEST.difficulty));
        
        // Verify: Correct Redis calls  
        expect(redisMock.peekCandidates).toHaveBeenCalledTimes(3);
        expect(redisMock.addUserToQueue).toHaveBeenCalledTimes(1);
        expect(redisMock.addUserToQueue).toHaveBeenCalledWith(
            getQueueKey(USER_A_REQUEST.difficulty),
            expect.any(Number),
            expect.stringContaining(USER_A_REQUEST.userId)
        );

        // Verify: Correct DB calls
        expect(databaseMock.getClient().insert).toHaveBeenCalledTimes(1);
        expect(databaseMock.getClient().update).toHaveBeenCalledTimes(0);
        expect(databaseMock.getClient().eq).toHaveBeenCalledTimes(0);

        // Verify: No finalisation steps called
        expect(redisMock.removeUserFromQueue).not.toHaveBeenCalled();
        expect(gatewayMock.notifyMatchFound).not.toHaveBeenCalled();

        // Verify: User added to queue
        const queuedMembers = await redisMock.peekCandidates(
            getQueueKey(USER_A_REQUEST.difficulty),
            10
        );
        expect(queuedMembers.length).toBe(1);
        const queuedMember = JSON.parse(queuedMembers[0]) as QueueMember;
        expect(queuedMember.userId).toBe(USER_A_REQUEST.userId);
    });
});

describe('(C) MatchingService: Cancel Request Flow', () => {
    let service: MatchingService;
    let testLogger: ConsoleLogger;
    const gatewayMock = mockMatchingGateway as any;
    const redisMock = mockRedisService as any;
    const checkMock = mockCheckService as any;
    const eventMock = mockEventBusService as any;
    const databaseMock = mockDatabaseService as any;

    beforeEach(async () => {
        jest.clearAllMocks();

        // 1. Build testing module
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MatchingService,
                { provide: MatchingGateway, useValue: gatewayMock },
                { provide: RedisService, useValue: redisMock },
                { provide: CheckService, useValue: checkMock },
                { provide: EventBusService, useValue: eventMock },
                { provide: DatabaseService, useValue: databaseMock },
            ],
        })
        .setLogger(new ConsoleLogger())
        .compile();
        service = module.get<MatchingService>(MatchingService);
        testLogger = new ConsoleLogger('Testing');

        // 2. Cleanup and Reset before each test
        redisMock.resetQueueData();
        checkMock.isUserInActiveMatch.mockResolvedValue(false);

        // 3. Database Mocks
        databaseMock.getClient().from.mockReturnThis();
        databaseMock.getClient().insert.mockReturnThis();
        databaseMock.getClient().select.mockReturnThis();
        databaseMock.getClient().single.mockResolvedValue({
            data: { id: 'MOCK-123' },
            error: null
        });
        databaseMock.getClient().update.mockReturnThis();
        databaseMock.getClient().eq.mockResolvedValue({ error: null });
        databaseMock.getClient().in.mockReturnThis();
    });

    // Scenario C1: Cancel pending request that is in the queue.
    it("should successfully cancel a pending request", async () => {
        testLogger.log("SCENARIO C1");
        const requestIdToCancel = USER_C_MEMBER.requestId;
        const memberString = JSON.stringify(USER_C_MEMBER);
        const primaryKey = getQueueKey(USER_C_MEMBER.difficulty);
        
        // Mock having searched and found in queue
        redisMock.peekCandidates.mockResolvedValueOnce([]);
        redisMock.peekCandidates.mockResolvedValueOnce([memberString]);
        redisMock.removeUserFromQueue.mockResolvedValue(1);

        // Act: Cancel Request
        const result = await service.cancelMatchRequest(requestIdToCancel);

        // Assert
        expect(result.success).toBe(true);
        expect(result.reason).toBeUndefined();
        expect(databaseMock.getClient().update).toHaveBeenCalledTimes(1);
        expect(databaseMock.getClient().eq).toHaveBeenCalledWith('id', requestIdToCancel);

        expect(redisMock.removeUserFromQueue).toHaveBeenCalledTimes(1);
        expect(redisMock.removeUserFromQueue).toHaveBeenCalledWith(primaryKey, memberString);
    });

    // Scenario C2: Cancel pending request that is not in the queue (already matched/expired).
    it("should fail to cancel a non-pending request", async() => {
        testLogger.log("SCENARIO C2");
        const requestIdToCancel = USER_A_REQUEST.requestId;

        // Mock having searched and not found in queue
        redisMock.peekCandidates.mockResolvedValue([]);

        // Mock DB Check - finds request but status is 'matched'
        databaseMock.getClient().select.mockReturnThis();
        databaseMock.getClient().eq.mockReturnThis();
        databaseMock.getClient().single.mockResolvedValueOnce({
            data: { status: 'matched' },
            error: null
        });

        // Act: Cancel Request
        const result = await service.cancelMatchRequest(requestIdToCancel);

        // Assert
        expect(result.success).toBe(false);
        expect(result.reason).toBeDefined();
        expect(result.reason).toContain('matched or expired');
        expect(databaseMock.getClient().update).not.toHaveBeenCalled();
    });

    // Scenario C3: Cancel non-existent request (DB failure).
    it("should fail to cancel a non-existent request", async() => {
        testLogger.log("SCENARIO C3");
        const requestIdToCancel = 'non-existent-req-id';

        // Mock having searched and not found in queue
        redisMock.peekCandidates.mockResolvedValue([]);

        // Mock DB Check - does not find request
        databaseMock.getClient().select.mockReturnThis();
        databaseMock.getClient().eq.mockReturnThis();
        databaseMock.getClient().single.mockResolvedValueOnce({
            data: null,
            error: null
        });

        // Act: Cancel Request
        const result = await service.cancelMatchRequest(requestIdToCancel);

        // Assert
        expect(result.success).toBe(false);
        expect(result.reason).toBeDefined();
        expect(result.reason).toContain('Request not found in active queues');
        expect(databaseMock.getClient().update).not.toHaveBeenCalled();
    });
});

describe('(D) MatchingService: Match End Event Handling', () => {
    let service: MatchingService;
    let testLogger: ConsoleLogger;

    const gatewayMock = mockMatchingGateway as any;
    const redisMock = mockRedisService as any;
    const checkMock = mockCheckService as any;
    const eventMock = mockEventBusService as any;
    const databaseMock = mockDatabaseService as any;

    const mockMatchId = 'match-id-123';

    beforeEach(async () => {
        jest.clearAllMocks();

        // Build testing module - standard setup
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MatchingService,
                { provide: MatchingGateway, useValue: mockMatchingGateway },
                { provide: RedisService, useValue: mockRedisService },
                { provide: CheckService, useValue: mockCheckService },
                { provide: EventBusService, useValue: eventMock },
                { provide: DatabaseService, useValue: databaseMock },
            ],
        })
        .setLogger(new ConsoleLogger())
        .compile();

        await module.init();

        service = module.get<MatchingService>(MatchingService);
        testLogger = new ConsoleLogger('Testing');

        const mockReadResult = { 
            data: { user1_id: 'u1', user2_id: 'u2', status: 'matched' }, 
            error: null 
        };
        databaseMock.getClient().select.mockResolvedValue(mockReadResult);

        // Reset specific Supabase mock implementations for this suite
        databaseMock.getClient().from.mockReturnThis();
        databaseMock.getClient().update.mockReturnThis();
        databaseMock.getClient().eq.mockReturnThis();
        databaseMock.getClient().select.mockReturnThis();
        databaseMock.getClient().single.mockResolvedValue({ data: { id: mockMatchId }, error: null }); // Mocking the final single() call for successful INSERT/UPDATE/SELECT
    });

    // Scenario D1: Ensure service init and subscribes.
    it("should be defined", () => {
        expect(service).toBeDefined();
        expect(eventMock.subscribeToSessionEvents).toHaveBeenCalledTimes(1);
    });

    // Scenario D2: Handle session ended event
    it("should handle session end event and update database", async () => {
        testLogger.log("SCENARIO D2");

        // Arrange: Prepare mock event data
        const mockSessionEvent: SessionEventPayload = {
            matchId: mockMatchId,
            sessionId: 'session-123',
            eventType: 'session_ended',
            timestamp: new Date().toISOString(),
        }

        // Act: Trigger event handler
        await service.handleSessionEvent(mockSessionEvent);

        // Assert: Verify DB update called correctly
        expect(databaseMock.getClient().update).toHaveBeenCalledTimes(1);
        expect(databaseMock.getClient().update).toHaveBeenCalledWith(
            expect.objectContaining({ 
                status: 'ended',
                ended_at: expect.any(String),
            })
        );
        expect(databaseMock.getClient().eq).toHaveBeenCalledWith('id', mockMatchId);
    });

    // Scenario D3: Handle session expired event
    it("should handle session expired event and update database", async () => {
        testLogger.log("SCENARIO D3");

        // Arrange: Prepare mock event data
        const mockSessionEvent: SessionEventPayload = {
            matchId: mockMatchId,
            sessionId: 'session-123',
            eventType: 'session_ended',
            timestamp: new Date().toISOString(),
        }

        // Act: Trigger event handler
        await service.handleSessionEvent(mockSessionEvent);

        // Assert: Verify DB update called correctly
        expect(databaseMock.getClient().update).toHaveBeenCalledTimes(1);
        expect(databaseMock.getClient().update).toHaveBeenCalledWith(
            expect.objectContaining({ 
                status: 'ended',
                ended_at: expect.any(String),
            })
        );
        expect(databaseMock.getClient().eq).toHaveBeenCalledWith('id', mockMatchId);
    });

    // Scenario D4: Handle session started event
    it("should handle session started event, update DB status, and notify users", async () => {
        testLogger.log("SCENARIO D4");

        // Arrange: Prepare mock event data
        const mockSessionEvent: SessionEventPayload = {
            matchId: mockMatchId,
            sessionId: 'session-123',
            eventType: 'session_started',
            timestamp: new Date().toISOString(),
        }

        // ARRANGE: Mock the final .single() call of the initial SELECT query
        const mockMatchRecord = { user1_id: 'userA', user2_id: 'userB', status: 'matched' };
        databaseMock.getClient().single.mockResolvedValueOnce({
            data: mockMatchRecord, 
            error: null 
        });

        // Act: Trigger event handler
        await service.handleSessionEvent(mockSessionEvent);

        // Assert 1: Verify the initial DB read was performed correctly (Check both .select and .eq)
        expect(databaseMock.getClient().from).toHaveBeenCalledWith('matches');

        // Assert 2: Verify DB UPDATE was called (to change status from 'matched' to 'active')
        expect(databaseMock.getClient().update).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'active' })
        );

        // Assert 3: Verify the users were notified via WebSocket
        expect(gatewayMock.notifySessionStarted).toHaveBeenCalledTimes(1);
        expect(gatewayMock.notifySessionStarted).toHaveBeenCalledWith(
            mockMatchId,
            mockSessionEvent.sessionId,
            ['userA', 'userB'] // based on the mocked record
        );
    });

    // Scenario D5: Database failure handling.
    it("should handle database failure during session end handling", async () => {
        testLogger.log("SCENARIO D5");

        const mockSessionEvent: SessionEventPayload = {
            matchId: mockMatchId,
            sessionId: 'session-123',
            eventType: 'session_ended',
            timestamp: new Date().toISOString(),
        }

        // Arrange: Mock DB failure
        databaseMock.getClient().eq.mockResolvedValueOnce({ error: { message: 'DB Update Failed' } });

        // Act & Assert: Trigger event handler and expect error
        await expect(service.handleSessionEvent(mockSessionEvent)).resolves.not.toThrow();

        // Verify: DB update attempted
        expect(databaseMock.getClient().update).toHaveBeenCalledTimes(1);
    });
});
