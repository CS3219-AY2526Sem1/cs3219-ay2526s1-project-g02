import { Module } from "@nestjs/common";
import { UsersModule } from "./users/users.module";
import { SupabaseModule } from "./supabase/supabase.module";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    UsersModule,
    SupabaseModule,
    ConfigModule.forRoot({
      isGlobal: true, // makes .env variables accessible everywhere
    }),
  ],
})
export class AppModule {}
