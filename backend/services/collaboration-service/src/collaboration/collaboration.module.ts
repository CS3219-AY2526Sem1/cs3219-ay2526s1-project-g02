import { Module } from '@nestjs/common';
import { CollaborationResolver } from './collaboration.resolver';
import { CollaborationService } from './collaboration.service';
import { CollaborationGateway } from './collaboration.gateway';
import { EventBusModule } from 'src/event-bus/event-bus.module';

@Module({
  providers: [CollaborationResolver, CollaborationService, CollaborationGateway],
  imports: [EventBusModule],
  exports: [CollaborationService],
})
export class CollaborationModule {}