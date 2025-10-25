import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SupabaseClient } from "@supabase/supabase-js";
import { DatabaseService } from "src/database/database.service";
import { RedisService } from "src/redis/redis.service";
import { QueueMember } from "src/utils/types";
import { getCurrentUnixTimestamp } from "src/utils/utils";

@Injectable()
export class TtlService {
    private readonly logger = new Logger(TtlService.name);
    private readonly supabase: SupabaseClient;
    private readonly queueKeys = [
        'matching:queue:easy',
        'matching:queue:medium',
        'matching:queue:hard',
    ]

    constructor(
        private readonly redisService: RedisService,
        private readonly dbService: DatabaseService,
    ) {
        this.supabase = this.dbService.getClient();
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async handleCleanup() {
        const now = getCurrentUnixTimestamp(); // current time in seconds
        this.logger.debug(`Running TTL cleanup at ${new Date().toISOString()} | Max Score: ${now}`);

        for (const key of this.queueKeys) {
            try {
                // 1. Remove expired users from Redis queue
                const expiredMemberStrings = await this.redisService.getAndRemoveExpiredMembers(key, now);
                if (expiredMemberStrings.length === 0) continue;
                this.logger.log(`[${key}] Removed ${expiredMemberStrings.length} expired members from queue.`);

                // 2. Extract Request IDs from expired members (to update DB later)
                const expiredRequestIds: string[] = [];
                for (const memberStr of expiredMemberStrings) {
                    try {
                        const member = JSON.parse(memberStr) as QueueMember;
                        expiredRequestIds.push(member.requestId);
                    } catch (e) {
                        this.logger.error(`Failed to parse expired member JSON: ${memberStr}`, e);
                    }
                }

                // 3. Update match_requests table, set status = 'expired' for the above request IDs
                if (expiredRequestIds.length === 0) continue;
                const { error } = await this.supabase
                    .from('match_requests')
                    .update({ status: 'expired' })
                    .in('id', expiredRequestIds);

                if (error) {
                    this.logger.error(`Failed to update DB for expired requests: ${error.message}`);
                } else {
                    this.logger.log(`Updated ${expiredRequestIds.length} DB records to 'expired' for queue ${key}.`);
                }

            } catch (error) {
                this.logger.error(`Fatal error during TTL cleanup for key ${key}:`, error);
            }
        }
    }
}