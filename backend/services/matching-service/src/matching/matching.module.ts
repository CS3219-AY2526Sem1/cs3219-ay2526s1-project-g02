import { Module } from '@nestjs/common';
import { MatchingResolver } from './matching.resolver';
import { MatchingService } from './matching.service';
import { MatchingGateway } from './matching.gateway';

@Module({
  providers: [MatchingResolver, MatchingService, MatchingGateway],
  exports: [MatchingService],
})
export class MatchingModule {}
