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

export type QuestionSelectionStatus = 'PENDING' | 'COMPLETE' | 'ALREADY_ASSIGNED';

export interface SubmitQuestionSelectionInput {
  matchId: string;
  userId: string;
  questionId: string;
}

export interface QuestionSelectionRecord {
  id: string;
  matchId: string;
  userId: string;
  questionId: string;
  isWinner: boolean | null;
  submittedAt: string | null;
  finalizedAt: string | null;
}

export interface QuestionSelectionSummary {
  userId: string;
  questionId: string;
  isWinner: boolean | null;
  submittedAt: string | null;
  finalizedAt: string | null;
}

export interface QuestionSelectionResult {
  status: QuestionSelectionStatus;
  selections: QuestionSelectionSummary[];
  pendingUserIds: string[];
  finalQuestion?: Question | null;
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
   * Record a user's question selection and, when both participants have submitted, randomly pick one.
   */
  async submitQuestionSelection(
    input: SubmitQuestionSelectionInput,
  ): Promise<QuestionSelectionResult> {
    const { matchId, userId, questionId } = input;

    if (!matchId || !userId || !questionId) {
      throw new Error('matchId, userId, and questionId are required');
    }

    const match = await this.fetchMatchParticipants(matchId);
    if (!match) {
      throw new Error(`Match ${matchId} not found or inactive`);
    }

    const participants = this.extractParticipants(match);
    if (!participants.includes(userId)) {
      throw new Error('User is not part of this match');
    }

    const requestedQuestion = await this.findOne(questionId);
    if (!requestedQuestion) {
      throw new Error('Selected question does not exist');
    }

    const preExistingSelections = await this.fetchSelections(matchId);
    const existingWinner = preExistingSelections.find((selection) => selection.isWinner);
    if (existingWinner) {
      const finalQuestion = await this.findOne(existingWinner.questionId);
      return this.buildSelectionResult(
        'ALREADY_ASSIGNED',
        participants,
        preExistingSelections,
        finalQuestion,
      );
    }

    const { error: upsertError } = await this.supabase
      .from('question_selections')
      .upsert(
        {
          match_id: matchId,
          user_id: userId,
          question_id: questionId,
        },
        { onConflict: 'match_id,user_id' },
      );

    if (upsertError) {
      this.logger.error(
        `Failed to store question selection for match ${matchId} and user ${userId}`,
        upsertError,
      );
      throw new Error(`Failed to store question selection: ${upsertError.message || upsertError}`);
    }

    const selections = await this.fetchSelections(matchId);
    const pendingParticipants = this.getPendingParticipants(participants, selections);
    if (pendingParticipants.length > 0 || participants.length < 2) {
      return this.buildSelectionResult('PENDING', participants, selections);
    }

    const winningSelection = this.pickWinningSelection(selections);
    const winningQuestion =
      winningSelection.questionId === requestedQuestion.id
        ? requestedQuestion
        : await this.findOne(winningSelection.questionId);

    if (!winningQuestion) {
      throw new Error('Winning question could not be retrieved');
    }

    const timestamp = new Date().toISOString();
    const { error: markAllError } = await this.supabase
      .from('question_selections')
      .update({ is_winner: false, finalized_at: timestamp })
      .eq('match_id', matchId);

    if (markAllError) {
      this.logger.error('Failed to mark selections as finalized', markAllError);
      throw new Error(`Failed to finalize question selections: ${markAllError.message}`);
    }

    const { error: markWinnerError } = await this.supabase
      .from('question_selections')
      .update({ is_winner: true, finalized_at: timestamp })
      .eq('id', winningSelection.id);

    if (markWinnerError) {
      this.logger.error('Failed to mark winning selection', markWinnerError);
      throw new Error(`Failed to finalize winning selection: ${markWinnerError.message}`);
    }

    const testCases = await this.getTestCasesForQuestion(winningQuestion.id);

    await this.eventBusService.publishQuestionAssigned({
      matchId,
      questionId: winningQuestion.id,
      questionTitle: winningQuestion.title,
      questionDescription: winningQuestion.description,
      difficulty: this.normalizeDifficultyForPayload(winningQuestion.difficulty),
      topics: winningQuestion.category,
      testCases: testCases.map((testCase) => ({
        id: testCase.id,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        isHidden: testCase.isHidden,
        orderIndex: testCase.orderIndex,
      })),
    });

    // Log question attempts for both users
    await this.logQuestionAttempts(matchId, winningQuestion.id, participants);

    const finalizedSelections = await this.fetchSelections(matchId);
    return this.buildSelectionResult('COMPLETE', participants, finalizedSelections, winningQuestion);
  }

