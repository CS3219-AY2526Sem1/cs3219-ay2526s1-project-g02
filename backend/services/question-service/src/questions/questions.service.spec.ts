import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from '@supabase/supabase-js';
import { QuestionsService } from './questions.service';
import { EventBusService } from '../event-bus/event-bus.service';
import { MatchFoundPayload } from '@noclue/common';

// Mock the Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('QuestionsService - Unit Tests', () => {
  let service: QuestionsService;
  let mockSupabaseClient: any;
  let eventBusServiceMock: {
    registerMatchFoundHandler: jest.Mock;
    publishQuestionAssigned: jest.Mock;
  };

  const mockQuestion = {
    id: '1',
    title: 'Two Sum',
    description: 'Find two numbers',
    difficulty: 'Easy',
    category: ['Array', 'Hash Table'],
    examples: 'Example 1...',
    constraints: '2 <= nums.length',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    // Create mock Supabase client
    mockSupabaseClient = {
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

    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    eventBusServiceMock = {
      registerMatchFoundHandler: jest.fn(),
      publishQuestionAssigned: jest.fn(),
    };

    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_KEY = 'test-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        {
          provide: EventBusService,
          useValue: eventBusServiceMock,
        },
      ],
    }).compile();

    await module.init();

    service = module.get<QuestionsService>(QuestionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(eventBusServiceMock.registerMatchFoundHandler).toHaveBeenCalledTimes(1);
  });

  describe('handleMatchFound', () => {
    it('publishes question assignment when a suitable question is found', async () => {
      const matchHandler = eventBusServiceMock.registerMatchFoundHandler.mock.calls[0][0] as (
        payload: MatchFoundPayload,
      ) => Promise<void>;

      const matchPayload: MatchFoundPayload = {
        matchId: 'match-123',
        user1Id: 'user-a',
        user2Id: 'user-b',
        difficulty: 'easy',
        language: 'javascript',
        commonTopics: ['Array'],
      };

      const chosenQuestion = {
        id: 'q1',
        title: 'Two Sum',
        description: 'Find two numbers',
        difficulty: 'Easy',
        category: ['Array'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const findRandomQuestionsSpy = jest
        .spyOn(service, 'findRandomQuestions')
        .mockResolvedValueOnce([chosenQuestion])
        .mockResolvedValue([]);

      await matchHandler(matchPayload);

      expect(findRandomQuestionsSpy).toHaveBeenCalledWith(1, 'Easy', ['Array']);
      expect(eventBusServiceMock.publishQuestionAssigned).toHaveBeenCalledWith({
        matchId: 'match-123',
        questionId: 'q1',
        questionTitle: 'Two Sum',
        questionDescription: 'Find two numbers',
        difficulty: 'easy',
        topics: ['Array'],
      });
    });
  });

  describe('findAll', () => {
    it('should return array of questions', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: [mockQuestion],
        error: null,
      });

      const result = await service.findAll();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('questions');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Two Sum');
    });

    it('should throw error on database failure', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(service.findAll()).rejects.toThrow('Failed to fetch questions');
    });
  });

  describe('findOne', () => {
    it('should return a single question by ID', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockQuestion,
        error: null,
      });

      const result = await service.findOne('1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('questions');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', '1');
      expect(result?.title).toBe('Two Sum');
    });

    it('should return null when question not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await service.findOne('999');
      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'DB error', code: 'OTHER' },
      });

      await expect(service.findOne('1')).rejects.toThrow('Failed to fetch question');
    });
  });

  describe('findByDifficulty', () => {
    it('should filter by difficulty', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: [mockQuestion],
        error: null,
      });

      const result = await service.findByDifficulty('Easy');

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('difficulty', 'Easy');
      expect(result[0].difficulty).toBe('Easy');
    });

    it('should return empty array when no matches', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.findByDifficulty('Hard');
      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(service.findByDifficulty('Easy')).rejects.toThrow('Failed to fetch questions');
    });
  });

  describe('findByCategory', () => {
    it('should filter by category', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: [mockQuestion],
        error: null,
      });

      const result = await service.findByCategory('Array');

      expect(mockSupabaseClient.contains).toHaveBeenCalledWith('category', ['Array']);
      expect(result[0].category).toContain('Array');
    });

    it('should return empty array when no matches', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.findByCategory('NonExistent');
      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(service.findByCategory('Array')).rejects.toThrow('Failed to fetch questions');
    });
  });

  describe('findRandomQuestions (FR17)', () => {
    it('should return random questions', async () => {
      // Mock the final result after all chaining
      const mockChain = {
        ...mockSupabaseClient,
        eq: jest.fn().mockReturnThis(),
        overlaps: jest.fn().mockReturnThis(),
      };
      
      mockSupabaseClient.from.mockReturnValue(mockChain);
      mockSupabaseClient.select.mockResolvedValue({
        data: [mockQuestion, mockQuestion],
        error: null,
      });

      const result = await service.findRandomQuestions(2);

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should apply difficulty filter', async () => {
      // Create a proper chain mock
      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        overlaps: jest.fn().mockReturnThis(),
      };
      
      // Mock select to return a promise that resolves with data
      mockSupabaseClient.select.mockReturnValue(mockChain);
      mockChain.eq.mockResolvedValue({
        data: [mockQuestion],
        error: null,
      });

      const result = await service.findRandomQuestions(2, 'Easy');

      expect(mockChain.eq).toHaveBeenCalledWith('difficulty', 'Easy');
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should apply category filter', async () => {
      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        overlaps: jest.fn().mockReturnThis(),
      };
      
      mockSupabaseClient.select.mockReturnValue(mockChain);
      mockChain.overlaps.mockResolvedValue({
        data: [mockQuestion],
        error: null,
      });

      const result = await service.findRandomQuestions(2, undefined, ['Array']);

      expect(mockChain.overlaps).toHaveBeenCalledWith('category', ['Array']);
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should apply both filters', async () => {
      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        overlaps: jest.fn().mockReturnThis(),
      };
      
      mockSupabaseClient.select.mockReturnValue(mockChain);
      mockChain.overlaps.mockResolvedValue({
        data: [mockQuestion],
        error: null,
      });

      const result = await service.findRandomQuestions(2, 'Easy', ['Array']);

      expect(mockChain.eq).toHaveBeenCalledWith('difficulty', 'Easy');
      expect(mockChain.overlaps).toHaveBeenCalledWith('category', ['Array']);
      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getTestCasesForQuestion (FR18)', () => {
    it('should return test cases', async () => {
      const mockTestCase = {
        id: 'tc1',
        question_id: '1',
        input: { nums: [2, 7] },
        expected_output: { result: [0, 1] },
        is_hidden: false,
        order_index: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      mockSupabaseClient.order.mockResolvedValue({
        data: [mockTestCase],
        error: null,
      });

      const result = await service.getTestCasesForQuestion('1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('test_cases');
      expect(result).toHaveLength(1);
      expect(result[0].input).toEqual({ nums: [2, 7] });
    });

    it('should return empty array when no test cases exist', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.getTestCasesForQuestion('999');
      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(service.getTestCasesForQuestion('1')).rejects.toThrow('Failed to retrieve test cases');
    });
  });

  describe('getTestCasesForQuestions (FR18.1.3)', () => {
    it('should return test cases grouped by question ID', async () => {
      const mockTestCases = [
        {
          id: 'tc1',
          question_id: '1',
          input: { nums: [2, 7] },
          expected_output: { result: [0, 1] },
          is_hidden: false,
          order_index: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'tc2',
          question_id: '1',
          input: { nums: [3, 2, 4] },
          expected_output: { result: [1, 2] },
          is_hidden: false,
          order_index: 2,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'tc3',
          question_id: '2',
          input: { s: '()' },
          expected_output: { result: true },
          is_hidden: false,
          order_index: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockSupabaseClient.order.mockResolvedValue({
        data: mockTestCases,
        error: null,
      });

      const result = await service.getTestCasesForQuestions(['1', '2']);

      expect(mockSupabaseClient.in).toHaveBeenCalledWith('question_id', ['1', '2']);
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get('1')).toHaveLength(2);
      expect(result.get('2')).toHaveLength(1);
    });

    it('should return empty map for empty question IDs', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.getTestCasesForQuestions([]);
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should throw error on database failure', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(service.getTestCasesForQuestions(['1'])).rejects.toThrow('Failed to retrieve test cases for questions');
    });
  });

  describe('create', () => {
    it('should create question', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockQuestion,
        error: null,
      });

      const input = {
        title: 'Test',
        description: 'Test desc',
        difficulty: 'Easy',
        category: ['Array'],
      };

      const result = await service.create(input);

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([input]);
      expect(result.title).toBe('Two Sum');
    });

    it('should throw error on creation failure', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Creation failed' },
      });

      await expect(service.create({
        title: 'Test',
        description: 'Test',
        difficulty: 'Easy',
        category: ['Test'],
      })).rejects.toThrow('Failed to create question');
    });
  });

  describe('update', () => {
    it('should update question', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { ...mockQuestion, title: 'Updated' },
        error: null,
      });

      const result = await service.update('1', { title: 'Updated' });

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({ title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('should throw error on update failure', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(service.update('1', { title: 'Updated' })).rejects.toThrow('Failed to update question');
    });
  });

  describe('delete', () => {
    it('should delete question', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        error: null,
      });

      const result = await service.delete('1');

      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should throw error on deletion failure', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        error: { message: 'Deletion failed' },
      });

      await expect(service.delete('1')).rejects.toThrow('Failed to delete question');
    });
  });
});
