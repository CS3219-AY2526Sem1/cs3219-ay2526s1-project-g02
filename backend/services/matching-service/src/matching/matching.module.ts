import { forwardRef, Module } from '@nestjs/common';
import { MatchingResolver } from './matching.resolver';
import { MatchingService } from './matching.service';
import { MatchingGateway } from './matching.gateway';
import { RedisModule } from 'src/redis/redis.module';
import { TtlService } from './ttl.service';
import { DatabaseModule } from 'src/database/database.module';
import { CheckModule } from 'src/check/check.module';
import { EventBusModule } from 'src/event-bus/event-bus.module';

@Module({
  imports: [RedisModule, DatabaseModule, CheckModule, EventBusModule,
    forwardRef(() => EventBusModule),
  ],
  providers: [MatchingResolver, MatchingService, MatchingGateway, TtlService],
  exports: [MatchingService],
})
export class MatchingModule {}
