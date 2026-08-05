// Shared API contract types for SentinelDesk. Hand-kept in sync with the
// NestJS DTOs/serializers in apps/backend — this package has no runtime
// dependency on the backend, it just documents the wire shape both sides agree on.

export type RoleName = 'CUSTOMER' | 'AGENT' | 'SENIOR_AGENT' | 'MANAGER' | 'ADMIN';

export type UserStatus = 'PENDING_VERIFICATION' | 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logoUrl: string | null;
  primaryColor: string;
  timezone: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: RoleName;
  organizationId: string;
  organization: OrganizationSummary;
}

export interface LoginResponse {
  user: AuthUser;
  csrfToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  title: string | null;
  phone: string | null;
  timezone: string;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  role: { name: RoleName; label: string };
  organization: OrganizationSummary;
}

export interface OrgMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: RoleName;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface SessionSummary {
  id: string;
  device: string;
  ipAddress: string | null;
  isRememberMe: boolean;
  lastUsedAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

export const ROLE_LABELS: Record<RoleName, string> = {
  CUSTOMER: 'Customer',
  AGENT: 'Support Agent',
  SENIOR_AGENT: 'Senior Agent',
  MANAGER: 'Manager',
  ADMIN: 'Admin',
};

// ── Tickets ────────────────────────────────────────────────────────────

export type TicketStatus = 'OPEN' | 'PENDING' | 'ON_HOLD' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type CommentVisibility = 'PUBLIC' | 'INTERNAL';

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Open',
  PENDING: 'Pending',
  ON_HOLD: 'On hold',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export interface TicketPerson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

export interface TicketTagSummary {
  id: string;
  name: string;
  color: string;
}

export interface TicketSummary {
  id: string;
  number: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  requester: TicketPerson;
  assignee: TicketPerson | null;
  tags: TicketTagSummary[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
}

export interface TicketAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  visibility: CommentVisibility;
  body: string;
  createdAt: string;
  editedAt: string | null;
  author: TicketPerson & { roleId: string };
  attachments: TicketAttachment[];
}

export interface TicketDetail {
  id: string;
  number: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  requester: TicketPerson;
  assignee: TicketPerson | null;
  tags: TicketTagSummary[];
  comments: TicketComment[];
  mergedInto: { id: string; number: number; subject: string } | null;
  splitFrom: { id: string; number: number; subject: string } | null;
  reopenedCount: number;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export type TicketHistoryAction =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'ASSIGNED'
  | 'UNASSIGNED'
  | 'TRANSFERRED'
  | 'ESCALATED'
  | 'TAG_ADDED'
  | 'TAG_REMOVED'
  | 'MERGED'
  | 'MERGED_FROM'
  | 'SPLIT'
  | 'REOPENED'
  | 'COMMENT_ADDED'
  | 'NOTE_ADDED';

export interface TicketHistoryEntry {
  id: string;
  ticketId: string;
  actorId: string | null;
  action: TicketHistoryAction;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
}
