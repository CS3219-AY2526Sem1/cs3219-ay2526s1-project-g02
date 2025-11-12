import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHealth() {
    // Check environment variables
    const supabaseConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);
    const llmProvider = process.env.LLM_PROVIDER || 'vertex';
    const llmConfigured = llmProvider === 'vertex' 
      ? !!(process.env.GCP_PROJECT_ID && process.env.GCP_LOCATION)
      : !!process.env.OPENAI_API_KEY;

    const isHealthy = supabaseConfigured && llmConfigured;

    return {
      status: isHealthy ? "ok" : "degraded",
      service: "llm-service",
      timestamp: new Date().toISOString(),
      checks: {
        supabase: supabaseConfigured ? "ok" : "missing configuration",
        llmProvider: llmProvider,
        llmConfigured: llmConfigured ? "ok" : "missing configuration",
      },
      uptime: process.uptime(),
      version: process.env.npm_package_version || "unknown",
    };
  }
}