  /**
   * Retrieve the current selection state for a match without mutating it.
   */
  async getQuestionSelectionStatus(matchId: string): Promise<QuestionSelectionResult> {
    if (!matchId) {
      throw new Error('matchId is required');
    }

    const match = await this.fetchMatchParticipants(matchId);
    if (!match) {
      throw new Error(`Match ${matchId} not found or inactive`);
    }

    const participants = this.extractParticipants(match);
    const selections = await this.fetchSelections(matchId);
    const winner = selections.find((selection) => selection.isWinner);
    const finalQuestion = winner ? await this.findOne(winner.questionId) : null;

    const status: QuestionSelectionStatus = winner ? 'COMPLETE' : 'PENDING';

    return this.buildSelectionResult(status, participants, selections, finalQuestion);
  }

  /**
   * Get questions for user selection in a match, filtered by difficulty and categories.
   * Uses fallback strategy: try difficulty + categories → difficulty only → all questions
   * @param matchId The match ID to fetch criteria for
   * @returns Array of questions matching the criteria (with fallback)
   */
  async getQuestionsForMatchSelection(matchId: string): Promise<Question[]> {
    try {
      // Fetch the match with all needed fields in a single query
      const { data: match, error: matchError } = await this.supabase
        .from('matches')
        .select('id, user1_id, user2_id, status, difficulty, common_topics')
        .eq('id', matchId)
        .single();

      if (matchError || !match) {
        this.logger.warn(
          `Match ${matchId} not found (${matchError?.message || 'no data'}), returning all questions`,
        );
        return this.findAll();
      }

      if (match.status && match.status !== 'active') {
        this.logger.warn(`Match ${matchId} is not active (status=${match.status}), returning all questions`);
        return this.findAll();
      }

      const difficulty = match.difficulty;
      const topics = Array.isArray(match.common_topics) 
        ? match.common_topics.filter(Boolean) 
        : [];

      const normalizedDifficulty = this.normalizeDifficultyForQuery(difficulty);

      // Strategy 1: Try with difficulty + categories
      if (topics.length > 0) {
        const questions = await this.findQuestionsByDifficultyAndCategories(
          normalizedDifficulty,
          topics,
        );
        if (questions.length > 0) {
          return questions;
        }
      }

      // Strategy 2: Try with difficulty only
      if (normalizedDifficulty) {
        const questions = await this.findByDifficulty(normalizedDifficulty);
        if (questions.length > 0) {
          return questions;
        }
      }

      // Strategy 3: Return all questions
      return this.findAll();
    } catch (error) {
      this.logger.error(
        `Error fetching questions for match selection (${matchId}):`,
        error,
      );
      // On error, return all questions as fallback
      return this.findAll();
    }
  }

  /**
   * Find questions matching both difficulty and categories
   * @param difficulty The difficulty level
   * @param categories Array of categories
   * @returns Array of questions matching both criteria
   */
  private async findQuestionsByDifficultyAndCategories(
    difficulty: string,
    categories: string[],
  ): Promise<Question[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('difficulty', difficulty)
        .overlaps('category', categories)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Error fetching questions by difficulty and categories:', error);
        return [];
      }

