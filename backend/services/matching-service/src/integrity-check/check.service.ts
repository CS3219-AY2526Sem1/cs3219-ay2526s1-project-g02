import { Injectable, Logger } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { DatabaseService } from "src/database/database.service";

@Injectable()
export class CheckService {
    private readonly logger = new Logger(CheckService.name);
    private readonly supabase: SupabaseClient;

    constructor(private readonly dbService: DatabaseService) {
        this.supabase = this.dbService.getClient();
    }

    async isUserInActiveMatch(userId: string): Promise<boolean> {
        this.logger.debug(`Checking active match for user: ${userId}`);
    
        try {
            const { count, error } = await this.supabase
                .from('matches')
                .select('id', { count: 'exact', head: true })
                .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
                .eq('status', 'active');

            if (error) {
                this.logger.error(`Error querying matches for user ${userId}: ${error.message}`);
                throw new Error(`Database integrity check failed.`)
            }

            return (count ?? 0) > 0;
        } catch (error) {
            this.logger.error(`Integrity check failed for user ${userId}: ${error.stack}`);
            throw new Error(`Database integrity check failed.`)
        }
    }
}