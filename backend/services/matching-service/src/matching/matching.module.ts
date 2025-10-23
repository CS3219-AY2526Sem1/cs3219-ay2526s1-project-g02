import { Module } from '@nestjs/common';
import { MatchingResolver } from './matching.resolver';
import { MatchingService } from './matching.service';
import { MatchingGateway } from './matching.gateway';
import { RedisModule } from 'src/redis/redis.module';
import { TtlService } from './ttl.service';

@Module({
  imports: [RedisModule],
  providers: [MatchingResolver, MatchingService, MatchingGateway, TtlService],
  exports: [MatchingService],
})
export class MatchingModule {}
