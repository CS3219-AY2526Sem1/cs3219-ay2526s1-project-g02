import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import { setupWSConnection } from 'y-websocket/bin/utils';

// Use environment variable or fallback to default port
const DEFAULT_YJS_PORT = process.env.YJS_SERVER_PORT ? parseInt(process.env.YJS_SERVER_PORT, 10) : 1234;

export class YjsServer {
  private wss: WebSocketServer;
  private docs: Map<string, Y.Doc> = new Map();

  constructor(port: number = DEFAULT_YJS_PORT) {
    this.wss = new WebSocketServer({ port });
    console.log(`Y.js WebSocket server running on port ${port}`);

    this.wss.on('connection', (ws, req) => {
      console.log('New Y.js WebSocket connection');
      setupWSConnection(ws, req, {
        gc: true,
        // Callback when document is created or retrieved
        docName: this.getDocName(req.url),
      });
    });

    this.wss.on('error', (error) => {
      console.error('Y.js WebSocket server error:', error);
    });
  }

  private getDocName(url: string | undefined): string {
    // Extract document name from URL path (e.g., /sessionId)
    if (!url) return 'default';
    const match = url.match(/\/([^?]+)/);
    return match ? match[1] : 'default';
  }

  getDoc(docName: string): Y.Doc {
    if (!this.docs.has(docName)) {
      const doc = new Y.Doc();
      this.docs.set(docName, doc);
      
      doc.on('update', (update: Uint8Array) => {
        console.log(`Document ${docName} updated`);
      });
    }
    return this.docs.get(docName)!;
  }

  close() {
    this.wss.close();
    this.docs.clear();
  }
}

