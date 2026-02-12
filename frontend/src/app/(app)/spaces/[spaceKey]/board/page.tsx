'use client';

import { useEffect, useCallback, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSpaceStore } from '@/stores/space-store';
import { useBoardStore } from '@/stores/board-store';
import { useUIStore } from '@/stores/ui-store';
import { getSocket } from '@/lib/socket';
import type { Task, BoardColumn } from '@/types';
import { issueTypeConfig, priorityConfig, getInitials, cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';

export default function BoardPage() {
  const { currentSpace } = useSpaceStore();
  const { columns, isLoading, fetchBoardView, moveTaskOptimistic, persistTaskMove, addTask, updateTaskInBoard, removeTask } = useBoardStore();
  const { openTaskDetail } = useUIStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [createTaskColumn, setCreateTaskColumn] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    if (currentSpace?.id) {
      fetchBoardView(currentSpace.id);
    }
  }, [currentSpace?.id, fetchBoardView]);

  // Socket.io realtime listeners
  useEffect(() => {
    const socket = getSocket();

    socket.on('task:moved', (data: any) => {
      updateTaskInBoard(data.task);
    });
    socket.on('task:created', (task: Task) => {
      addTask(task);
    });
    socket.on('task:updated', (data: any) => {
      updateTaskInBoard(data);
    });
    socket.on('task:deleted', (data: { taskId: string }) => {
      removeTask(data.taskId);
    });

    return () => {
      socket.off('task:moved');
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:deleted');
    };
  }, [addTask, updateTaskInBoard, removeTask]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskId = event.active.id as string;
    // Find the task in columns
    for (const col of columns) {
      const task = col.tasks.find((t) => t.id === taskId);
      if (task) {
        setActiveTask(task);
        break;
      }
    }
  }, [columns]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;

      const taskId = active.id as string;
      const overId = over.id as string;

      // Determine target column and index
      let targetColumnId: string | null = null;
      let targetIndex = 0;

      // Check if dropped on a column header
      const isColumn = columns.find((c) => c.id === overId);
      if (isColumn) {
        targetColumnId = overId;
        targetIndex = isColumn.tasks.length;
      } else {
        // Dropped on another task — find its column
        for (const col of columns) {
          const idx = col.tasks.findIndex((t) => t.id === overId);
          if (idx !== -1) {
            targetColumnId = col.id;
            targetIndex = idx;
            break;
          }
        }
      }

      if (!targetColumnId) return;

      // Find source column
      let sourceColumnId: string | null = null;
      for (const col of columns) {
        if (col.tasks.find((t) => t.id === taskId)) {
          sourceColumnId = col.id;
          break;
        }
      }

      if (!sourceColumnId) return;

      // Optimistic update
      moveTaskOptimistic(taskId, sourceColumnId, targetColumnId, targetIndex);

      // Persist to backend
      await persistTaskMove(taskId, targetColumnId, targetIndex);
    },
    [columns, moveTaskOptimistic, persistTaskMove],
  );

  const handleCreateTask = async (columnId: string) => {
    if (!newTaskTitle.trim() || !currentSpace) return;

    try {
      const { data: task } = await api.post('/tasks', {
        spaceId: currentSpace.id,
        statusId: columnId,
        title: newTaskTitle.trim(),
      });
      addTask(task);
      setNewTaskTitle('');
      setCreateTaskColumn(null);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  if (isLoading || !currentSpace) {
    return (
      <div className="p-8">
        <div className="flex gap-4 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-72 h-96 bg-gray-100 rounded-xl flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-x-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 items-start min-w-max">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              onTaskClick={openTaskDetail}
              isCreating={createTaskColumn === column.id}
              onStartCreate={() => setCreateTaskColumn(column.id)}
              onCancelCreate={() => { setCreateTaskColumn(null); setNewTaskTitle(''); }}
              newTaskTitle={newTaskTitle}
              onNewTaskTitleChange={setNewTaskTitle}
              onCreateTask={() => handleCreateTask(column.id)}
            />
          ))}
        </div>

        {/* Drag overlay — the floating card while dragging */}
        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} isOverlay />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ── Kanban Column ──────────────────────────────────────────

function KanbanColumn({
  column,
  onTaskClick,
  isCreating,
  onStartCreate,
  onCancelCreate,
  newTaskTitle,
  onNewTaskTitleChange,
  onCreateTask,
}: {
  column: BoardColumn;
  onTaskClick: (id: string) => void;
  isCreating: boolean;
  onStartCreate: () => void;
  onCancelCreate: () => void;
  newTaskTitle: string;
  onNewTaskTitleChange: (v: string) => void;
  onCreateTask: () => void;
}) {
  const taskIds = column.tasks.map((t) => t.id);

  return (
    <div className="w-72 flex-shrink-0">
      {/* Column Header */}
      <div className="flex items-center gap-2 px-3 py-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
        <span className="text-sm font-semibold text-gray-700">{column.name}</span>
        <span className="text-xs text-gray-400 ml-auto">{column.tasks.length}</span>
      </div>

      {/* Tasks */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy} id={column.id}>
        <div className="space-y-2 min-h-[80px] rounded-xl bg-gray-50/50 p-2">
          {column.tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
          ))}

          {/* Create Task Inline */}
          {isCreating ? (
            <div className="bg-white rounded-lg border border-brand-300 p-3 shadow-sm">
              <input
                autoFocus
                value={newTaskTitle}
                onChange={(e) => onNewTaskTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onCreateTask();
                  if (e.key === 'Escape') onCancelCreate();
                }}
                placeholder="Task title..."
                className="w-full text-sm border-none outline-none placeholder-gray-400"
              />
              <div className="flex items-center gap-2 mt-2">
                <button onClick={onCreateTask} className="btn-primary text-xs py-1 px-3">
                  Create
                </button>
                <button onClick={onCancelCreate} className="btn-ghost text-xs">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onStartCreate}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add task</span>
            </button>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ── Sortable Task Card ─────────────────────────────────────

function SortableTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}

// ── Task Card ──────────────────────────────────────────────

function TaskCard({ task, onClick, isOverlay }: { task: Task; onClick?: () => void; isOverlay?: boolean }) {
  const typeConf = issueTypeConfig[task.type];
  const prioConf = priorityConfig[task.priority];

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg border p-3 cursor-pointer transition-all hover:border-brand-300',
        isOverlay ? 'shadow-xl border-brand-400 rotate-2' : 'border-gray-200 shadow-sm hover:shadow-md',
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-sm flex-shrink-0" title={typeConf?.label}>{typeConf?.icon}</span>
        <p className="text-sm text-gray-900 leading-snug flex-1 line-clamp-2">{task.title}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-2xs font-mono text-gray-400">{task.key}</span>

        {task.priority !== 'NONE' && (
          <span className="text-2xs" title={prioConf?.label}>{prioConf?.icon}</span>
        )}

        {task.storyPoints !== null && task.storyPoints !== undefined && (
          <span className="badge bg-gray-100 text-gray-600 text-2xs">{task.storyPoints} SP</span>
        )}

        {task.taskLabels?.map(({ label }) => (
          <span
            key={label.id}
            className="badge text-white text-2xs"
            style={{ backgroundColor: label.color }}
          >
            {label.name}
          </span>
        ))}

        <div className="flex-1" />

        {task.assignee && (
          <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-2xs font-medium text-brand-700">
            {getInitials(task.assignee.displayName)}
          </div>
        )}
      </div>
    </div>
  );
}
