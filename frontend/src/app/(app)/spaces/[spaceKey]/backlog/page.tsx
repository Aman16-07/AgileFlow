'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSpaceStore } from '@/stores/space-store';
import { useUIStore } from '@/stores/ui-store';
import { api } from '@/lib/api';
import type { Sprint, Task } from '@/types';
import { issueTypeConfig, priorityConfig, getInitials, cn } from '@/lib/utils';
import { Plus, Play, CheckCircle2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';

export default function BacklogPage() {
  const { currentSpace } = useSpaceStore();
  const { openTaskDetail } = useUIStore();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingSprintName, setCreatingSprintName] = useState('');
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [expandedSprints, setExpandedSprints] = useState<Set<string>>(new Set());
  const [createTaskSprintId, setCreateTaskSprintId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const loadData = useCallback(async () => {
    if (!currentSpace) return;
    try {
      const [sprintRes, taskRes] = await Promise.all([
        api.get(`/spaces/${currentSpace.id}/sprints`),
        api.get(`/tasks`, { params: { spaceId: currentSpace.id, sprintId: 'backlog' } }),
      ]);
      setSprints(sprintRes.data);
      setBacklogTasks(taskRes.data.items || []);

      // Auto-expand active sprint
      const active = sprintRes.data.find((s: Sprint) => s.status === 'ACTIVE');
      if (active) {
        setExpandedSprints(new Set([active.id, 'backlog']));
      } else {
        setExpandedSprints(new Set(['backlog']));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentSpace]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSprint = async () => {
    if (!creatingSprintName.trim() || !currentSpace) return;
    try {
      await api.post(`/spaces/${currentSpace.id}/sprints`, { name: creatingSprintName.trim() });
      setCreatingSprintName('');
      setShowCreateSprint(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    try {
      await api.post(`/spaces/${currentSpace!.id}/sprints/${sprintId}/start`);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to start sprint');
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    try {
      await api.post(`/spaces/${currentSpace!.id}/sprints/${sprintId}/complete`);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to complete sprint');
    }
  };

  const handleCreateTask = async (sprintId: string | null) => {
    if (!newTaskTitle.trim() || !currentSpace) return;

    // Get first workflow status
    const statusesRes = await api.get(`/spaces/${currentSpace.id}/workflows/statuses`);
    const firstStatus = statusesRes.data[0];

    try {
      await api.post('/tasks', {
        spaceId: currentSpace.id,
        statusId: firstStatus.id,
        title: newTaskTitle.trim(),
        sprintId,
      });
      setNewTaskTitle('');
      setCreateTaskSprintId(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSprint = (id: string) => {
    setExpandedSprints((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getSprintPoints = (sprint: Sprint) => {
    return sprint.tasks?.reduce((sum, t) => sum + (t.storyPoints || 0), 0) || 0;
  };

  if (loading || !currentSpace) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Backlog</h2>
        <button
          onClick={() => setShowCreateSprint(true)}
          className="btn-primary text-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Create Sprint
        </button>
      </div>

      {/* Create Sprint Form */}
      {showCreateSprint && (
        <div className="card p-4 mb-4">
          <input
            autoFocus
            value={creatingSprintName}
            onChange={(e) => setCreatingSprintName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateSprint();
              if (e.key === 'Escape') setShowCreateSprint(false);
            }}
            placeholder="Sprint name..."
            className="input-field mb-3"
          />
          <div className="flex gap-2">
            <button onClick={handleCreateSprint} className="btn-primary text-sm">Create</button>
            <button onClick={() => setShowCreateSprint(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Sprints */}
      <div className="space-y-3">
        {sprints.map((sprint) => (
          <SprintSection
            key={sprint.id}
            sprint={sprint}
            expanded={expandedSprints.has(sprint.id)}
            onToggle={() => toggleSprint(sprint.id)}
            onTaskClick={openTaskDetail}
            onStartSprint={() => handleStartSprint(sprint.id)}
            onCompleteSprint={() => handleCompleteSprint(sprint.id)}
            totalPoints={getSprintPoints(sprint)}
            isCreatingTask={createTaskSprintId === sprint.id}
            onStartCreateTask={() => setCreateTaskSprintId(sprint.id)}
            onCancelCreateTask={() => { setCreateTaskSprintId(null); setNewTaskTitle(''); }}
            newTaskTitle={newTaskTitle}
            onNewTaskTitleChange={setNewTaskTitle}
            onCreateTask={() => handleCreateTask(sprint.id)}
          />
        ))}

        {/* Backlog (unassigned to sprint) */}
        <BacklogSection
          tasks={backlogTasks}
          expanded={expandedSprints.has('backlog')}
          onToggle={() => toggleSprint('backlog')}
          onTaskClick={openTaskDetail}
          isCreatingTask={createTaskSprintId === 'backlog'}
          onStartCreateTask={() => setCreateTaskSprintId('backlog')}
          onCancelCreateTask={() => { setCreateTaskSprintId(null); setNewTaskTitle(''); }}
          newTaskTitle={newTaskTitle}
          onNewTaskTitleChange={setNewTaskTitle}
          onCreateTask={() => handleCreateTask(null)}
        />
      </div>
    </div>
  );
}

// ── Sprint Section ─────────────────────────────────────────

function SprintSection({
  sprint,
  expanded,
  onToggle,
  onTaskClick,
  onStartSprint,
  onCompleteSprint,
  totalPoints,
  isCreatingTask,
  onStartCreateTask,
  onCancelCreateTask,
  newTaskTitle,
  onNewTaskTitleChange,
  onCreateTask,
}: {
  sprint: Sprint;
  expanded: boolean;
  onToggle: () => void;
  onTaskClick: (id: string) => void;
  onStartSprint: () => void;
  onCompleteSprint: () => void;
  totalPoints: number;
  isCreatingTask: boolean;
  onStartCreateTask: () => void;
  onCancelCreateTask: () => void;
  newTaskTitle: string;
  onNewTaskTitleChange: (v: string) => void;
  onCreateTask: () => void;
}) {
  const statusColors: Record<string, string> = {
    PLANNED: 'text-gray-500 bg-gray-100',
    ACTIVE: 'text-blue-600 bg-blue-50',
    COMPLETED: 'text-green-600 bg-green-50',
  };

  return (
    <div className="card overflow-hidden">
      {/* Header — uses div role="button" to avoid nested <button> hydration error */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer select-none"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        <span className="font-semibold text-gray-900">{sprint.name}</span>
        <span className={cn('badge text-xs', statusColors[sprint.status])}>
          {sprint.status}
        </span>
        <span className="text-xs text-gray-400">{sprint.tasks?.length || 0} issues</span>
        <span className="text-xs text-gray-400">{totalPoints} points</span>

        <div className="ml-auto flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {sprint.status === 'PLANNED' && (
            <button onClick={onStartSprint} className="btn-primary text-xs py-1 px-3">
              <Play className="w-3 h-3 mr-1" />
              Start
            </button>
          )}
          {sprint.status === 'ACTIVE' && (
            <button onClick={onCompleteSprint} className="btn-secondary text-xs py-1 px-3">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Complete
            </button>
          )}
        </div>
      </div>

      {/* Tasks */}
      {expanded && (
        <div className="border-t border-gray-100">
          {sprint.tasks?.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No tasks in this sprint. Drag tasks here or create new ones.
            </div>
          ) : (
            sprint.tasks?.map((task) => (
              <BacklogTaskRow key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
            ))
          )}

          {/* Inline create */}
          {isCreatingTask ? (
            <div className="px-4 py-3 border-t border-gray-100">
              <input
                autoFocus
                value={newTaskTitle}
                onChange={(e) => onNewTaskTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onCreateTask();
                  if (e.key === 'Escape') onCancelCreateTask();
                }}
                placeholder="Task title..."
                className="input-field mb-2"
              />
              <div className="flex gap-2">
                <button onClick={onCreateTask} className="btn-primary text-xs py-1 px-3">Create</button>
                <button onClick={onCancelCreateTask} className="btn-ghost text-xs">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={onStartCreateTask}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-t border-gray-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create task
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Backlog Section ────────────────────────────────────────

function BacklogSection({
  tasks,
  expanded,
  onToggle,
  onTaskClick,
  isCreatingTask,
  onStartCreateTask,
  onCancelCreateTask,
  newTaskTitle,
  onNewTaskTitleChange,
  onCreateTask,
}: {
  tasks: Task[];
  expanded: boolean;
  onToggle: () => void;
  onTaskClick: (id: string) => void;
  isCreatingTask: boolean;
  onStartCreateTask: () => void;
  onCancelCreateTask: () => void;
  newTaskTitle: string;
  onNewTaskTitleChange: (v: string) => void;
  onCreateTask: () => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer select-none"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        <span className="font-semibold text-gray-700">Backlog</span>
        <span className="text-xs text-gray-400">{tasks.length} issues</span>
      </div>

      {expanded && (
        <div className="border-t border-gray-100">
          {tasks.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Backlog is empty
            </div>
          ) : (
            tasks.map((task) => (
              <BacklogTaskRow key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
            ))
          )}

          {isCreatingTask ? (
            <div className="px-4 py-3 border-t border-gray-100">
              <input
                autoFocus
                value={newTaskTitle}
                onChange={(e) => onNewTaskTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onCreateTask();
                  if (e.key === 'Escape') onCancelCreateTask();
                }}
                placeholder="Task title..."
                className="input-field mb-2"
              />
              <div className="flex gap-2">
                <button onClick={onCreateTask} className="btn-primary text-xs py-1 px-3">Create</button>
                <button onClick={onCancelCreateTask} className="btn-ghost text-xs">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={onStartCreateTask}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-t border-gray-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create task
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Task Row (Backlog style) ───────────────────────────────

function BacklogTaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors border-t border-gray-50 text-left cursor-pointer"
    >
      <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0 cursor-grab" />
      <span className="text-sm flex-shrink-0">{issueTypeConfig[task.type]?.icon}</span>
      <span className="text-xs font-mono text-gray-400 w-20 flex-shrink-0">{task.key}</span>
      <span className="text-sm text-gray-900 flex-1 truncate">{task.title}</span>

      {task.storyPoints !== null && task.storyPoints !== undefined && (
        <span className="badge bg-gray-100 text-gray-600 text-2xs">{task.storyPoints}</span>
      )}

      {task.priority !== 'NONE' && (
        <span className="text-sm">{priorityConfig[task.priority]?.icon}</span>
      )}

      {task.status && (
        <span
          className="badge text-white text-2xs"
          style={{ backgroundColor: task.status.color }}
        >
          {task.status.name}
        </span>
      )}

      {task.assignee && (
        <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-2xs font-medium text-brand-700 flex-shrink-0">
          {getInitials(task.assignee.displayName)}
        </div>
      )}
    </div>
  );
}
