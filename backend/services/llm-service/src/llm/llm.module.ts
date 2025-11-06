import { Module } from "@nestjs/common";
import { LlmController } from "./llm.controller";
import { LlmService } from "./llm.service";
import { SupabaseModule } from "../supabase/supabase.module";

@Module({
  imports: [SupabaseModule],
  controllers: [LlmController],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}

