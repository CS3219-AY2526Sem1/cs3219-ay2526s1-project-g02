import { Difficulty, QueueMember } from "src/utils/types";

// Internal map to hold state of 3 queues (easy, medium, hard)
const mockQueueData: Map<string, string[]> = new Map();

const getMockQueueKey = (difficulty: Difficulty): string => {
    return `matching:queue:${difficulty}`;
};

export const mockMatchingGateway = {
    notifyMatchFound: jest.fn(),
};

export const mockRedisService = {
    // --------- Setup/Teardown Helpers ---------
    
    // clear all queue data
    resetQueueData: () => {
        mockQueueData.clear();
    },

    // manually set queue
    setQueueState: (difficulty: Difficulty, members: QueueMember[]) => {
        const key = getMockQueueKey(difficulty);
        mockQueueData.set(key, members.map(m => JSON.stringify(m)));
    },

    // --------- Mocked API for Redis ---------
    addUserToQueue: jest.fn(async (key: string, score: number, member: string) => {
        const members = mockQueueData.get(key) || [];
        members.push(member);
        mockQueueData.set(key, members);
    }),

    peekCandidates: jest.fn(async (key: string, count: number) => {
        return (mockQueueData.get(key) || []).slice(0, count);
    }),

    removeUserFromQueue: jest.fn(async (key: string, member: string) => {
        const members = mockQueueData.get(key) || [];
        const initialLength = members.length;

        const newMembers = members.filter(m => m !== member);
        const finalLength = newMembers.length;
        mockQueueData.set(key, newMembers);

        return initialLength - finalLength;
    }),

    removeExpiredMembers: jest.fn(async (key: string, maxScore: number) => {
        return 0;
    })
}