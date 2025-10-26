import { WebSocketServer } from 'ws';
import * as Y from 'yjs';

// Use environment variable or fallback to default port
const DEFAULT_YJS_PORT = process.env.YJS_SERVER_PORT ? parseInt(process.env.YJS_SERVER_PORT, 10) : 1234;

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

