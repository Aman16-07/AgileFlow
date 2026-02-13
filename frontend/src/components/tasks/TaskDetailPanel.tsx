'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  MessageSquare,
  Activity,
  Clock,
  User,
  Calendar,
  Tag,
  ChevronDown,
  Send,
  MoreHorizontal,
  Trash2,
  Link as LinkIcon,
  Paperclip,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { api } from '@/lib/api';
import { cn, timeAgo, priorityConfig, issueTypeConfig } from '@/lib/utils';
import type { Task, Comment, Activity as ActivityType, Priority, IssueType } from '@/types';

export function TaskDetailPanel() {
  const { selectedTaskId, closeTaskDetail } = useUIStore();
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [newComment, setNewComment] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState('');

  const fetchTask = useCallback(async () => {
    if (!selectedTaskId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/tasks/${selectedTaskId}`);
      setTask(data);
      setTitleValue(data.title);
      setDescriptionValue(data.description || '');
    } catch (err) {
      console.error('Failed to fetch task', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTaskId]);

  const fetchComments = useCallback(async () => {
    if (!selectedTaskId) return;
    try {
      const { data } = await api.get(`/tasks/${selectedTaskId}/comments`);
      setComments(data.items || data || []);
    } catch (err) {
      console.error('Failed to fetch comments', err);
    }
  }, [selectedTaskId]);

  const fetchActivities = useCallback(async () => {
    if (!selectedTaskId) return;
    try {
      const { data } = await api.get(`/activities/task/${selectedTaskId}`);
      setActivities(data.items || data || []);
    } catch (err) {
      console.error('Failed to fetch activities', err);
    }
  }, [selectedTaskId]);

  useEffect(() => {
    if (selectedTaskId) {
      fetchTask();
      fetchComments();
      fetchActivities();
    } else {
      setTask(null);
      setComments([]);
      setActivities([]);
    }
  }, [selectedTaskId, fetchTask, fetchComments, fetchActivities]);

  const updateField = async (field: string, value: any) => {
    if (!task) return;
    try {
      const { data } = await api.patch(`/tasks/${task.id}`, { [field]: value });
      setTask(data);
    } catch (err) {
      console.error('Update failed', err);
    }
  };

  const handleTitleSubmit = () => {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue !== task?.title) {
      updateField('title', titleValue.trim());
    }
  };

  const handleDescriptionSubmit = () => {
    setEditingDescription(false);
    if (descriptionValue !== (task?.description || '')) {
      updateField('description', descriptionValue);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return;
    try {
      await api.post(`/tasks/${task.id}/comments`, { content: newComment.trim() });
      setNewComment('');
      fetchComments();
    } catch (err) {
      console.error('Failed to add comment', err);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    if (!confirm('Delete this task? This cannot be undone.')) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      closeTaskDetail();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  if (!selectedTaskId) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-30"
        onClick={closeTaskDetail}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-screen w-full max-w-2xl bg-white shadow-xl z-40 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            {task && (
              <span className="text-xs font-mono font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                {task.key}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleDeleteTask} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={closeTaskDetail} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full" />
          </div>
        ) : task ? (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Title */}
              {editingTitle ? (
                <input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                  className="text-xl font-semibold text-gray-900 w-full outline-none border-b-2 border-brand-500 pb-1"
                  autoFocus
                />
              ) : (
                <h2
                  className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-brand-600 transition"
                  onClick={() => setEditingTitle(true)}
                >
                  {task.title}
                </h2>
              )}

              {/* Properties Grid */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                {/* Status */}
                <PropertyRow label="Status" icon={<ChevronDown className="w-4 h-4" />}>
                  <select
                    value={task.statusId}
                    onChange={(e) => updateField('statusId', e.target.value)}
                    className="text-sm bg-transparent outline-none cursor-pointer"
                  >
                    {task.status && (
                      <option value={task.status.id}>{task.status.name}</option>
                    )}
                  </select>
                </PropertyRow>

                {/* Priority */}
                <PropertyRow label="Priority" icon={<ChevronDown className="w-4 h-4" />}>
                  <select
                    value={task.priority}
                    onChange={(e) => updateField('priority', e.target.value)}
                    className="text-sm bg-transparent outline-none cursor-pointer"
                  >
                    {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'] as Priority[]).map((p) => (
                      <option key={p} value={p}>{priorityConfig[p].label}</option>
                    ))}
                  </select>
                </PropertyRow>

                {/* Type */}
                <PropertyRow label="Type" icon={<Tag className="w-4 h-4" />}>
                  <select
                    value={task.type}
                    onChange={(e) => updateField('type', e.target.value)}
                    className="text-sm bg-transparent outline-none cursor-pointer"
                  >
                    {(['STORY', 'BUG', 'TASK', 'SUBTASK', 'EPIC'] as IssueType[]).map((t) => (
                      <option key={t} value={t}>{issueTypeConfig[t].label}</option>
                    ))}
                  </select>
                </PropertyRow>

                {/* Assignee */}
                <PropertyRow label="Assignee" icon={<User className="w-4 h-4" />}>
                  <span className="text-sm text-gray-700">
                    {task.assignee?.displayName || 'Unassigned'}
                  </span>
                </PropertyRow>

                {/* Due Date */}
                <PropertyRow label="Due Date" icon={<Calendar className="w-4 h-4" />}>
                  <input
                    type="date"
                    value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => updateField('dueDate', e.target.value || null)}
                    className="text-sm bg-transparent outline-none cursor-pointer"
                  />
                </PropertyRow>

                {/* Story Points */}
                <PropertyRow label="Points" icon={<Activity className="w-4 h-4" />}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={task.storyPoints ?? ''}
                    onChange={(e) => updateField('storyPoints', e.target.value ? parseInt(e.target.value) : null)}
                    className="text-sm bg-transparent outline-none w-16"
                    placeholder="—"
                  />
                </PropertyRow>
              </div>

              {/* Labels */}
              {task.taskLabels && task.taskLabels.length > 0 && (
                <div className="mt-4">
                  <span className="text-xs font-medium text-gray-400 uppercase">Labels</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {task.taskLabels.map((tl) => (
                      <span
                        key={tl.label.id}
                        className="badge"
                        style={{ backgroundColor: `${tl.label.color}20`, color: tl.label.color }}
                      >
                        {tl.label.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="mt-6">
                <span className="text-xs font-medium text-gray-400 uppercase">Description</span>
                {editingDescription ? (
                  <textarea
                    value={descriptionValue}
                    onChange={(e) => setDescriptionValue(e.target.value)}
                    onBlur={handleDescriptionSubmit}
                    rows={5}
                    className="mt-1.5 w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-3 outline-none focus:border-brand-500 resize-none"
                    autoFocus
                  />
                ) : (
                  <div
                    className="mt-1.5 text-sm text-gray-600 whitespace-pre-wrap cursor-pointer hover:bg-gray-50 rounded-lg p-3 min-h-[60px] border border-transparent hover:border-gray-200 transition"
                    onClick={() => setEditingDescription(true)}
                  >
                    {task.description || 'Click to add a description...'}
                  </div>
                )}
              </div>

              {/* Tabs: Comments / Activity */}
              <div className="mt-8 border-t border-gray-100 pt-4">
                <div className="flex gap-4 border-b border-gray-200">
                  <button
                    className={cn(
                      'pb-2 text-sm font-medium transition border-b-2',
                      activeTab === 'comments'
                        ? 'border-brand-600 text-brand-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700',
                    )}
                    onClick={() => setActiveTab('comments')}
                  >
                    <MessageSquare className="w-4 h-4 inline mr-1.5" />
                    Comments ({comments.length})
                  </button>
                  <button
                    className={cn(
                      'pb-2 text-sm font-medium transition border-b-2',
                      activeTab === 'activity'
                        ? 'border-brand-600 text-brand-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700',
                    )}
                    onClick={() => setActiveTab('activity')}
                  >
                    <Activity className="w-4 h-4 inline mr-1.5" />
                    Activity ({activities.length})
                  </button>
                </div>

                {activeTab === 'comments' && (
                  <div className="mt-4 space-y-4">
                    {/* Add comment */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-700 flex-shrink-0">
                        You
                      </div>
                      <div className="flex-1 relative">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment..."
                          rows={2}
                          className="w-full border border-gray-200 rounded-lg p-3 pr-10 text-sm outline-none focus:border-brand-500 resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddComment();
                          }}
                        />
                        <button
                          onClick={handleAddComment}
                          disabled={!newComment.trim()}
                          className="absolute right-3 bottom-3 text-brand-600 disabled:text-gray-300 transition"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Comments list */}
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                          {comment.author?.displayName?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {comment.author?.displayName}
                            </span>
                            <span className="text-2xs text-gray-400">
                              {timeAgo(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}

                    {comments.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>
                    )}
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="mt-4 space-y-3">
                    {activities.map((act) => (
                      <div key={act.id} className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-2xs font-medium text-gray-500 flex-shrink-0 mt-0.5">
                          {act.user?.displayName?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 text-sm">
                          <span className="font-medium text-gray-900">
                            {act.user?.displayName}
                          </span>{' '}
                          <span className="text-gray-500">
                            {act.action.toLowerCase().replace(/_/g, ' ')}
                          </span>
                          {act.field && (
                            <span className="text-gray-500">
                              {' '}{act.field}
                              {act.oldValue && ` from "${act.oldValue}"`}
                              {act.newValue && ` to "${act.newValue}"`}
                            </span>
                          )}
                          <span className="text-2xs text-gray-400 ml-2">{timeAgo(act.createdAt)}</span>
                        </div>
                      </div>
                    ))}

                    {activities.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">No activity yet</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Task not found
          </div>
        )}
      </div>
    </>
  );
}

function PropertyRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-20 flex-shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 text-gray-700">{children}</div>
    </div>
  );
}
