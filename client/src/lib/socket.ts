'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// Safe mock socket for environments like Vercel Serverless where WebSockets aren't hosted
class NoopSocket {
  on() { return this; }
  off() { return this; }
  emit() { return this; }
  disconnect() {}
}

export function getSocket(): Socket {
  if (typeof window === 'undefined') {
    return new NoopSocket() as unknown as Socket;
  }

  if (!socket) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';

    // If socketUrl is empty or points to a Vercel serverless deployment, WebSockets are not supported
    if (!socketUrl || socketUrl.includes('vercel.app')) {
      return new NoopSocket() as unknown as Socket;
    }

    const token = localStorage.getItem('goldscope_token') || '';

    try {
      socket = io(socketUrl, {
        auth: { token },
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 3000,
      });

      socket.on('connect', () => {
        console.log('⚡ Socket.IO Connected to GOLDSCOPE Realtime Server');
      });

      socket.on('connect_error', () => {
        console.warn('⚠️ Realtime socket unavailable, falling back to auto-polling');
      });
    } catch {
      return new NoopSocket() as unknown as Socket;
    }
  }

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
