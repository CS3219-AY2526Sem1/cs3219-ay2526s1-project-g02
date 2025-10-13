import { Controller, Get, Post } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";

@Controller("users")
export class UsersController {
  //Singleton pattern of the supabase client
  constructor(private readonly supabaseService: SupabaseClient) {}

  //   @Post()
  //   create(): string {
  //     return "This action adds a new cat";
  //   }
  //   @Get()
  //   findAll(): string {
  //     return "This action returns all cats";
  //   }
}
