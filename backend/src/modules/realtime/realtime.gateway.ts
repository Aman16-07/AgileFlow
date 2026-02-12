import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

/**
 * Realtime Gateway — Handles WebSocket connections for live updates.
 *
 * Events:
 * - task:moved     → broadcast when task is dragged to a new column
 * - task:updated   → broadcast when task fields change
 * - task:created   → broadcast when new task is created
 * - task:deleted   → broadcast when task is removed
 * - comment:added  → broadcast when comment is posted
 *
 * Rooms:
 * - space:{spaceId}  → all members of a space receive updates
 * - board:{boardId}  → board-specific updates
 * - task:{taskId}    → task detail panel live updates
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('RealtimeGateway');

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ── Room Management ──────────────────────────────

  @SubscribeMessage('join:space')
  handleJoinSpace(@ConnectedSocket() client: Socket, @MessageBody() spaceId: string) {
    client.join(`space:${spaceId}`);
    this.logger.debug(`Client ${client.id} joined space:${spaceId}`);
  }

  @SubscribeMessage('leave:space')
  handleLeaveSpace(@ConnectedSocket() client: Socket, @MessageBody() spaceId: string) {
    client.leave(`space:${spaceId}`);
  }

  @SubscribeMessage('join:board')
  handleJoinBoard(@ConnectedSocket() client: Socket, @MessageBody() boardId: string) {
    client.join(`board:${boardId}`);
  }

  @SubscribeMessage('leave:board')
  handleLeaveBoard(@ConnectedSocket() client: Socket, @MessageBody() boardId: string) {
    client.leave(`board:${boardId}`);
  }

  @SubscribeMessage('join:task')
  handleJoinTask(@ConnectedSocket() client: Socket, @MessageBody() taskId: string) {
    client.join(`task:${taskId}`);
  }

  @SubscribeMessage('leave:task')
  handleLeaveTask(@ConnectedSocket() client: Socket, @MessageBody() taskId: string) {
    client.leave(`task:${taskId}`);
  }

  // ── Broadcast Methods (called from services) ────

  emitTaskMoved(spaceId: string, payload: {
    taskId: string;
    fromStatusId: string;
    toStatusId: string;
    position: number;
    task: any;
  }) {
    this.server.to(`space:${spaceId}`).emit('task:moved', payload);
  }

  emitTaskUpdated(spaceId: string, taskId: string, payload: any) {
    this.server.to(`space:${spaceId}`).emit('task:updated', { taskId, ...payload });
    this.server.to(`task:${taskId}`).emit('task:updated', { taskId, ...payload });
  }

  emitTaskCreated(spaceId: string, task: any) {
    this.server.to(`space:${spaceId}`).emit('task:created', task);
  }

  emitTaskDeleted(spaceId: string, taskId: string) {
    this.server.to(`space:${spaceId}`).emit('task:deleted', { taskId });
  }

  emitCommentAdded(taskId: string, comment: any) {
    this.server.to(`task:${taskId}`).emit('comment:added', comment);
  }

  emitSprintUpdated(spaceId: string, sprint: any) {
    this.server.to(`space:${spaceId}`).emit('sprint:updated', sprint);
  }
}
