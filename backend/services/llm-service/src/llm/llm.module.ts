import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LlmController } from "./llm.controller";
import { LlmService } from "./llm.service";
import { LlmVertexService } from "./llm-vertex.service";
import { SUPABASE } from "../supabase/supabase.module";
import { SupabaseClient } from "@supabase/supabase-js";

// Provider token
export const LLM_SERVICE = 'LLM_SERVICE';

@Module({
  imports: [],
  controllers: [LlmController],
  providers: [
    {
      provide: LLM_SERVICE,
      useFactory: (configService: ConfigService, supabaseClient: SupabaseClient) => {
        const provider = configService.get<string>('LLM_PROVIDER') || 'vertex';
        
        if (provider === 'vertex') {
          return new LlmVertexService(supabaseClient);
        } else if (provider === 'openai') {
          return new LlmService(supabaseClient);
        } else {
          throw new Error(`Unknown LLM_PROVIDER: ${provider}. Use 'vertex' or 'openai'`);
        }
      },
      inject: [ConfigService, SUPABASE],
    },
  ],
  exports: [LLM_SERVICE],
})
export class LlmModule {}

