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
        // TODO: Authenticate user
        
        const userId = client.handshake.auth.userId as string;

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
                `User ${disconnectedUserId} disconnected. Total active: ${this.activeUsers.size}`);
        }
    }

    notifyMatchFound(userAId: string, userBId: string, matchId: string): void {
        const userASocket = this.activeUsers.get(userAId);
        const userBSocket = this.activeUsers.get(userBId);

        const payloadA = {
            matchedUserId: userBId,
            matchId: matchId,
        };

        const payloadB = {
            matchedUserId: userAId,
            matchId: matchId,
        }

        if (userASocket) {
            userASocket.emit('matchFound', payloadA);
            this.logger.log(`Notified user ${userAId} of match with ${userBId}`);
        } else {
            this.logger.warn(`User A (${userAId}) not found in active connections for notification.`);
        }
        
        if (userBSocket) {
            userBSocket.emit('matchFound', payloadB);
            this.logger.log(`Notified user ${userBId} of match with ${userAId}`);
        } else {
            this.logger.warn(`User B (${userBId}) not found in active connections for notification.`);
        }
    }

    notifyRequestExpired(userId: string, requestId: string): void {
        const userSocket = this.activeUsers.get(userId);

        if (userSocket) {
            userSocket.emit('requestExpired', { 
                requestId: requestId,
                message: 'Your match request has expired. Please try again.',
            });
            this.logger.log(`Notified user ${userId} of expired request ${requestId}`);
        } else {
            this.logger.warn(`User ${userId} not found in active connections for expiration notification.`);
        }
    }
}