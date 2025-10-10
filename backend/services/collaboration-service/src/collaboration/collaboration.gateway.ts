import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CollaborationService } from './collaboration.service';

@WebSocketGateway({ cors: true })
export class CollaborationGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly collaborationService: CollaborationService) {}

  @SubscribeMessage('joinSession')
  handleJoinSession(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    client.join(data.sessionId);
    client.to(data.sessionId).emit('userJoined', { userId: data.userId });
  }

  @SubscribeMessage('codeChange')
  async handleCodeChange(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    await this.collaborationService.updateCode(data.sessionId, data.code);
    client.to(data.sessionId).emit('codeUpdate', { code: data.code, userId: data.userId });
  }

  @SubscribeMessage('chatMessage')
  handleChatMessage(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.server.to(data.sessionId).emit('newMessage', {
      userId: data.userId,
      message: data.message,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('leaveSession')
  handleLeaveSession(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    client.leave(data.sessionId);
    client.to(data.sessionId).emit('userLeft', { userId: data.userId });
  }
}
