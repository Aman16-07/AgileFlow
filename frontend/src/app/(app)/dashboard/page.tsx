'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { DashboardData, Task } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { timeAgo, issueTypeConfig, priorityConfig, getInitials } from '@/lib/utils';

type DashboardTab = 'worked-on' | 'viewed' | 'assigned' | 'starred';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('worked-on');
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const { openTaskDetail } = useUIStore();

  useEffect(() => {
    async function load() {
      try {
        const { data: dashboard } = await api.get('/dashboard/for-you');
        setData(dashboard);
      } catch (err) {
        console.error('Failed to fetch dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-100 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const tabTasks: Record<DashboardTab, Task[]> = {
    'worked-on': data.workedOn,
    'viewed': data.viewedRecently || [],
    'assigned': data.assignedToMe,
    'starred': [],
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.displayName?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening across your projects</p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Completed" value={data.metrics.completed} color="text-green-600" bg="bg-green-50" />
        <MetricCard label="Updated" value={data.metrics.updated} color="text-blue-600" bg="bg-blue-50" />
        <MetricCard label="Created" value={data.metrics.created} color="text-purple-600" bg="bg-purple-50" />
        <MetricCard label="Due Soon" value={data.metrics.dueSoon} color="text-orange-600" bg="bg-orange-50" />
      </div>

      {/* Recent Spaces */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Spaces</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.recentSpaces.map((space) => (
            <a
              key={space.id}
              href={`/spaces/${space.key}/board`}
              className="card p-4 hover:border-brand-300 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-sm">
                  {space.key?.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{space.name}</div>
                  <div className="text-xs text-gray-500">{space.key}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{space._count?.tasks ?? 0} tasks</span>
                <span>{space._count?.members ?? 0} members</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Task Tabs */}
      <section className="mb-8">
        <div className="flex items-center gap-1 border-b border-gray-200 mb-4">
          {[
            { key: 'worked-on' as DashboardTab, label: 'Worked on' },
            { key: 'viewed' as DashboardTab, label: 'Viewed' },
            { key: 'assigned' as DashboardTab, label: 'Assigned to me' },
            { key: 'starred' as DashboardTab, label: 'Starred' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-1">
          {tabTasks[activeTab]?.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No items to show
            </div>
          ) : (
            tabTasks[activeTab]?.map((task) => (
              <TaskRow key={task.id} task={task} onClick={() => openTaskDetail(task.id)} />
            ))
          )}
        </div>
      </section>

      {/* Bottom Grid: Charts + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Breakdown */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Priority Breakdown</h3>
          <div className="space-y-3">
            {data.metrics.priorityBreakdown.map((p) => (
              <div key={p.priority} className="flex items-center gap-3">
                <span className="text-sm">{priorityConfig[p.priority]?.icon}</span>
                <span className="text-sm text-gray-700 flex-1">{priorityConfig[p.priority]?.label}</span>
                <span className="text-sm font-medium text-gray-900">{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Type Breakdown */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Type Breakdown</h3>
          <div className="space-y-3">
            {data.metrics.typeBreakdown.map((t) => (
              <div key={t.type} className="flex items-center gap-3">
                <span className="text-sm">{issueTypeConfig[t.type]?.icon}</span>
                <span className="text-sm text-gray-700 flex-1">{issueTypeConfig[t.type]?.label}</span>
                <span className="text-sm font-medium text-gray-900">{t.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {data.activityFeed.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-2xs font-medium text-gray-600 flex-shrink-0">
                  {getInitials(activity.user.displayName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{activity.user.displayName}</span>
                    {' '}{activity.action.toLowerCase().replace('_', ' ')}{' '}
                    <span className="font-medium text-brand-600">{activity.task?.key}</span>
                  </p>
                  <p className="text-xs text-gray-400">{timeAgo(activity.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function MetricCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`rounded-xl p-4 ${bg}`}>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
      <div className="text-xs text-gray-400">this week</div>
    </div>
  );
}

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
    >
      <span className="text-sm flex-shrink-0">{issueTypeConfig[task.type]?.icon}</span>
      <span className="text-xs font-mono text-gray-400 w-20 flex-shrink-0">{task.key}</span>
      <span className="text-sm text-gray-900 flex-1 truncate">{task.title}</span>
      <span
        className="badge text-white text-2xs"
        style={{ backgroundColor: task.status?.color || '#6B7280' }}
      >
        {task.status?.name}
      </span>
      <span className="text-xs text-gray-400 flex-shrink-0 w-16 text-right">
        {timeAgo(task.updatedAt)}
      </span>
      {task.assignee && (
        <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-2xs font-medium text-brand-700 flex-shrink-0">
          {getInitials(task.assignee.displayName)}
        </div>
      )}
    </button>
  );
}
