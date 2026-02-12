'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { StarredItem } from '@/types';
import { useUIStore } from '@/stores/ui-store';
import { timeAgo, issueTypeConfig } from '@/lib/utils';
import { Star, X } from 'lucide-react';

export default function StarredPage() {
  const [items, setItems] = useState<StarredItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { openTaskDetail } = useUIStore();

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/stars');
        setItems(data);
      } catch (err) {
        console.error('Failed to fetch starred items:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleUnstar = async (entityType: string, entityId: string) => {
    // Optimistic update
    setItems((prev) => prev.filter((item) => {
      const entity = item.entity;
      return !(item.entityType === entityType && entity?.id === entityId);
    }));

    try {
      await api.post('/stars/toggle', { entityType, entityId });
    } catch {
      // Refetch on error
      const { data } = await api.get('/stars');
      setItems(data);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-32" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const spaces = items.filter((i) => i.entityType === 'SPACE');
  const boards = items.filter((i) => i.entityType === 'BOARD');
  const tasks = items.filter((i) => i.entityType === 'TASK');

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center gap-3 mb-8">
        <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
        <h1 className="text-2xl font-bold text-gray-900">Starred</h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">No starred items yet</p>
          <p className="text-sm mt-1">Star spaces, boards, and tasks for quick access</p>
        </div>
      ) : (
        <div className="space-y-8">
          {spaces.length > 0 && (
            <StarredSection title="Spaces" items={spaces} onUnstar={handleUnstar} />
          )}
          {boards.length > 0 && (
            <StarredSection title="Boards" items={boards} onUnstar={handleUnstar} />
          )}
          {tasks.length > 0 && (
            <StarredSection
              title="Tasks"
              items={tasks}
              onUnstar={handleUnstar}
              onTaskClick={(id) => openTaskDetail(id)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function StarredSection({
  title,
  items,
  onUnstar,
  onTaskClick,
}: {
  title: string;
  items: StarredItem[];
  onUnstar: (type: string, id: string) => void;
  onTaskClick?: (id: string) => void;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h2>
      <div className="space-y-1">
        {items.map((item) => {
          const entity = item.entity;
          if (!entity) return null;

          return (
            <div
              key={item.id}
              className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              {item.entityType === 'TASK' && (
                <span className="text-sm">{issueTypeConfig[entity.type]?.icon || '✅'}</span>
              )}
              {item.entityType === 'SPACE' && (
                <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold">
                  {entity.key?.slice(0, 2)}
                </div>
              )}
              {item.entityType === 'BOARD' && (
                <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center text-xs">
                  📋
                </div>
              )}

              <button
                onClick={() => onTaskClick?.(entity.id)}
                className="flex-1 text-left min-w-0"
              >
                <div className="text-sm font-medium text-gray-900 truncate">
                  {entity.title || entity.name}
                </div>
                <div className="text-xs text-gray-400">
                  {entity.key && <span className="font-mono">{entity.key} · </span>}
                  Starred {timeAgo(item.createdAt)}
                </div>
              </button>

              {item.entityType === 'TASK' && entity.status && (
                <span
                  className="badge text-white text-2xs"
                  style={{ backgroundColor: entity.status.color }}
                >
                  {entity.status.name}
                </span>
              )}

              <button
                onClick={() => onUnstar(item.entityType, entity.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 transition-all"
                title="Unstar"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
