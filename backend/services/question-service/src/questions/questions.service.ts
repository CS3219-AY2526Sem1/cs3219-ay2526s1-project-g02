import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
);

export interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string[];
  examples?: string;
  constraints?: string;
  testCases?: string;
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
export class QuestionsService {
  private readonly tableName = 'questions';

  async findAll(): Promise<Question[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }

    return (data || []).map(this.mapToQuestion);
  }

  async findOne(id: string): Promise<Question | null> {
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .contains('category', [category])
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch questions: ${error.message}`);
    }

    return (data || []).map(this.mapToQuestion);
  }

  async create(input: CreateQuestionInput): Promise<Question> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([input])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create question: ${error.message}`);
    }

    return this.mapToQuestion(data);
  }

  async update(id: string, input: UpdateQuestionInput): Promise<Question> {
    const { data, error } = await supabase
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
    const { error } = await supabase
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
      testCases: data.test_cases,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
