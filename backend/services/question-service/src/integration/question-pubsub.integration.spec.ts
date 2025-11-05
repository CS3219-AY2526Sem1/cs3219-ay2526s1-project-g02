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

  it('publishes a question-assigned message with test cases when a match is received', async () => {
    const matchPayload: MatchFoundPayload = {
      matchId: 'integration-match-id',
      user1Id: 'user-1',
      user2Id: 'user-2',
      difficulty: 'easy',
      language: 'typescript',
      commonTopics: ['arrays'],
    };

    const chosenQuestion = {
      id: 'question-1',
      title: 'Two Sum',
      description: 'Find two numbers that add up to target.',
      difficulty: 'Easy',
      category: ['Array'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const testCase = {
      id: 'tc-1',
      questionId: 'question-1',
      input: { nums: [2, 7, 11, 15], target: 9 },
      expectedOutput: { indexes: [0, 1] },
      isHidden: false,
      orderIndex: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    jest.spyOn(questionsService, 'findRandomQuestions').mockResolvedValueOnce([chosenQuestion] as any);
    jest.spyOn(questionsService, 'getTestCasesForQuestion').mockResolvedValueOnce([testCase] as any);

    const handler = __pubsubState.subscriptions.get(SUBSCRIPTIONS.MATCHING_QUEUE_SUB);
    expect(handler).toBeDefined();

    await handler?.(matchPayload);

    expect(__pubsubState.published).toHaveLength(1);
    const published = __pubsubState.published[0];
    expect(published.topic).toBe(TOPICS.QUESTION_QUEUE);
    expect(published.payload).toMatchObject({
      matchId: matchPayload.matchId,
      questionId: chosenQuestion.id,
      questionTitle: chosenQuestion.title,
      difficulty: matchPayload.difficulty,
      topics: chosenQuestion.category,
    });
    expect(published.payload.testCases).toEqual([
      expect.objectContaining({
        id: 'tc-1',
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        isHidden: false,
        orderIndex: 1,
      }),
    ]);
  });
});
