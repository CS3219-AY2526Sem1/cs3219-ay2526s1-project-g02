import { Module } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE = Symbol("SUPABASE");

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
  ],
  exports: [SUPABASE],
})
export class SupabaseModule {}

