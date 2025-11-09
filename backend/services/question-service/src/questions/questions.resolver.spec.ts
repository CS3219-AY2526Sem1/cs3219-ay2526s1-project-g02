import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsResolver } from './questions.resolver';
import { QuestionsService } from './questions.service';

describe('QuestionsResolver', () => {
  let resolver: QuestionsResolver;
  let service: QuestionsService;

  const mockQuestion = {
    id: '1',
    title: 'Two Sum',
    description: 'Find two numbers that add up to target',
    difficulty: 'Easy',
    category: ['Array', 'Hash Table'],
    examples: 'Example 1: Input: [2,7,11,15], target = 9, Output: [0,1]',
    constraints: '2 <= nums.length <= 10^4',
    testCases: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockTestCase = {
    id: 'tc1',
    questionId: '1',
    input: { nums: [2, 7], target: 9 },
    expectedOutput: { result: [0, 1] },
    isHidden: false,
    orderIndex: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockQuestionAttempt = {
    id: 'attempt-1',
    userId: 'user-1',
    questionId: 'question-1',
    matchId: 'match-1',
    attemptedAt: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    question: mockQuestion,
  };

  const mockSuggestedSolution = {
    id: 'sol-1',
    questionId: 'question-1',
    language: 'javascript',
    solutionCode: 'function twoSum(nums, target) { /* ... */ }',
    explanation: 'Use a hash map to store complements',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByDifficulty: jest.fn(),
    findByCategory: jest.fn(),
    getQuestionsForMatchSelection: jest.fn(),
    findRandomQuestions: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getTestCasesForQuestion: jest.fn(),
    submitQuestionSelection: jest.fn(),
    getQuestionSelectionStatus: jest.fn(),
    getQuestionAttemptsByUser: jest.fn(),
    getSuggestedSolutionsForQuestion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsResolver,
        {
          provide: QuestionsService,
          useValue: mockService,
        },
      ],
    }).compile();

    resolver = module.get<QuestionsResolver>(QuestionsResolver);
    service = module.get<QuestionsService>(QuestionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Query: questions', () => {
    it('should return all questions', async () => {
      mockService.findAll.mockResolvedValue([mockQuestion]);

      const result = await resolver.questions();

      expect(result).toEqual([mockQuestion]);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should handle empty results', async () => {
      mockService.findAll.mockResolvedValue([]);

      const result = await resolver.questions();

      expect(result).toEqual([]);
    });

    it('should propagate service errors', async () => {
      mockService.findAll.mockRejectedValue(new Error('Database error'));

      await expect(resolver.questions()).rejects.toThrow('Database error');
    });
  });

  describe('Query: question', () => {
    it('should return a single question by ID', async () => {
      mockService.findOne.mockResolvedValue(mockQuestion);

      const result = await resolver.question('1');

      expect(result).toEqual(mockQuestion);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });

    it('should return null when question not found', async () => {
      mockService.findOne.mockResolvedValue(null);

      const result = await resolver.question('999');

      expect(result).toBeNull();
    });

    it('should propagate service errors', async () => {
      mockService.findOne.mockRejectedValue(new Error('Database error'));

      await expect(resolver.question('1')).rejects.toThrow('Database error');
    });
  });

  describe('Query: questionsByDifficulty', () => {
    it('should return questions filtered by difficulty', async () => {
      mockService.findByDifficulty.mockResolvedValue([mockQuestion]);

      const result = await resolver.questionsByDifficulty('Easy');

      expect(result).toEqual([mockQuestion]);
      expect(service.findByDifficulty).toHaveBeenCalledWith('Easy');
    });

    it('should handle empty results', async () => {
      mockService.findByDifficulty.mockResolvedValue([]);

      const result = await resolver.questionsByDifficulty('Hard');

      expect(result).toEqual([]);
    });
  });

  describe('Query: questionsByCategory', () => {
    it('should return questions filtered by category', async () => {
      mockService.findByCategory.mockResolvedValue([mockQuestion]);

      const result = await resolver.questionsByCategory('Array');

      expect(result).toEqual([mockQuestion]);
      expect(service.findByCategory).toHaveBeenCalledWith('Array');
    });

    it('should handle empty results', async () => {
      mockService.findByCategory.mockResolvedValue([]);

      const result = await resolver.questionsByCategory('NonExistent');

      expect(result).toEqual([]);
    });
  });

  describe('Query: questionsForMatchSelection', () => {
    it('should return questions for a match', async () => {
      mockService.getQuestionsForMatchSelection.mockResolvedValue([mockQuestion]);

      const result = await resolver.questionsForMatchSelection('match-123');

      expect(result).toEqual([mockQuestion]);
      expect(service.getQuestionsForMatchSelection).toHaveBeenCalledWith('match-123');
    });

    it('should handle no matching questions', async () => {
      mockService.getQuestionsForMatchSelection.mockResolvedValue([]);

      const result = await resolver.questionsForMatchSelection('match-999');

      expect(result).toEqual([]);
    });
  });

  describe('Query: allocateQuestionsForSession', () => {
    it('should allocate random questions without filters', async () => {
      mockService.findRandomQuestions.mockResolvedValue([mockQuestion]);

      const result = await resolver.allocateQuestionsForSession(2);

      expect(result).toEqual([mockQuestion]);
      expect(service.findRandomQuestions).toHaveBeenCalledWith(2, undefined, undefined);
    });

    it('should allocate random questions with difficulty filter', async () => {
      mockService.findRandomQuestions.mockResolvedValue([mockQuestion]);

      const result = await resolver.allocateQuestionsForSession(2, 'Easy');

      expect(result).toEqual([mockQuestion]);
      expect(service.findRandomQuestions).toHaveBeenCalledWith(2, 'Easy', undefined);
    });

    it('should allocate random questions with category filter', async () => {
      mockService.findRandomQuestions.mockResolvedValue([mockQuestion]);

      const result = await resolver.allocateQuestionsForSession(2, undefined, ['Array']);

      expect(result).toEqual([mockQuestion]);
      expect(service.findRandomQuestions).toHaveBeenCalledWith(2, undefined, ['Array']);
    });

    it('should allocate random questions with both filters', async () => {
      mockService.findRandomQuestions.mockResolvedValue([mockQuestion]);

      const result = await resolver.allocateQuestionsForSession(2, 'Easy', ['Array', 'Hash Table']);

      expect(result).toEqual([mockQuestion]);
      expect(service.findRandomQuestions).toHaveBeenCalledWith(2, 'Easy', ['Array', 'Hash Table']);
    });
  });

  describe('Query: testCasesForQuestion', () => {
    it('should return test cases for a question', async () => {
      mockService.getTestCasesForQuestion.mockResolvedValue([mockTestCase]);

      const result = await resolver.testCasesForQuestion('1');

      expect(result).toEqual([mockTestCase]);
      expect(service.getTestCasesForQuestion).toHaveBeenCalledWith('1');
    });

    it('should handle questions with no test cases', async () => {
      mockService.getTestCasesForQuestion.mockResolvedValue([]);

      const result = await resolver.testCasesForQuestion('999');

      expect(result).toEqual([]);
    });
  });

  describe('Query: questionAttemptsByUser', () => {
    it('should return question attempts for a user', async () => {
      mockService.getQuestionAttemptsByUser.mockResolvedValue([mockQuestionAttempt]);

      const result = await resolver.questionAttemptsByUser('user-1');

      expect(result).toEqual([mockQuestionAttempt]);
      expect(service.getQuestionAttemptsByUser).toHaveBeenCalledWith('user-1');
    });

    it('should handle users with no attempts', async () => {
      mockService.getQuestionAttemptsByUser.mockResolvedValue([]);

      const result = await resolver.questionAttemptsByUser('user-999');

      expect(result).toEqual([]);
    });
  });

  describe('Query: suggestedSolutionsForQuestion', () => {
    it('should return suggested solutions for a question', async () => {
      mockService.getSuggestedSolutionsForQuestion.mockResolvedValue([mockSuggestedSolution]);

      const result = await resolver.suggestedSolutionsForQuestion('question-1');

      expect(result).toEqual([mockSuggestedSolution]);
      expect(service.getSuggestedSolutionsForQuestion).toHaveBeenCalledWith('question-1');
    });

    it('should handle questions with no suggested solutions', async () => {
      mockService.getSuggestedSolutionsForQuestion.mockResolvedValue([]);

      const result = await resolver.suggestedSolutionsForQuestion('question-999');

      expect(result).toEqual([]);
    });
  });

  describe('Mutation: createQuestion', () => {
    it('should create a new question', async () => {
      const input = {
        title: 'New Question',
        description: 'Description',
        difficulty: 'Medium',
        category: ['Array'],
      };

      mockService.create.mockResolvedValue({ ...mockQuestion, ...input });

      const result = await resolver.createQuestion(input);

      expect(result.title).toBe('New Question');
      expect(service.create).toHaveBeenCalledWith(input);
    });

    it('should propagate validation errors', async () => {
      const input = {
        title: '',
        description: 'Description',
        difficulty: 'Medium',
        category: ['Array'],
      };

      mockService.create.mockRejectedValue(new Error('Title cannot be empty'));

      await expect(resolver.createQuestion(input)).rejects.toThrow('Title cannot be empty');
    });
  });

  describe('Mutation: updateQuestion', () => {
    it('should update an existing question', async () => {
      const input = {
        title: 'Updated Title',
      };

      mockService.update.mockResolvedValue({ ...mockQuestion, title: 'Updated Title' });

      const result = await resolver.updateQuestion('1', input);

      expect(result.title).toBe('Updated Title');
      expect(service.update).toHaveBeenCalledWith('1', input);
    });

    it('should handle partial updates', async () => {
      const input = {
        difficulty: 'Hard',
      };

      mockService.update.mockResolvedValue({ ...mockQuestion, difficulty: 'Hard' });

      const result = await resolver.updateQuestion('1', input);

      expect(result.difficulty).toBe('Hard');
      expect(service.update).toHaveBeenCalledWith('1', input);
    });

    it('should propagate not found errors', async () => {
      mockService.update.mockRejectedValue(new Error('Question not found'));

      await expect(resolver.updateQuestion('999', { title: 'Test' })).rejects.toThrow(
        'Question not found',
      );
    });
  });

  describe('Mutation: deleteQuestion', () => {
    it('should delete a question', async () => {
      mockService.delete.mockResolvedValue(true);

      const result = await resolver.deleteQuestion('1');

      expect(result).toBe(true);
      expect(service.delete).toHaveBeenCalledWith('1');
    });

    it('should propagate not found errors', async () => {
      mockService.delete.mockRejectedValue(new Error('Question not found'));

      await expect(resolver.deleteQuestion('999')).rejects.toThrow('Question not found');
    });
  });

  describe('Mutation: submitQuestionSelection', () => {
    it('should submit a question selection and return PENDING status', async () => {
      const input = {
        matchId: 'match-1',
        userId: 'user-1',
        questionId: 'question-1',
      };

      const serviceResult = {
        status: 'PENDING' as const,
        selections: [
          {
            userId: 'user-1',
            questionId: 'question-1',
            isWinner: null,
            submittedAt: '2024-01-01T00:00:00Z',
            finalizedAt: null,
          },
        ],
        pendingUserIds: ['user-2'],
        finalQuestion: null,
      };

      mockService.submitQuestionSelection.mockResolvedValue(serviceResult);

      const result = await resolver.submitQuestionSelection(input);

      expect(result.status).toBe('PENDING');
      expect(result.selections).toHaveLength(1);
      expect(result.pendingUserIds).toEqual(['user-2']);
      expect(result.finalQuestion).toBeNull();
      expect(service.submitQuestionSelection).toHaveBeenCalledWith(input);
    });

    it('should submit a question selection and return COMPLETE status', async () => {
      const input = {
        matchId: 'match-1',
        userId: 'user-2',
        questionId: 'question-2',
      };

      const serviceResult = {
        status: 'COMPLETE' as const,
        selections: [
          {
            userId: 'user-1',
            questionId: 'question-1',
            isWinner: false,
            submittedAt: '2024-01-01T00:00:00Z',
            finalizedAt: '2024-01-01T00:01:00Z',
          },
          {
            userId: 'user-2',
            questionId: 'question-2',
            isWinner: true,
            submittedAt: '2024-01-01T00:00:30Z',
            finalizedAt: '2024-01-01T00:01:00Z',
          },
        ],
        pendingUserIds: [],
        finalQuestion: { ...mockQuestion, id: 'question-2' },
      };

      mockService.submitQuestionSelection.mockResolvedValue(serviceResult);

      const result = await resolver.submitQuestionSelection(input);

      expect(result.status).toBe('COMPLETE');
      expect(result.selections).toHaveLength(2);
      expect(result.pendingUserIds).toEqual([]);
      expect(result.finalQuestion).toBeDefined();
      expect(result.finalQuestion?.id).toBe('question-2');
    });

    it('should propagate validation errors', async () => {
      const input = {
        matchId: 'invalid-match',
        userId: 'user-1',
        questionId: 'question-1',
      };

      mockService.submitQuestionSelection.mockRejectedValue(
        new Error('Match invalid-match not found or inactive'),
      );

      await expect(resolver.submitQuestionSelection(input)).rejects.toThrow(
        'Match invalid-match not found or inactive',
      );
    });
  });

  describe('Query: questionSelectionStatus', () => {
    it('should return PENDING status when waiting for selections', async () => {
      const serviceResult = {
        status: 'PENDING' as const,
        selections: [
          {
            userId: 'user-1',
            questionId: 'question-1',
            isWinner: null,
            submittedAt: '2024-01-01T00:00:00Z',
            finalizedAt: null,
          },
        ],
        pendingUserIds: ['user-2'],
        finalQuestion: null,
      };

      mockService.getQuestionSelectionStatus.mockResolvedValue(serviceResult);

      const result = await resolver.questionSelectionStatus('match-1');

      expect(result.status).toBe('PENDING');
      expect(result.selections).toHaveLength(1);
      expect(result.pendingUserIds).toEqual(['user-2']);
      expect(result.finalQuestion).toBeNull();
    });

    it('should return COMPLETE status when both users have selected', async () => {
      const serviceResult = {
        status: 'COMPLETE' as const,
        selections: [
          {
            userId: 'user-1',
            questionId: 'question-1',
            isWinner: true,
            submittedAt: '2024-01-01T00:00:00Z',
            finalizedAt: '2024-01-01T00:01:00Z',
          },
          {
            userId: 'user-2',
            questionId: 'question-2',
            isWinner: false,
            submittedAt: '2024-01-01T00:00:30Z',
            finalizedAt: '2024-01-01T00:01:00Z',
          },
        ],
        pendingUserIds: [],
        finalQuestion: mockQuestion,
      };

      mockService.getQuestionSelectionStatus.mockResolvedValue(serviceResult);

      const result = await resolver.questionSelectionStatus('match-1');

      expect(result.status).toBe('COMPLETE');
      expect(result.selections).toHaveLength(2);
      expect(result.pendingUserIds).toEqual([]);
      expect(result.finalQuestion).toBeDefined();
    });

    it('should return ALREADY_ASSIGNED status', async () => {
      const serviceResult = {
        status: 'ALREADY_ASSIGNED' as const,
        selections: [],
        pendingUserIds: [],
        finalQuestion: mockQuestion,
      };

      mockService.getQuestionSelectionStatus.mockResolvedValue(serviceResult);

      const result = await resolver.questionSelectionStatus('match-1');

      expect(result.status).toBe('ALREADY_ASSIGNED');
      expect(result.finalQuestion).toBeDefined();
    });

    it('should propagate service errors', async () => {
      mockService.getQuestionSelectionStatus.mockRejectedValue(new Error('Match not found'));

      await expect(resolver.questionSelectionStatus('invalid-match')).rejects.toThrow(
        'Match not found',
      );
    });
  });
});
