import 'dotenv/config';
import { Injectable, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { QuestionAssignedPayload } from '@noclue/common';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
);

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  async createSession(matchId: string) {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{ match_id: matchId, code: '', language: 'javascript', status: 'active' }])
      .select()
      .single();

    if (error) throw new Error(`Failed to create session: ${error.message}`);
    return data;
  }

  /**
   * Create a session from QuestionAssigned event
   */
  async createSessionFromQuestion(payload: QuestionAssignedPayload) {
    this.logger.log(`Creating session for match ${payload.matchId} with question ${payload.questionId}`);

    this.logger.log(`Question: ${JSON.stringify(payload)}`);
    
    const sessionData = {
      match_id: payload.matchId,
      question_id: payload.questionId,
      code: `// ${payload.questionTitle}\n// Difficulty: ${payload.difficulty}\n\n`,
      language: 'javascript',
      status: 'active',
    };

    const { data, error } = await supabase
      .from('sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create session: ${error.message}`);
      throw new Error(`Failed to create session: ${error.message}`);
    }

    this.logger.log(`Session created successfully: ${data.id}`);
    return data;
  }

  async getSession(sessionId: string) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw new Error(`Failed to fetch session: ${error.message}`);
    return data;
  }

  async updateCode(sessionId: string, code: string) {
    const { data, error } = await supabase
      .from('sessions')
      .update({ code })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update code: ${error.message}`);
    return data;
  }

  async endSession(sessionId: string) {
    const { data, error } = await supabase
      .from('sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw new Error(`Failed to end session: ${error.message}`);
    return data;
  }
}
