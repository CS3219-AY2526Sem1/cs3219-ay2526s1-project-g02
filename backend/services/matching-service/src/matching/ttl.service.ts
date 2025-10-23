import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { RedisService } from "src/redis/redis.service";

@Injectable()
export class TtlService {
    private readonly logger = new Logger(TtlService.name);
    private readonly queueKeys = [
        'matching:queue:easy',
        'matching:queue:medium',
        'matching:queue:hard',
    ]

    constructor(private readonly redisService: RedisService) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async handleCleanup() {
        const now = Math.floor(Date.now() / 1000);
        this.logger.debug(`Starting TTL cleanup at ${new Date().toISOString()}`);

        for (const key of this.queueKeys) {
            try {
                const removedCount = await this.redisService.removeExpiredMembers(key, now);

                if (removedCount > 0) {
                    this.logger.log(`[${key}] Removed ${removedCount} expired members`);
                }
            } catch (error) {
                this.logger.error(`Error during TTL cleanup for key ${key}:`, error);
            }
        }
    }
}