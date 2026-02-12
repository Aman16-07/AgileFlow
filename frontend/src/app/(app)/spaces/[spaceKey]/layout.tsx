'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSpaceStore } from '@/stores/space-store';
import { joinSpace, leaveSpace } from '@/lib/socket';
import type { Space } from '@/types';
import { cn } from '@/lib/utils';

const spaceTabs = [
  { key: 'summary', label: 'Summary' },
  { key: 'board', label: 'Board' },
  { key: 'backlog', label: 'Backlog' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'pages', label: 'Pages' },
];

export default function SpaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const spaceKey = params.spaceKey as string;
  const { fetchSpaceByKey, currentSpace } = useSpaceStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const space = await fetchSpaceByKey(spaceKey);
        joinSpace(space.id);
      } catch (err) {
        console.error('Failed to load space:', err);
      } finally {
        setLoading(false);
      }
    }
    load();

    return () => {
      if (currentSpace) {
        leaveSpace(currentSpace.id);
      }
    };
  }, [spaceKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-100 rounded w-48 mb-4" />
          <div className="h-10 bg-gray-100 rounded w-full mb-6" />
          <div className="h-96 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!currentSpace) {
    return (
      <div className="p-8 text-center text-gray-500">
        Space not found
      </div>
    );
  }

  const activeTab = pathname.split('/').pop() || 'board';

  return (
    <div className="min-h-screen">
      {/* Space Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center gap-4 py-4">
            <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-sm">
              {currentSpace.key.slice(0, 2)}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{currentSpace.name}</h1>
              <p className="text-xs text-gray-400">{currentSpace.key}</p>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1 -mb-px">
            {spaceTabs.map((tab) => (
              <Link
                key={tab.key}
                href={`/spaces/${spaceKey}/${tab.key}`}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700',
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>{children}</div>
    </div>
  );
}
