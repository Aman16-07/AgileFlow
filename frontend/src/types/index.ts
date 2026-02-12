// ============================================================
// TYPES — Shared type definitions for the frontend
// ============================================================

// ── User ────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt?: string;
}

// ── Auth ────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
}

// ── Space ───────────────────────────────────────────────────

export type SpaceVisibility = 'PRIVATE' | 'TEAM';

export interface Space {
  id: string;
  name: string;
  key: string;
  slug: string;
  description?: string;
  iconUrl?: string | null;
  visibility: SpaceVisibility;
  createdAt: string;
  updatedAt: string;
  role?: Role;
  _count?: { tasks: number; members: number };
}

export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';

export interface SpaceMember {
  id: string;
  userId: string;
  spaceId: string;
  role: Role;
  user: User;
}

// ── Board ───────────────────────────────────────────────────

export interface Board {
  id: string;
  name: string;
  spaceId: string;
  isDefault: boolean;
}

// ── Workflow ────────────────────────────────────────────────

export interface WorkflowStatus {
  id: string;
  name: string;
  slug: string;
  color: string;
  position: number;
  category: 'TODO' | 'IN_PROGRESS' | 'DONE';
}

export interface Workflow {
  id: string;
  name: string;
  isDefault: boolean;
  statuses: WorkflowStatus[];
}

// ── Task ────────────────────────────────────────────────────

export type IssueType = 'STORY' | 'BUG' | 'TASK' | 'EPIC' | 'SUBTASK';
export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface Task {
  id: string;
  title: string;
  key: string;
  number: number;
  description?: string;
  type: IssueType;
  priority: Priority;
  position: number;
  storyPoints?: number | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  spaceId: string;
  statusId: string;
  sprintId?: string | null;
  assigneeId?: string | null;
  reporterId: string;
  parentId?: string | null;

  // Populated relations
  status: WorkflowStatus;
  assignee?: User | null;
  reporter?: User;
  space?: { key: string; name: string };
  sprint?: { id: string; name: string; status: SprintStatus } | null;
  taskLabels?: { label: Label }[];
  parent?: { id: string; title: string; key: string } | null;
  children?: Task[];
  comments?: Comment[];
  activities?: Activity[];
  attachments?: Attachment[];
}

export interface BoardColumn {
  id: string;
  name: string;
  slug: string;
  color: string;
  position: number;
  category: string;
  tasks: Task[];
}

export interface BoardView {
  workflow: Workflow;
  columns: BoardColumn[];
}

// ── Sprint ──────────────────────────────────────────────────

export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  status: SprintStatus;
  startDate?: string;
  endDate?: string;
  spaceId: string;
  tasks: Task[];
  _count?: { tasks: number };
}

export interface SprintMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  totalPoints: number;
  completedPoints: number;
  velocity: number;
}

// ── Label ───────────────────────────────────────────────────

export interface Label {
  id: string;
  name: string;
  color: string;
  spaceId: string;
}

// ── Comment ─────────────────────────────────────────────────

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: User;
  replies?: Comment[];
}

// ── Activity ────────────────────────────────────────────────

export type ActivityAction =
  | 'CREATED' | 'UPDATED' | 'COMMENTED' | 'STATUS_CHANGED'
  | 'ASSIGNED' | 'PRIORITY_CHANGED' | 'MOVED' | 'ATTACHED' | 'DELETED';

export interface Activity {
  id: string;
  action: ActivityAction;
  field?: string;
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  user: User;
  task?: { id: string; title: string; key: string };
}

// ── Attachment ──────────────────────────────────────────────

export interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploader: User;
}

// ── Star ────────────────────────────────────────────────────

export type StarrableType = 'SPACE' | 'BOARD' | 'TASK';

export interface StarredItem {
  id: string;
  entityType: StarrableType;
  createdAt: string;
  entity: any;
}

// ── Recent ──────────────────────────────────────────────────

export type RecentItemType = 'SPACE' | 'BOARD' | 'TASK';

export interface RecentItem {
  id: string;
  entityType: RecentItemType;
  accessedAt: string;
  entity: any;
}

// ── Dashboard ───────────────────────────────────────────────

export interface DashboardData {
  recentSpaces: Space[];
  assignedToMe: Task[];
  workedOn: Task[];
  viewedRecently: (Task & { accessedAt: string })[];
  metrics: DashboardMetrics;
  activityFeed: Activity[];
}

export interface DashboardMetrics {
  completed: number;
  updated: number;
  created: number;
  dueSoon: number;
  statusDistribution: { statusId: string; _count: number }[];
  priorityBreakdown: { priority: Priority; count: number }[];
  typeBreakdown: { type: IssueType; count: number }[];
}

// ── Pagination ──────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
