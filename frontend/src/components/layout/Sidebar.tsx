'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Clock,
  Star,
  Layers,
  KanbanSquare,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useSpaceStore } from '@/stores/space-store';
import { useAuthStore } from '@/stores/auth-store';
import { cn, getInitials } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, setRecentsDropdown, setCreateSpaceModal } = useUIStore();
  const { spaces, fetchSpaces } = useSpaceStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  const navItems = [
    {
      label: 'For You',
      icon: LayoutDashboard,
      href: '/dashboard',
      active: pathname === '/dashboard',
    },
    {
      label: 'Recents',
      icon: Clock,
      onClick: () => setRecentsDropdown(true),
      active: false,
    },
    {
      label: 'Starred',
      icon: Star,
      href: '/starred',
      active: pathname === '/starred',
    },
  ];

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex flex-col z-20 transition-all duration-200',
        sidebarCollapsed ? 'w-16' : 'w-[var(--sidebar-width)]',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100">
        {!sidebarCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center text-xs font-bold">
              P
            </div>
            <span className="font-bold text-gray-900 text-lg">ProjectFlow</span>
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {/* Main Nav */}
        <div className="space-y-0.5 mb-6">
          {navItems.map((item) => {
            const Icon = item.icon;

            if (item.href) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn('sidebar-item', item.active && 'active')}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={cn('sidebar-item w-full', item.active && 'active')}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Spaces Section */}
        {!sidebarCollapsed && (
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Spaces
              </span>
              <button
                onClick={() => setCreateSpaceModal(true)}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                title="Create Space"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-0.5">
              {spaces.map((space) => {
                const isActive = pathname.startsWith(`/spaces/${space.key}`);
                return (
                  <Link
                    key={space.id}
                    href={`/spaces/${space.key}/board`}
                    className={cn('sidebar-item', isActive && 'active')}
                  >
                    <div
                      className={cn(
                        'w-6 h-6 rounded flex items-center justify-center text-2xs font-bold flex-shrink-0',
                        isActive
                          ? 'bg-brand-600 text-white'
                          : 'bg-gray-200 text-gray-600',
                      )}
                    >
                      {space.key?.slice(0, 2)}
                    </div>
                    <span className="truncate">{space.name}</span>
                  </Link>
                );
              })}

              {spaces.length === 0 && (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs text-gray-400">No spaces yet</p>
                  <button
                    onClick={() => setCreateSpaceModal(true)}
                    className="btn-ghost text-xs mt-2 text-brand-600"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Create your first space
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Collapsed state: just icon */}
        {sidebarCollapsed && (
          <div className="space-y-1">
            <div className="px-2">
              <div className="w-full h-px bg-gray-200 my-2" />
            </div>
            {spaces.slice(0, 5).map((space) => {
              const isActive = pathname.startsWith(`/spaces/${space.key}`);
              return (
                <Link
                  key={space.id}
                  href={`/spaces/${space.key}/board`}
                  title={space.name}
                  className={cn(
                    'flex items-center justify-center p-2 rounded-lg transition-colors',
                    isActive ? 'bg-brand-50' : 'hover:bg-gray-100',
                  )}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded flex items-center justify-center text-2xs font-bold',
                      isActive ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-600',
                    )}
                  >
                    {space.key?.slice(0, 2)}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-100 p-3">
        <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-700 flex-shrink-0">
            {getInitials(user?.displayName || 'U')}
          </div>
          {!sidebarCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user?.displayName}
                </div>
                <div className="text-2xs text-gray-400 truncate">{user?.email}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
