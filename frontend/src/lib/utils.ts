import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Format relative time (e.g., "5 minutes ago")
 */
export function timeAgo(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Issue type icons/colors
 */
export const issueTypeConfig: Record<string, { icon: string; color: string; label: string }> = {
  STORY: { icon: '📖', color: '#10B981', label: 'Story' },
  BUG: { icon: '🐛', color: '#EF4444', label: 'Bug' },
  TASK: { icon: '✅', color: '#3B82F6', label: 'Task' },
  EPIC: { icon: '⚡', color: '#8B5CF6', label: 'Epic' },
  SUBTASK: { icon: '📋', color: '#6B7280', label: 'Subtask' },
};

/**
 * Priority config
 */
export const priorityConfig: Record<string, { icon: string; color: string; label: string }> = {
  CRITICAL: { icon: '🔴', color: '#DC2626', label: 'Critical' },
  HIGH: { icon: '🟠', color: '#F97316', label: 'High' },
  MEDIUM: { icon: '🟡', color: '#EAB308', label: 'Medium' },
  LOW: { icon: '🟢', color: '#22C55E', label: 'Low' },
  NONE: { icon: '⚪', color: '#9CA3AF', label: 'None' },
};

/**
 * Generate initials from display name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Debounce utility
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
