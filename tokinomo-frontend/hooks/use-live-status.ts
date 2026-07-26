"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getRealtimeSocket } from "@/lib/realtime";

export function useLiveDeviceStatus(tenantId?: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket) return;

    const onStatus = () => {
      void qc.invalidateQueries({ queryKey: ["devices"] });
      if (tenantId) {
        void qc.invalidateQueries({
          queryKey: ["analytics", "overview", tenantId],
        });
      }
    };

    socket.on("device.status", onStatus);
    socket.on("device.event", onStatus);

    return () => {
      socket.off("device.status", onStatus);
      socket.off("device.event", onStatus);
    };
  }, [qc, tenantId]);
}
