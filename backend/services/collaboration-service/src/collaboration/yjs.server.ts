import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import { setupWSConnection } from 'y-websocket/bin/utils';

export class YjsServer {
  private wss: WebSocketServer;
  private docs: Map<string, Y.Doc> = new Map();

  constructor(port: number = 1234) {
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

