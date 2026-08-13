"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getRealtimeSocket } from "@/lib/realtime";

/**
 * Joins the realtime room for `tenantId` (or the platform-wide room when
 * omitted) and invalidates queries on every device update. The socket
 * previously never emitted a `subscribe.*` message at all — connected but
 * sat in no room, so server broadcasts never reached any client. Re-joins
 * on reconnect since Socket.IO rooms don't survive a transport drop.
 */
export function useLiveDeviceStatus(tenantId?: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket) return;

    const subscribe = () => {
      if (tenantId) {
        socket.emit("subscribe.tenant", { tenantId });
      } else {
        socket.emit("subscribe.platform");
      }
    };

    const onStatus = () => {
      void qc.invalidateQueries({ queryKey: ["devices"] });
      void qc.invalidateQueries({ queryKey: ["tenants", "ops-overview"] });
      if (tenantId) {
        void qc.invalidateQueries({
          queryKey: ["analytics", "overview", tenantId],
        });
      }
    };

    socket.on("connect", subscribe);
    socket.on("device.status", onStatus);
    socket.on("device.event", onStatus);
    if (socket.connected) subscribe();

    return () => {
      socket.off("connect", subscribe);
      socket.off("device.status", onStatus);
      socket.off("device.event", onStatus);
    };
  }, [qc, tenantId]);
}
