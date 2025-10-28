import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SECRET_KEY || '',
);

@Injectable()
export class MatchingService {
  private matchingQueue: Map<string, any> = new Map();

  async createMatchRequest(userId: string, preferences: any) {
    const { data, error } = await supabase
      .from('match_requests')
      .insert([{ user_id: userId, ...preferences, status: 'pending' }])
      .select()
      .single();

    if (error) throw new Error(\`Failed to create match request: \${error.message}\`);

    this.matchingQueue.set(userId, data);
    return data;
  }

  async findMatch(userId: string) {
    // TODO: Implement matching algorithm
    return null;
  }

  async getMatchHistory(userId: string) {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .or(\`user1_id.eq.\${userId},user2_id.eq.\${userId}\`);

    if (error) throw new Error(\`Failed to fetch match history: \${error.message}\`);
    return data;
  }
}