      return (data || []).map(this.mapToQuestion);
    } catch (error) {
      this.logger.error('Exception in findQuestionsByDifficultyAndCategories:', error);
      return [];
    }
  }

  /**
   * Handle match found event by preparing for manual question selection.
   * Updates the match record with difficulty and topics as a backup.
   */
  private async handleMatchFound(payload: MatchFoundPayload): Promise<void> {
    try {
      // Clear any existing selections for this match
      const { error: deleteError } = await this.supabase
        .from('question_selections')
        .delete()
        .eq('match_id', payload.matchId);

      if (deleteError) {
        this.logger.error(
          `Failed to clear existing selections for match ${payload.matchId}: ${deleteError.message}`,
        );
      }

      // Update match record with difficulty and topics (backup in case matching service didn't set them)
      const { error: updateError } = await this.supabase
        .from('matches')
        .update({
          difficulty: payload.difficulty,
          common_topics: payload.commonTopics,
        })
        .eq('id', payload.matchId);

      if (updateError) {
        this.logger.warn(
          `Could not update match ${payload.matchId} with criteria: ${updateError.message}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error while preparing manual selection for match ${payload.matchId}`, error);
    }
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

  private async fetchMatchParticipants(matchId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('matches')
      .select('id, user1_id, user2_id, status')
      .eq('id', matchId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }

      this.logger.error(`Failed to fetch match ${matchId}`, error);
      throw new Error(`Failed to fetch match: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    if (data.status && data.status !== 'active') {
      this.logger.warn(`Match ${matchId} is not active (status=${data.status})`);
      return null;
    }

    return data;
  }

  private extractParticipants(match: any): string[] {
    return [match.user1_id, match.user2_id].filter((value): value is string => Boolean(value));
  }

  private async fetchSelections(matchId: string): Promise<QuestionSelectionRecord[]> {
    const { data, error } = await this.supabase
      .from('question_selections')
      .select('id, match_id, user_id, question_id, is_winner, submitted_at, finalized_at, created_at')
      .eq('match_id', matchId);

    if (error) {
      this.logger.error(`Failed to fetch question selections for match ${matchId}`, error);
      throw new Error(`Failed to fetch question selections: ${error.message}`);
    }

    return (data || []).map((row) => this.mapToSelection(row));
  }

  private getPendingParticipants(
    participants: string[],
    selections: QuestionSelectionRecord[],
  ): string[] {
    return participants.filter(
      (participantId) => !selections.some((selection) => selection.userId === participantId),
    );
  }

  private pickWinningSelection(
    selections: QuestionSelectionRecord[],
  ): QuestionSelectionRecord {
    if (selections.length === 0) {
      throw new Error('Cannot pick a winning selection without any submissions');
    }

    if (selections.length === 1) {
      return selections[0];
    }

    const randomIndex = Math.floor(Math.random() * selections.length);
    return selections[randomIndex];
  }

  private buildSelectionResult(
    status: QuestionSelectionStatus,
    participants: string[],
    selections: QuestionSelectionRecord[],
    finalQuestion?: Question | null,
  ): QuestionSelectionResult {
    const pendingUserIds = this.getPendingParticipants(participants, selections);
    const summaries: QuestionSelectionSummary[] = selections.map((selection) => ({
      userId: selection.userId,
      questionId: selection.questionId,
      isWinner: selection.isWinner,
      submittedAt: selection.submittedAt,
      finalizedAt: selection.finalizedAt,
    }));

    return {
      status,
      selections: summaries,
      pendingUserIds,
      finalQuestion: finalQuestion ?? null,
    };
  }

  private mapToSelection(data: any): QuestionSelectionRecord {
    return {
      id: data.id,
      matchId: data.match_id,
      userId: data.user_id,
      questionId: data.question_id,
      isWinner: data.is_winner ?? null,
      submittedAt: data.submitted_at ?? data.created_at ?? null,
      finalizedAt: data.finalized_at ?? null,
    };
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

  /**
   * Log question attempts for all participants in a match
   */
  private async logQuestionAttempts(
    matchId: string,
    questionId: string,
    participants: string[],
  ): Promise<void> {
    try {
      const attempts = participants.map((userId) => ({
        user_id: userId,
        question_id: questionId,
        match_id: matchId,
        attempted_at: new Date().toISOString(),
      }));

      const { error } = await this.supabase
        .from('question_attempts')
        .insert(attempts);

      if (error) {
        this.logger.error(
          `Failed to log question attempts for match ${matchId}:`,
          error,
        );
      }
    } catch (error) {
      this.logger.error('Error logging question attempts:', error);
    }
  }

  /**
   * Get all question attempts for a specific user
   */
  async getQuestionAttemptsByUser(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('question_attempts')
        .select(`
          id,
          user_id,
          question_id,
          match_id,
          attempted_at,
          created_at,
          questions!question_id (
            id,
            title,
            description,
            difficulty,
            category
          )
        `)
        .eq('user_id', userId)
        .order('attempted_at', { ascending: false });

      if (error) {
        this.logger.error(`Failed to fetch question attempts for user ${userId}:`, error.message);
        throw new Error(`Failed to fetch question attempts: ${error.message}`);
      }

      return (data || []).map((attempt) => {
        // Handle both array and object returns from Supabase
        const questionData = attempt.questions 
          ? (Array.isArray(attempt.questions) ? attempt.questions[0] : attempt.questions)
          : null;

        return {
          id: attempt.id,
          userId: attempt.user_id,
          questionId: attempt.question_id,
          matchId: attempt.match_id,
          attemptedAt: attempt.attempted_at,
          createdAt: attempt.created_at,
          question: questionData 
            ? {
                id: questionData.id,
                title: questionData.title,
                description: questionData.description,
                difficulty: questionData.difficulty,
                category: questionData.category,
              }
            : null,
        };
      });
    } catch (error) {
      this.logger.error('Error fetching question attempts:', error);
      throw error;
    }
  }

  /**
   * Get all suggested solutions for a specific question
   */
  async getSuggestedSolutionsForQuestion(questionId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('suggested_solutions')
        .select('*')
        .eq('question_id', questionId)
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error(`Failed to fetch suggested solutions for question ${questionId}:`, error);
        throw new Error(`Failed to fetch suggested solutions: ${error.message}`);
      }

      return (data || []).map((solution) => ({
        id: solution.id,
        questionId: solution.question_id,
        language: solution.language,
        solutionCode: solution.solution_code,
        explanation: solution.explanation,
        timeComplexity: solution.time_complexity,
        spaceComplexity: solution.space_complexity,
        createdAt: solution.created_at,
        updatedAt: solution.updated_at,
      }));
    } catch (error) {
      this.logger.error('Error fetching suggested solutions:', error);
      throw error;
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
