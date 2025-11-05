import { Module } from '@nestjs/common';
import { EventBusModule } from '../event-bus/event-bus.module';
import { QuestionsResolver } from './questions.resolver';
import { QuestionsService } from './questions.service';

@Module({
  imports: [EventBusModule],
  providers: [QuestionsResolver, QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
