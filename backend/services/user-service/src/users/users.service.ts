import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
);

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  skillLevel?: string;
  createdAt: string;
  updatedAt: string;
}


@Injectable()
export class UsersService {
  private readonly tableName = 'users';

  async findAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return (data || []).map(this.mapToUser);
  }

  async findOne(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return this.mapToUser(data);
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return this.mapToUser(data);
  }

  async create(input: CreateUserInput): Promise<User> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([input])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return this.mapToUser(data);
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return this.mapToUser(data);
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }

    return true;
  }

  private mapToUser(data: any): User {
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      skillLevel: data.skill_level,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
