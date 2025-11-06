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
});
