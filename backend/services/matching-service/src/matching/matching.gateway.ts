import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { MatchingService } from './matching.service';

@WebSocketGateway({ cors: true })
export class MatchingGateway {
  constructor(private readonly matchingService: MatchingService) {}

  @SubscribeMessage('joinQueue')
  async handleJoinQueue(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const match = await this.matchingService.createMatchRequest(data.userId, data.preferences);
    client.emit('queueJoined', match);
  }

  @SubscribeMessage('leaveQueue')
  handleLeaveQueue(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    client.emit('queueLeft', { userId: data.userId });
  }
}
