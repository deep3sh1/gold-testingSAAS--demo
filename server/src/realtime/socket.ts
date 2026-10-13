import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AuthSessionUser } from '../types/index.js';

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [config.clientUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // Authentication Handshake Middleware
  io.use((socket: Socket, next) => {
    try {
      let token: string | undefined = socket.handshake.auth?.token;

      if (!token && socket.handshake.headers.cookie) {
        const cookieMatches = socket.handshake.headers.cookie.match(
          new RegExp(`(^|; )${config.cookieName}=([^;]*)`)
        );
        if (cookieMatches) {
          token = cookieMatches[2];
        }
      }

      if (!token) {
        return next(new Error('Authentication error: No session token provided in socket handshake'));
      }

      const payload = jwt.verify(token, config.jwtSecret) as AuthSessionUser;
      socket.data.user = payload;
      next();
    } catch (err) {
      next(new Error(`Authentication error: ${err instanceof Error ? err.message : 'Invalid token'}`));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as AuthSessionUser;
    const orgRoom = `org_${user.organizationId}`;
    const userRoom = `user_${user.userId}`;

    // Join personal user room
    socket.join(userRoom);

    // Global tenant admins join the main org room
    if (user.role === 'SUPER_ADMIN' || user.role === 'ORGANIZATION_ADMIN') {
      socket.join(orgRoom);
    }

    // Branch staff strictly join their specific branch room
    if (user.branch) {
      const branchRoom = `org_${user.organizationId}_branch_${user.branch.toLowerCase().trim()}`;
      socket.join(branchRoom);
    }

    console.log(`[Socket.IO] Connected: ${user.name} (${user.role}) - Branch: ${user.branch || 'ALL'}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Disconnected: ${user.name}`);
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

export function emitToOrganization(organizationId: string, event: string, data: unknown, branch?: string): void {
  if (io) {
    if (branch) {
      const branchRoom = `org_${organizationId}_branch_${branch.toLowerCase().trim()}`;
      // Deliver to users in this specific branch AND to global organization admins
      io.to(branchRoom).to(`org_${organizationId}`).emit(event, data);
    } else {
      io.to(`org_${organizationId}`).emit(event, data);
    }
  }
}
