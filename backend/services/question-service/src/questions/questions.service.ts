import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MatchFoundPayload } from '@noclue/common';
import { EventBusService } from '../event-bus/event-bus.service';

export interface TestCase {
  id: string;
  questionId: string;
  input: any; // JSONB - flexible input structure
  expectedOutput: any; // JSONB - flexible output structure
  isHidden: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string[];
  examples?: string;
  constraints?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestionInput {
  title: string;
  description: string;
  difficulty: string;
  category: string[];
  examples?: string;
  constraints?: string;
  testCases?: string;
}

export interface UpdateQuestionInput {
  title?: string;
  description?: string;
  difficulty?: string;
  category?: string[];
  examples?: string;
  constraints?: string;
  testCases?: string;
}

@Injectable()
export class QuestionsService implements OnModuleInit {
  private readonly tableName = 'questions';
  private readonly supabase: SupabaseClient;
  private readonly logger = new Logger(QuestionsService.name);

  constructor(private readonly eventBusService: EventBusService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_KEY || '',
    );
  }

  async onModuleInit(): Promise<void> {
    this.eventBusService.registerMatchFoundHandler(async (payload) => {
      await this.handleMatchFound(payload);
    });

    this.logger.log('Match found handler registered for question assignments');
  }

  async findAll(): Promise<Question[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }

