/**
 * y-websocket server — standalone WebSocket server for Yjs CRDT sync.
 *
 * Run: pnpm ws:dev
 *
 * Each page gets its own Y.Doc keyed by room name "page:{pageId}".
 * Documents are held in memory; persistence (to Neon) will be added later.
 */

import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

// --- Constants ---

const PORT = parseInt(process.env.WS_PORT ?? "4444", 10);

const messageSync = 0;
const messageAwareness = 1;

// --- Document store ---

interface YRoom {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, Set<number>>; // ws → tracked awareness client IDs
}

const rooms = new Map<string, YRoom>();

function getOrCreateRoom(name: string): YRoom {
  const existing = rooms.get(name);
  if (existing) return existing;

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);

  // Remove awareness state when client disconnects
  awareness.setLocalState(null);

  const room: YRoom = { doc, awareness, conns: new Map() };
  rooms.set(name, room);

  awareness.on(
    "update",
    (
      {
        added,
        updated,
        removed,
      }: { added: number[]; updated: number[]; removed: number[] },
      _origin: unknown,
    ) => {
      const changedClients = [...added, ...updated, ...removed];
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
      );
      const msg = encoding.toUint8Array(encoder);
      broadcastToRoom(room, msg, null);
    },
  );

  return room;
}

function broadcastToRoom(
  room: YRoom,
  msg: Uint8Array,
  exclude: WebSocket | null,
): void {
  room.conns.forEach((_clientIds, ws) => {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

// Cleanup empty rooms periodically
setInterval(() => {
  rooms.forEach((room, name) => {
    if (room.conns.size === 0) {
      room.awareness.destroy();
      room.doc.destroy();
      rooms.delete(name);
    }
  });
}, 30_000);

// --- WebSocket server ---

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws, req) => {
  // Room name from URL path: /page:{pageId}
  const roomName = req.url?.slice(1) ?? "default";
  const room = getOrCreateRoom(roomName);

  const trackedIds = new Set<number>();
  room.conns.set(ws, trackedIds);

  // --- Send initial sync step 1 ---
  {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, room.doc);
    ws.send(encoding.toUint8Array(encoder));
  }

  // --- Send current awareness states ---
  {
    const states = room.awareness.getStates();
    if (states.size > 0) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          room.awareness,
          Array.from(states.keys()),
        ),
      );
      ws.send(encoding.toUint8Array(encoder));
    }
  }

  ws.on("message", (data: ArrayBuffer | Buffer) => {
    const buf =
      data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data);
    const decoder = decoding.createDecoder(buf);
    const msgType = decoding.readVarUint(decoder);

    switch (msgType) {
      case messageSync: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, room.doc, ws);
        const reply = encoding.toUint8Array(encoder);
        // Only send reply if there's content beyond the message type header
        if (encoding.length(encoder) > 1) {
          ws.send(reply);
        }
        // Broadcast doc updates to other clients
        // (y-protocols handles this via doc 'update' event, but we also relay sync messages)
        break;
      }
      case messageAwareness: {
        const update = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(room.awareness, update, ws);
        break;
      }
    }
  });

  // Broadcast doc updates to all connected clients
  const onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === ws) return; // Don't echo back to sender
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    const msg = encoding.toUint8Array(encoder);
    broadcastToRoom(room, msg, ws);
  };
  room.doc.on("update", onDocUpdate);

  ws.on("close", () => {
    room.doc.off("update", onDocUpdate);
    room.conns.delete(ws);

    // Remove awareness state for this client
    awarenessProtocol.removeAwarenessStates(
      room.awareness,
      Array.from(trackedIds),
      "client disconnected",
    );
  });
});

console.log(`[y-websocket] listening on ws://localhost:${PORT}`);
