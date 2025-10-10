import { Module } from '@nestjs/common';
import { CollaborationResolver } from './collaboration.resolver';
import { CollaborationService } from './collaboration.service';
import { CollaborationGateway } from './collaboration.gateway';

@Module({
  providers: [CollaborationResolver, CollaborationService, CollaborationGateway],
  exports: [CollaborationService],
})
export class CollaborationModule {}
