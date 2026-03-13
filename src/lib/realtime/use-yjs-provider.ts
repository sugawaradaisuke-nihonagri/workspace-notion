"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { CURSOR_COLORS } from "./cursor-colors";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "";

interface UseYjsProviderOptions {
  /** Unique room name — typically "page:{pageId}" */
  roomName: string;
  /** Current user info for awareness/cursors */
  user: { id: string; name: string };
  /** Set to false to disable the provider (e.g. when pageId is not yet available) */
  enabled?: boolean;
}

interface UseYjsProviderReturn {
  ydoc: Y.Doc;
  provider: WebsocketProvider | null;
  connected: boolean;
}

/**
 * React hook that manages a Y.Doc + WebsocketProvider per room.
 * Creates and destroys resources on mount/unmount.
 */
export function useYjsProvider({
  roomName,
  user,
  enabled = true,
}: UseYjsProviderOptions): UseYjsProviderReturn {
  const ydocRef = useRef<Y.Doc | null>(null);
  const [connected, setConnected] = useState(false);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);

  // Stable ydoc per room
  const ydoc = useMemo(() => {
    if (ydocRef.current) {
      ydocRef.current.destroy();
    }
    const doc = new Y.Doc();
    ydocRef.current = doc;
    return doc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName]);

  useEffect(() => {
    if (!enabled || !WS_URL) return;

    const wsProvider = new WebsocketProvider(WS_URL, roomName, ydoc, {
      connect: true,
    });

    // Pick a color based on a hash of the user ID
    const colorIdx =
      user.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
      CURSOR_COLORS.length;
    const cursorColor = CURSOR_COLORS[colorIdx];

    wsProvider.awareness.setLocalStateField("user", {
      name: user.name,
      color: cursorColor.color,
      colorLight: cursorColor.light,
    });

    wsProvider.on("status", ({ status }: { status: string }) => {
      setConnected(status === "connected");
    });

    setProvider(wsProvider);

    return () => {
      wsProvider.disconnect();
      wsProvider.destroy();
      setProvider(null);
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, enabled, ydoc]);

  return { ydoc, provider, connected };
}
