import { Inject, Injectable } from "@nestjs/common";
import { User } from "./interface/user.interface";
import { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE, SUPABASE_ADMIN } from "../supabase/supabase.module";

@Injectable()
export class UsersService {
  constructor(
    @Inject(SUPABASE) private readonly supabase: SupabaseClient,
    @Inject(SUPABASE_ADMIN) private readonly supabaseAdmin: SupabaseClient
  ) {}

  async register() {
    const { data, error } = await this.supabase.auth.signUp({
      email: "example@email.com",
      password: "example-password",
    });
  }

  findAll(): User[] {
    return [];
  }
}
