import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { QuestionsService } from '../questions/questions.service';
import { EventBusService } from '../event-bus/event-bus.service';
import { MatchFoundPayload, TOPICS, SUBSCRIPTIONS } from '@noclue/common';

const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  contains: jest.fn().mockReturnThis(),
  overlaps: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

jest.mock('@noclue/common', () => {
  const actual = jest.requireActual('@noclue/common');

  const state = {
    published: [] as Array<{ topic: string; payload: any }>,
    subscriptions: new Map<string, (data: any) => Promise<void>>(),
  };

  class InMemoryPubSubService {
    constructor() {
      state.subscriptions.clear();
      state.published.length = 0;
    }

    async subscribe(subscriptionName: string, handler: (data: any) => Promise<void>): Promise<void> {
      state.subscriptions.set(subscriptionName, handler);
    }

    async publish(topicName: string, payload: any): Promise<string> {
      state.published.push({ topic: topicName, payload });
      return `message-${state.published.length}`;
    }

    async close(): Promise<void> {}
  }

  return {
    ...actual,
    PubSubService: InMemoryPubSubService,
    __pubsubState: state,
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { __pubsubState } = require('@noclue/common') as any;

describe('Question Service Pub/Sub integration', () => {
  let moduleRef: TestingModule;
  let questionsService: QuestionsService;

  beforeAll(async () => {
    process.env.GCP_PROJECT_ID = 'test-project';

    moduleRef = await Test.createTestingModule({
      providers: [ConfigService, EventBusService, QuestionsService],
    }).compile();

    await moduleRef.init();
    questionsService = moduleRef.get(QuestionsService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
    __pubsubState.published.length = 0;
  });

  describe('Match Found Event Handling', () => {
    it('prepares for manual question selection when a match is received', async () => {
      const matchPayload: MatchFoundPayload = {
        matchId: 'integration-match-id',
        user1Id: 'user-1',
        user2Id: 'user-2',
        difficulty: 'easy',
        language: 'typescript',
        commonTopics: ['arrays'],
      };

      // Mock the Supabase delete operation
      mockSupabaseClient.delete.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({ data: null, error: null }),
      });

      const handler = __pubsubState.subscriptions.get(SUBSCRIPTIONS.MATCHING_QUEUE_SUB);
      expect(handler).toBeDefined();

      await handler?.(matchPayload);

      // The service should clear any existing selections for this match
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('question_selections');
      expect(mockSupabaseClient.delete).toHaveBeenCalled();

      // No messages should be published - users will manually select questions
      expect(__pubsubState.published).toHaveLength(0);
    });

    it('handles match with difficulty and topics correctly', async () => {
      const matchPayload: MatchFoundPayload = {
        matchId: 'match-with-filters',
        user1Id: 'user-a',
        user2Id: 'user-b',
        difficulty: 'medium',
        language: 'javascript',
        commonTopics: ['dynamic-programming', 'arrays'],
      };

      mockSupabaseClient.delete.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({ data: null, error: null }),
      });

      const handler = __pubsubState.subscriptions.get(SUBSCRIPTIONS.MATCHING_QUEUE_SUB);
      await handler?.(matchPayload);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('question_selections');
      expect(__pubsubState.published).toHaveLength(0);
    });

    it('handles multiple sequential match events', async () => {
      const match1: MatchFoundPayload = {
        matchId: 'match-1',
        user1Id: 'user-a',
        user2Id: 'user-b',
        difficulty: 'easy',
        language: 'python',
        commonTopics: ['strings'],
      };

      const match2: MatchFoundPayload = {
        matchId: 'match-2',
        user1Id: 'user-c',
        user2Id: 'user-d',
        difficulty: 'hard',
        language: 'java',
        commonTopics: ['graphs'],
      };

      mockSupabaseClient.delete
        .mockReturnValueOnce({
          eq: jest.fn().mockResolvedValueOnce({ data: null, error: null }),
        })
        .mockReturnValueOnce({
          eq: jest.fn().mockResolvedValueOnce({ data: null, error: null }),
        });

      const handler = __pubsubState.subscriptions.get(SUBSCRIPTIONS.MATCHING_QUEUE_SUB);

      await handler?.(match1);
      await handler?.(match2);

      expect(mockSupabaseClient.delete).toHaveBeenCalledTimes(2);
      expect(__pubsubState.published).toHaveLength(0);
    });

    it('handles database errors gracefully', async () => {
      const matchPayload: MatchFoundPayload = {
        matchId: 'error-match',
        user1Id: 'user-1',
        user2Id: 'user-2',
        difficulty: 'easy',
        language: 'typescript',
        commonTopics: ['arrays'],
      };

      mockSupabaseClient.delete.mockReturnValueOnce({
        eq: jest.fn().mockRejectedValueOnce(new Error('Database connection failed')),
      });

      const handler = __pubsubState.subscriptions.get(SUBSCRIPTIONS.MATCHING_QUEUE_SUB);

      // Errors are caught and logged, handler should not throw
      await handler?.(matchPayload);
      
      // Handler was called but error was handled internally
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
    });
  });

  describe('Question Selection Flow', () => {
    // These tests are covered by unit tests in questions.service.spec.ts
    // Integration tests focus on pub/sub event flow

    it('service has submitQuestionSelection method', () => {
      expect(typeof questionsService.submitQuestionSelection).toBe('function');
    });

    it('service has getQuestionSelectionStatus method', () => {
      expect(typeof questionsService.getQuestionSelectionStatus).toBe('function');
    });
  });

  describe('Event Bus Registration', () => {
    it('registers match-found handler on service initialization', () => {
      const handler = __pubsubState.subscriptions.get(SUBSCRIPTIONS.MATCHING_QUEUE_SUB);
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');
    });

    it('can handle multiple registrations without conflict', async () => {
      // Create a second instance
      const module2 = await Test.createTestingModule({
        providers: [ConfigService, EventBusService, QuestionsService],
      }).compile();

      await module2.init();
      const service2 = module2.get(QuestionsService);

      expect(service2).toBeDefined();
      const handler = __pubsubState.subscriptions.get(SUBSCRIPTIONS.MATCHING_QUEUE_SUB);
      expect(handler).toBeDefined();

      await module2.close();
    });
  });
});
