import {
    ConnectedSocket,
    OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: true, namespace: 'match' })
export class MatchingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(MatchingGateway.name);

    // Maps active users to their active socket connections
    private activeUsers: Map<string, Socket> = new Map();

    @WebSocketServer()
    server: Server;

    handleConnection(@ConnectedSocket() client: Socket, ...args: any[]) {
        const userId = client.handshake.query.userId as string;

        if (userId) {
            this.activeUsers.set(userId, client);
            this.logger.log(`User ${userId} connected. Total active: ${this.activeUsers.size}`);
        } else {
            client.disconnect(true);
            this.logger.warn(`Connection rejected: Missing userId.`);
        }
    }

    handleDisconnect(@ConnectedSocket() client: Socket) {
        let disconnectedUserId: string;
        for (const [userId, socket] of this.activeUsers.entries()) {
            if (socket.id === client.id) {
                disconnectedUserId = userId;
                break;
            }
        }

        if (disconnectedUserId) {
            this.activeUsers.delete(disconnectedUserId);
            this.logger.log(
                `User ${disconnectedUserId} disconnected. \
                Total active: ${this.activeUsers.size}`);
        }
    }

    notifyMatchFound(userAId: string, userBId: string): void {
        const userASocket = this.activeUsers.get(userAId);
        const userBSocket = this.activeUsers.get(userBId);

        const payload = {
            matchedUserId: userBId,
        };

        if (userASocket) {
            userASocket.emit('matchFound', payload);
            this.logger.verbose(`Notified user ${userAId} of match with ${userBId}`);
        } else {
            this.logger.warn(`User A (${userAId}) not found in active connections for notification.`);
        }

        payload.matchedUserId = userAId; // Swap for user B
        
        if (userBSocket) {
            userBSocket.emit('matchFound', payload);
            this.logger.verbose(`Notified user ${userBId} of match with ${userAId}`);
        } else {
            this.logger.warn(`User B (${userBId}) not found in active connections for notification.`);
        }

    }
}