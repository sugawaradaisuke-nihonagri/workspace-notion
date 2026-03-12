/**
 * y-websocket server — standalone WebSocket server for Yjs CRDT sync.
 *
 * Run: pnpm ws:dev
 *
 * Each page gets its own Y.Doc keyed by room name "page:{pageId}".
 * Documents are persisted to Neon PostgreSQL (yjs_documents table).
 */

import "dotenv/config";
import { WebSocketServer, WebSocket } from "ws";
import { neon } from "@neondatabase/serverless";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

// --- Constants ---

const PORT = parseInt(process.env.WS_PORT ?? "4444", 10);
const PERSIST_DEBOUNCE_MS = 2000;

const messageSync = 0;
const messageAwareness = 1;

// --- Database ---

const sql = neon(process.env.DATABASE_URL!);

/** Extract pageId from room name "page:{uuid}" */
function pageIdFromRoom(roomName: string): string | null {
  if (roomName.startsWith("page:")) {
    return roomName.slice(5);
  }
  return null;
}

/** Load persisted Y.Doc state from DB */
async function loadDocState(pageId: string): Promise<Uint8Array | null> {
  const rows = await sql`
    SELECT state FROM yjs_documents WHERE page_id = ${pageId}
  `;
  if (rows.length > 0 && rows[0].state) {
    // Neon returns bytea as a Buffer-like hex string; convert to Uint8Array
    const buf = rows[0].state;
    if (buf instanceof Buffer || buf instanceof Uint8Array) {
      return new Uint8Array(buf);
    }
    // If it's a hex string like "\\x..."
    if (typeof buf === "string") {
      const hex = buf.startsWith("\\x") ? buf.slice(2) : buf;
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
      }
      return bytes;
    }
  }
  return null;
}

/** Save Y.Doc state to DB (upsert) */
async function saveDocState(pageId: string, state: Uint8Array): Promise<void> {
  const buf = Buffer.from(state);
  await sql`
    INSERT INTO yjs_documents (page_id, state, updated_at)
    VALUES (${pageId}, ${buf}, NOW())
    ON CONFLICT (page_id)
    DO UPDATE SET state = ${buf}, updated_at = NOW()
  `;
}

// --- Document store ---

interface YRoom {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, Set<number>>;
  persistTimer: ReturnType<typeof setTimeout> | null;
  pageId: string | null;
}

const rooms = new Map<string, YRoom>();

/** Schedule a debounced persist for this room */
function schedulePersist(room: YRoom): void {
  if (!room.pageId) return;
  if (room.persistTimer) {
    clearTimeout(room.persistTimer);
  }
  room.persistTimer = setTimeout(async () => {
    room.persistTimer = null;
    if (!room.pageId) return;
    try {
      const state = Y.encodeStateAsUpdate(room.doc);
      await saveDocState(room.pageId, state);
    } catch (err) {
      console.error(`[persist] Failed to save ${room.pageId}:`, err);
    }
  }, PERSIST_DEBOUNCE_MS);
}

/** Flush pending persist immediately (for shutdown) */
async function flushPersist(room: YRoom): Promise<void> {
  if (room.persistTimer) {
    clearTimeout(room.persistTimer);
    room.persistTimer = null;
  }
  if (!room.pageId) return;
  try {
    const state = Y.encodeStateAsUpdate(room.doc);
    await saveDocState(room.pageId, state);
  } catch (err) {
    console.error(`[persist] Flush failed for ${room.pageId}:`, err);
  }
}

async function getOrCreateRoom(name: string): Promise<YRoom> {
  const existing = rooms.get(name);
  if (existing) return existing;

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);
  awareness.setLocalState(null);

  const pageId = pageIdFromRoom(name);
  const room: YRoom = {
    doc,
    awareness,
    conns: new Map(),
    persistTimer: null,
    pageId,
  };
  rooms.set(name, room);

  // Load persisted state from DB
  if (pageId) {
    try {
      const state = await loadDocState(pageId);
      if (state && state.length > 0) {
        Y.applyUpdate(doc, state);
        console.log(
          `[persist] Loaded state for ${pageId} (${state.length} bytes)`,
        );
      }
    } catch (err) {
      console.error(`[persist] Failed to load ${pageId}:`, err);
    }
  }

  // Persist on doc updates (debounced)
  doc.on("update", () => {
    schedulePersist(room);
  });

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

// Cleanup empty rooms — flush to DB before destroying
setInterval(async () => {
  for (const [name, room] of rooms) {
    if (room.conns.size === 0) {
      await flushPersist(room);
      room.awareness.destroy();
      room.doc.destroy();
      rooms.delete(name);
      console.log(`[room] Cleaned up ${name}`);
    }
  }
}, 30_000);

// --- WebSocket server ---

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", async (ws, req) => {
  const roomName = req.url?.slice(1) ?? "default";
  const room = await getOrCreateRoom(roomName);

  const trackedIds = new Set<number>();
  room.conns.set(ws, trackedIds);

  // --- Send initial sync step 1 + full doc state ---
  {
    // Step 1: request client's state vector
    const enc1 = encoding.createEncoder();
    encoding.writeVarUint(enc1, messageSync);
    syncProtocol.writeSyncStep1(enc1, room.doc);
    ws.send(encoding.toUint8Array(enc1));

    // Step 2: send full doc state immediately so client can mark as synced
    const enc2 = encoding.createEncoder();
    encoding.writeVarUint(enc2, messageSync);
    syncProtocol.writeSyncStep2(enc2, room.doc);
    ws.send(encoding.toUint8Array(enc2));
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
        const syncMsgType = syncProtocol.readSyncMessage(
          decoder,
          encoder,
          room.doc,
          ws,
        );
        // Only reply to sync step 1 (server sends sync step 2 back)
        // Sync step 2 and updates don't need a reply
        if (syncMsgType === 0) {
          ws.send(encoding.toUint8Array(encoder));
        }
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
    if (origin === ws) return;
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

    awarenessProtocol.removeAwarenessStates(
      room.awareness,
      Array.from(trackedIds),
      "client disconnected",
    );
  });
});

// --- Graceful shutdown ---
async function shutdown() {
  console.log("[y-websocket] Shutting down, flushing all rooms...");
  const flushes: Promise<void>[] = [];
  for (const room of rooms.values()) {
    flushes.push(flushPersist(room));
  }
  await Promise.allSettled(flushes);
  wss.close();
  console.log("[y-websocket] Shutdown complete");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`[y-websocket] listening on ws://localhost:${PORT}`);
