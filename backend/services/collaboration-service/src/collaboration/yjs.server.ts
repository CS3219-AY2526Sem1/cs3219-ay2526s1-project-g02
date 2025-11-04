import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

const messageSync = 0;
const messageAwareness = 1;

export class YjsServer {
  private wss: WebSocketServer;
  private documents: Map<string, Y.Doc> = new Map();
  private awareness: Map<string, awarenessProtocol.Awareness> = new Map();

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    console.log(`Y.js WebSocket server running on port ${port}`);

    this.wss.on('connection', (conn: WebSocket, req) => {
      const sessionId = req.url?.slice(1);
      if (!sessionId) {
        conn.close();
        return;
      }

      const doc = this.documents.get(sessionId) || this.createSessionDocument(sessionId);
      const awareness = this.awareness.get(sessionId) || this.createAwareness(sessionId, doc);

      // Send sync step 1
      const encoderSync = encoding.createEncoder();
      encoding.writeVarUint(encoderSync, messageSync);
      syncProtocol.writeSyncStep1(encoderSync, doc);
      conn.send(encoding.toUint8Array(encoderSync), { binary: true });

      // Broadcast awareness states
      const awarenessStates = awareness.getStates();
      if (awarenessStates.size > 0) {
        const encoderAwareness = encoding.createEncoder();
        encoding.writeVarUint(encoderAwareness, messageAwareness);
        encoding.writeVarUint8Array(
          encoderAwareness,
          awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStates.keys()))
        );
        conn.send(encoding.toUint8Array(encoderAwareness), { binary: true });
      }

      // Listen for document updates and broadcast to other clients
      const updateHandler = (update: Uint8Array, origin: any) => {
        if (origin !== conn) {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, messageSync);
          syncProtocol.writeUpdate(encoder, update);
          conn.send(encoding.toUint8Array(encoder), { binary: true });
        }
      };
      doc.on('update', updateHandler);

      // Listen for awareness updates
      const awarenessUpdateHandler = ({ added, updated, removed }: any, origin: any) => {
        const changedClients = added.concat(updated).concat(removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageAwareness);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
        );
        conn.send(encoding.toUint8Array(encoder), { binary: true });
      };
      awareness.on('update', awarenessUpdateHandler);

      conn.on('message', (message: Buffer) => {
        try {
          const decoder = decoding.createDecoder(message);
          const messageType = decoding.readVarUint(decoder);

          if (messageType === messageSync) {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageSync);
            const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, doc, null);
            if (encoding.length(encoder) > 1) {
              conn.send(encoding.toUint8Array(encoder), { binary: true });
            }
          } else if (messageType === messageAwareness) {
            awarenessProtocol.applyAwarenessUpdate(
              awareness,
              decoding.readVarUint8Array(decoder),
              conn
            );
          }
        } catch (err) {
          console.error('Error handling message:', err);
        }
      });

      conn.on('close', () => {
        doc.off('update', updateHandler);
        awareness.off('update', awarenessUpdateHandler);
        awarenessProtocol.removeAwarenessStates(awareness, [doc.clientID], null);
      });
    });

    this.wss.on('error', (error) => {
      console.error('Y.js WebSocket server error:', error);
    });
  }

  private createAwareness(sessionId: string, doc: Y.Doc): awarenessProtocol.Awareness {
    const awareness = new awarenessProtocol.Awareness(doc);
    this.awareness.set(sessionId, awareness);
    return awareness;
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
    const awareness = this.awareness.get(sessionId);
    
    if (doc) {
      doc.destroy();
      this.documents.delete(sessionId);
      
      if (awareness) {
        awareness.destroy();
        this.awareness.delete(sessionId);
      }
      
      console.log(`Removed YJS document for session ${sessionId}`);
      return true;
    }
    return false;
  }

  close() {
    // Clean up all documents and awareness
    for (const [sessionId, doc] of this.documents.entries()) {
      doc.destroy();
      console.log(`Destroyed YJS document for session ${sessionId}`);
    }
    for (const [sessionId, awareness] of this.awareness.entries()) {
      awareness.destroy();
      console.log(`Destroyed awareness for session ${sessionId}`);
    }
    this.documents.clear();
    this.awareness.clear();
    this.wss.close();
  }
}

