"use client";

import { useEffect, useState } from "react";
import type { WebsocketProvider } from "y-websocket";

interface PresenceUser {
  clientId: number;
  name: string;
  color: string;
}

interface CollabPresenceBarProps {
  provider: WebsocketProvider;
}

/**
 * Shows colored dots + names of users currently editing this page.
 * Listens to Yjs awareness changes.
 */
export function CollabPresenceBar({ provider }: CollabPresenceBarProps) {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const awareness = provider.awareness;

    const updateUsers = () => {
      const states = awareness.getStates();
      const localId = awareness.clientID;
      const result: PresenceUser[] = [];

      states.forEach((state, clientId) => {
        if (clientId === localId) return;
        if (state.user) {
          result.push({
            clientId,
            name: state.user.name ?? "Anonymous",
            color: state.user.color ?? "#888",
          });
        }
      });

      setUsers(result);
    };

    awareness.on("change", updateUsers);
    updateUsers();

    return () => {
      awareness.off("change", updateUsers);
    };
  }, [provider]);

  if (users.length === 0) return null;

  return (
    <div className="mb-2 flex items-center gap-1.5">
      {users.map((u) => (
        <div
          key={u.clientId}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
          style={{ backgroundColor: u.color }}
          title={u.name}
        >
          <span
            className="inline-flex h-[14px] w-[14px] items-center justify-center rounded-full text-[9px] font-bold"
            style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
          >
            {u.name.charAt(0).toUpperCase()}
          </span>
          {u.name}
        </div>
      ))}
    </div>
  );
}
