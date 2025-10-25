import 'dotenv/config';
import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
);

@Injectable()
export class CollaborationService {
  async createSession(matchId: string) {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{ match_id: matchId, code: '', language: 'javascript', status: 'active' }])
      .select()
      .single();

    if (error) throw new Error(`Failed to create session: ${error.message}`);
    return data;
  }

  async getSession(sessionId: string) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw new Error(`Failed to fetch session: {error.message}`);
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
