import { WebSocketServer } from 'ws';
import * as Y from 'yjs';

export class YjsServer {
  private wss: WebSocketServer;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    console.log(`Y.js WebSocket server running on port ${port}`);

    this.wss.on('error', (error) => {
      console.error('Y.js WebSocket server error:', error);
    });
  }

  close() {
    this.wss.close();
  }
}

