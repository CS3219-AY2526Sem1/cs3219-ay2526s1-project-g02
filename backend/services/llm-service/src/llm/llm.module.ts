import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LlmController } from "./llm.controller";
import { LlmService } from "./llm.service";
import { LlmVertexService } from "./llm-vertex.service";
import { SupabaseModule } from "../supabase/supabase.module";

// Provider token
export const LLM_SERVICE = 'LLM_SERVICE';

@Module({
  imports: [SupabaseModule],
  controllers: [LlmController],
  providers: [
    {
      provide: LLM_SERVICE,
      useFactory: (configService: ConfigService, ...args: any[]) => {
        const provider = configService.get<string>('LLM_PROVIDER') || 'vertex';
        
        if (provider === 'vertex') {
          return new LlmVertexService(...args);
        } else if (provider === 'openai') {
          return new LlmService(...args);
        } else {
          throw new Error(`Unknown LLM_PROVIDER: ${provider}. Use 'vertex' or 'openai'`);
        }
      },
      inject: [ConfigService, SUPABASE],
    },
    LlmService,
    LlmVertexService,
  ],
  exports: [LLM_SERVICE],
})
export class LlmModule {}

