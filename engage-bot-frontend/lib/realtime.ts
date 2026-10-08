"use client";

import { io, type Socket } from "socket.io-client";
import { env } from "@/lib/env";

let socket: Socket | null = null;

export function getRealtimeSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  if (!socket) {
    // Socket.IO talks directly to the API host (WS can't use Next rewrites easily)
    socket = io(env.NEXT_PUBLIC_API_URL, {
      withCredentials: true,
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}
