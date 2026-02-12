'use client';

import { useEffect, useState } from 'react';
import { useSpaceStore } from '@/stores/space-store';
import { api } from '@/lib/api';
import type { SprintMetrics, Activity } from '@/types';
import { timeAgo, getInitials } from '@/lib/utils';

export default function SpaceSummaryPage() {
  const { currentSpace } = useSpaceStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentSpace) return;
    async function load() {
      try {
        const { data } = await api.get(`/activities/space/${currentSpace!.id}?limit=20`);
        setActivities(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentSpace]);

  if (!currentSpace) return null;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Summary</h2>

      {/* Space Info */}
      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">{currentSpace.name}</h3>
        <p className="text-sm text-gray-500">{currentSpace.description || 'No description'}</p>
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
          <span>Key: <span className="font-mono text-gray-600">{currentSpace.key}</span></span>
          <span>Visibility: {currentSpace.visibility}</span>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-gray-400">No activity yet</p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-2xs font-medium text-gray-600 flex-shrink-0">
                  {getInitials(activity.user.displayName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{activity.user.displayName}</span>
                    {' '}{activity.action.toLowerCase().replace('_', ' ')}{' '}
                    <span className="font-medium text-brand-600">{activity.task?.key}</span>
                    {activity.task && (
                      <span className="text-gray-500"> — {activity.task.title}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">{timeAgo(activity.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
