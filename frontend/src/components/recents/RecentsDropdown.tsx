'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Search, KanbanSquare, Layers, FileText, ArrowRight } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import type { RecentItem } from '@/types';

export function RecentsDropdown() {
  const { recentsDropdownOpen, setRecentsDropdown } = useUIStore();
  const router = useRouter();
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (recentsDropdownOpen) {
      fetchRecents();
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearch('');
    }
  }, [recentsDropdownOpen]);

  useEffect(() => {
    if (!recentsDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setRecentsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [recentsDropdownOpen, setRecentsDropdown]);

  useEffect(() => {
    if (!recentsDropdownOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRecentsDropdown(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [recentsDropdownOpen, setRecentsDropdown]);

  const fetchRecents = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '20' };
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get('/recents', { params });
      setRecents(data || []);
    } catch (err) {
      console.error('Failed to fetch recents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!recentsDropdownOpen) return;
    const timer = setTimeout(fetchRecents, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleNavigate = (item: RecentItem) => {
    setRecentsDropdown(false);
    if (item.entityType === 'SPACE' && item.entity?.key) {
      router.push(`/spaces/${item.entity.key}/board`);
    } else if (item.entityType === 'BOARD' && item.entity?.space?.key) {
      router.push(`/spaces/${item.entity.space.key}/board`);
    } else if (item.entityType === 'TASK' && item.entity?.space?.key) {
      router.push(`/spaces/${item.entity.space.key}/board`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SPACE':
        return <Layers className="w-4 h-4 text-purple-500" />;
      case 'BOARD':
        return <KanbanSquare className="w-4 h-4 text-blue-500" />;
      case 'TASK':
        return <FileText className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getName = (item: RecentItem) => {
    if (item.entityType === 'SPACE') return item.entity?.name || 'Unnamed space';
    if (item.entityType === 'BOARD') return item.entity?.name || 'Unnamed board';
    if (item.entityType === 'TASK') return item.entity?.title || 'Untitled task';
    return 'Unknown';
  };

  if (!recentsDropdownOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40" onClick={() => setRecentsDropdown(false)} />

      {/* Dropdown panel */}
      <div
        ref={panelRef}
        className="fixed left-[var(--sidebar-width)] top-12 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-fade-in overflow-hidden"
      >
        {/* Search */}
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recent items..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-500 transition"
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : recents.length > 0 ? (
            <div className="py-1">
              {recents.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left"
                >
                  {getIcon(item.entityType)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 truncate">{getName(item)}</div>
                    <div className="text-2xs text-gray-400">{timeAgo(item.accessedAt)}</div>
                  </div>
                  <span className="badge text-2xs">{item.entityType.toLowerCase()}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Clock className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                {search ? 'No matching items' : 'No recent items'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {recents.length > 0 && (
          <div className="border-t border-gray-100 p-2">
            <button
              onClick={() => {
                setRecentsDropdown(false);
                router.push('/dashboard');
              }}
              className="w-full text-sm text-brand-600 hover:bg-brand-50 py-2 rounded-lg transition flex items-center justify-center gap-1"
            >
              View all in Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