    return (data || []).map(this.mapToQuestion);
  }

  async findOne(id: string): Promise<Question | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch question: ${error.message}`);
    }

    return this.mapToQuestion(data);
  }

  async findByDifficulty(difficulty: string): Promise<Question[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('difficulty', difficulty)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }

    return (data || []).map(this.mapToQuestion);
  }

  async findByCategory(category: string): Promise<Question[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .contains('category', [category])
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }

    return (data || []).map(this.mapToQuestion);
  }

  /**
   * Retrieve K random questions with optional filters for session allocation
   * @param count Number of questions to retrieve
   * @param difficulty Optional difficulty filter (Easy, Medium, Hard)
   * @param categories Optional array of categories to filter by
   * @returns Array of random questions matching the criteria
   */
  async findRandomQuestions(
    count: number,
    difficulty?: string,
    categories?: string[],
  ): Promise<Question[]> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*');

      // Apply difficulty filter if provided
      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }

      // Apply category filter if provided
      if (categories && categories.length > 0) {
        // Check if any of the provided categories exist in the question's category array
        query = query.overlaps('category', categories);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch random questions: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Shuffle and take K questions
      const shuffled = this.shuffleArray(data);
      const selected = shuffled.slice(0, Math.min(count, shuffled.length));

      return selected.map(this.mapToQuestion);
    } catch (err) {
      this.logger.error('Find random questions error:', err as Error);
      throw new Error(`Failed to retrieve random questions: ${err}`);
    }
  }

  /**
   * Fisher-Yates shuffle algorithm for randomizing question selection
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get all test cases for a specific question 
   * All test cases are visible to users
   * @param questionId The question ID
   * @returns Array of test cases with input and expected output
   */
  async getTestCasesForQuestion(questionId: string): Promise<TestCase[]> {
    try {
      const { data, error } = await this.supabase
        .from('test_cases')
        .select('*')
        .eq('question_id', questionId)
        .order('order_index', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch test cases: ${error.message}`);
      }

      return (data || []).map(this.mapToTestCase);
    } catch (err) {
      this.logger.error('Get test cases error:', err as Error);
      throw new Error(`Failed to retrieve test cases: ${err}`);
    }
  }

  /**
   * Handle match found event by selecting a question and publishing it.
   */
  private async handleMatchFound(payload: MatchFoundPayload): Promise<void> {
    this.logger.log(`Selecting question for match ${payload.matchId}`);

    try {
      const question = await this.pickQuestionForMatch(payload);

      if (!question) {
        this.logger.error(`No suitable question found for match ${payload.matchId}`);
        return;
      }

      await this.eventBusService.publishQuestionAssigned({
        matchId: payload.matchId,
        questionId: question.id,
        questionTitle: question.title,
        questionDescription: question.description,
        difficulty: this.normalizeDifficultyForPayload(question.difficulty),
        topics: question.category,
      });

      this.logger.log(`Published question ${question.id} for match ${payload.matchId}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish question for match ${payload.matchId}`,
        error as Error,
      );
    }
  }

  /**
   * Determine a suitable question for the match using fallback strategies.
   */
  private async pickQuestionForMatch(payload: MatchFoundPayload): Promise<Question | null> {
    const normalizedDifficulty = this.normalizeDifficultyForQuery(payload.difficulty);
    const topics = Array.isArray(payload.commonTopics)
      ? payload.commonTopics.filter(Boolean)
      : [];

    const strategies: Array<{ difficulty?: string; categories?: string[] }> = [
      { difficulty: normalizedDifficulty, categories: topics },
      { difficulty: normalizedDifficulty },
      {},
    ];

    for (const strategy of strategies) {
      const questions = await this.findRandomQuestions(
        1,
        strategy.difficulty,
        strategy.categories && strategy.categories.length > 0 ? strategy.categories : undefined,
      );

      if (questions.length > 0) {
        return questions[0];
      }
    }

    return null;
  }

  /**
   * Normalize difficulty strings for Supabase queries.
   */
  private normalizeDifficultyForQuery(
    difficulty: MatchFoundPayload['difficulty'],
  ): string {
    switch (difficulty) {
      case 'easy':
        return 'Easy';
      case 'medium':
        return 'Medium';
      case 'hard':
        return 'Hard';
      default:
        return difficulty;
    }
  }

  /**
   * Normalize difficulty strings for payload emission.
   */
  private normalizeDifficultyForPayload(difficulty: string): MatchFoundPayload['difficulty'] {
    const normalized = difficulty.toLowerCase();

    if (normalized === 'easy' || normalized === 'medium' || normalized === 'hard') {
      return normalized;
    }

    this.logger.warn(`Unexpected difficulty value "${difficulty}", defaulting to "medium"`);
    return 'medium';
  }

  /**
   * Get test cases for multiple questions (for session allocation)
   * All test cases are visible to users
   * @param questionIds Array of question IDs
   * @returns Map of question ID to test cases array
   */
  async getTestCasesForQuestions(questionIds: string[]): Promise<Map<string, TestCase[]>> {
    try {
      const { data, error } = await this.supabase
        .from('test_cases')
        .select('*')
        .in('question_id', questionIds)
        .order('order_index', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch test cases: ${error.message}`);
      }

      // Group test cases by question_id
      const testCasesByQuestion = new Map<string, TestCase[]>();
      (data || []).forEach((tc) => {
        const testCase = this.mapToTestCase(tc);
        const existing = testCasesByQuestion.get(testCase.questionId) || [];
        existing.push(testCase);
        testCasesByQuestion.set(testCase.questionId, existing);
      });

      return testCasesByQuestion;
    } catch (err) {
      this.logger.error('Get test cases for questions error:', err as Error);
      throw new Error(`Failed to retrieve test cases for questions: ${err}`);
    }
  }

  async create(input: CreateQuestionInput): Promise<Question> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert([input])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Failed to create question: ${error.message}`);
      }

      return this.mapToQuestion(data);
    } catch (err) {
      console.error('Create question error:', err);
      throw new Error(`Failed to create question: ${err}`);
    }
  }

  async update(id: string, input: UpdateQuestionInput): Promise<Question> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update question: ${error.message}`);
    }

    return this.mapToQuestion(data);
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete question: ${error.message}`);
    }

    return true;
  }

  private mapToQuestion(data: any): Question {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      category: data.category,
      examples: data.examples,
      constraints: data.constraints,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToTestCase(data: any): TestCase {
    return {
      id: data.id,
      questionId: data.question_id,
      input: data.input,
      expectedOutput: data.expected_output,
      isHidden: data.is_hidden,
      orderIndex: data.order_index,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
