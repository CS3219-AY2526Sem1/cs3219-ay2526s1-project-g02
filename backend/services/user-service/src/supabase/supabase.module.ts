// supabase.module.ts
import { Global, Module } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE = Symbol("SUPABASE");
export const SUPABASE_ADMIN = Symbol("SUPABASE_ADMIN");

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE,
      useFactory: (): SupabaseClient => {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_KEY;
        if (!SUPABASE_URL || !SUPABASE_KEY)
          throw new Error("Missing SUPABASE_URL or SUPABASE_KEY in env file");
        return createClient(SUPABASE_URL, SUPABASE_KEY, {});
      },
    },
    {
      provide: SUPABASE_ADMIN,
      useFactory: (): SupabaseClient => {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)
          throw new Error(
            "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env file"
          );
        return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {});
      },
    },
  ],
  exports: [SUPABASE, SUPABASE_ADMIN],
})
export class SupabaseModule {}