import { WebSocketServer } from 'ws';
import * as Y from 'yjs';

export class YjsServer {
  private wss: WebSocketServer;
  private documents: Map<string, Y.Doc> = new Map();

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    console.log(`Y.js WebSocket server running on port ${port}`);

    this.wss.on('error', (error) => {
      console.error('Y.js WebSocket server error:', error);
    });
  }

  /**
   * Create a new YJS document for a session
   */
  createSessionDocument(sessionId: string): Y.Doc {
    if (this.documents.has(sessionId)) {
      console.log(`YJS document already exists for session ${sessionId}`);
      return this.documents.get(sessionId)!;
    }

    const doc = new Y.Doc();
    this.documents.set(sessionId, doc);
    console.log(`Created YJS document for session ${sessionId}`);
    return doc;
  }

  /**
   * Get an existing YJS document
   */
  getSessionDocument(sessionId: string): Y.Doc | undefined {
    return this.documents.get(sessionId);
  }

  /**
   * Remove a YJS document
   */
  removeSessionDocument(sessionId: string): boolean {
    const doc = this.documents.get(sessionId);
    if (doc) {
      doc.destroy();
      this.documents.delete(sessionId);
      console.log(`Removed YJS document for session ${sessionId}`);
      return true;
    }
    return false;
  }

  close() {
    // Clean up all documents
    for (const [sessionId, doc] of this.documents.entries()) {
      doc.destroy();
      console.log(`Destroyed YJS document for session ${sessionId}`);
    }
    this.documents.clear();
    this.wss.close();
  }
}

