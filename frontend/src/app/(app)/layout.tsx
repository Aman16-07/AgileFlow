'use client';

import { useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TaskDetailPanel } from '@/components/tasks/TaskDetailPanel';
import { CreateSpaceModal } from '@/components/spaces/CreateSpaceModal';
import { RecentsDropdown } from '@/components/recents/RecentsDropdown';
import { useUIStore } from '@/stores/ui-store';
import { connectSocket, disconnectSocket } from '@/lib/socket';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUIStore();

  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, []);

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      <main
        className="flex-1 transition-all duration-200"
        style={{
          marginLeft: sidebarCollapsed ? '64px' : 'var(--sidebar-width)',
        }}
      >
        <div className="min-h-screen">{children}</div>
      </main>

      <TaskDetailPanel />
      <CreateSpaceModal />
      <RecentsDropdown />
    </div>
  );
}
