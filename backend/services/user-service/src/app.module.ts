import { Module } from "@nestjs/common";
import { UsersModule } from "./users/users.module";
import { SupabaseModule } from "./supabase/supabase.module";

@Module({
  imports: [UsersModule, SupabaseModule],
})
export class AppModule {}
