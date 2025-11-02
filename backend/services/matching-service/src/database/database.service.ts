import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DatabaseService.name);
    private supabase: SupabaseClient;

    constructor() {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_KEY;
        if (!url || !key) {
            this.logger.error("Supabase URL or Key is not defined in environment variables.");
        }
        this.supabase = createClient(url || "", key || "");
    }

    public getClient(): SupabaseClient {
        return this.supabase;
    }

    async onModuleInit() {
        console.log("Connected to Supabase");
    }

    async onModuleDestroy() {
        console.log("Disconnected from Supabase");
    }
}