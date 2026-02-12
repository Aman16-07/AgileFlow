import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${SOCKET_URL}/realtime`, {
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}

// Helper to join a room
export function joinSpace(spaceId: string) {
  getSocket().emit('join:space', spaceId);
}

export function leaveSpace(spaceId: string) {
  getSocket().emit('leave:space', spaceId);
}

export function joinBoard(boardId: string) {
  getSocket().emit('join:board', boardId);
}

export function leaveBoard(boardId: string) {
  getSocket().emit('leave:board', boardId);
}

export function joinTask(taskId: string) {
  getSocket().emit('join:task', taskId);
}

export function leaveTask(taskId: string) {
  getSocket().emit('leave:task', taskId);
}
