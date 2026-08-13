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
  /**
   * Echoes the sd_csrf cookie back in the body. Cross-origin deployments (frontend and
   * backend on different domains) can't read it via document.cookie, so the frontend
   * sources its X-CSRF-Token header value from here instead. Null if no session cookie
   * is present yet.
   */
  csrfToken: string | null;
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
export type CommentSentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

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
  responseDueAt: string | null;
  resolutionDueAt: string | null;
  responseBreached: boolean;
  resolutionBreached: boolean;
  slaPausedAt: string | null;
  /** Advisory only, staff-visible only — null for customers and until enrichment completes. */
  aiSuggestedPriority: TicketPriority | null;
  aiSuggestedTags: string[];
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
  /** Only ever set for customer-authored comments — see ai/ai.service.ts. */
  sentiment: CommentSentiment | null;
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
  responseDueAt: string | null;
  resolutionDueAt: string | null;
  responseBreached: boolean;
  resolutionBreached: boolean;
  slaPausedAt: string | null;
  createdAt: string;
  updatedAt: string;
  aiSuggestedPriority: TicketPriority | null;
  aiSuggestedTags: string[];
  csatRating: number | null;
  csatComment: string | null;
  csatRatedAt: string | null;
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
  | 'NOTE_ADDED'
  | 'SLA_PAUSED'
  | 'SLA_RESUMED'
  | 'RESPONSE_SLA_BREACHED'
  | 'RESOLUTION_SLA_BREACHED'
  | 'AUTO_ESCALATED';

export interface TicketHistoryEntry {
  id: string;
  ticketId: string;
  actorId: string | null;
  action: TicketHistoryAction;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
}

// ── SLA engine ─────────────────────────────────────────────────────────

export interface BusinessHoursSlot {
  id: string;
  scheduleId: string;
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  startMinute: number;
  endMinute: number;
}

export interface Holiday {
  id: string;
  scheduleId: string;
  date: string;
  name: string;
}

export interface BusinessHoursSchedule {
  id: string;
  organizationId: string;
  name: string;
  timezone: string;
  isDefault: boolean;
  slots: BusinessHoursSlot[];
  holidays: Holiday[];
  createdAt: string;
  updatedAt: string;
}

export interface SlaPolicyRule {
  id: string;
  policyId: string;
  priority: TicketPriority;
  responseTargetMinutes: number;
  resolutionTargetMinutes: number;
}

export interface SlaPolicy {
  id: string;
  organizationId: string;
  name: string;
  isDefault: boolean;
  businessHoursScheduleId: string;
  autoEscalateAtPercent: number;
  rules: SlaPolicyRule[];
  businessHours: { id: string; name: string; timezone: string };
  createdAt: string;
  updatedAt: string;
}

export interface SlaDashboardSummary {
  totalActive: number;
  onTrack: number;
  atRisk: number;
  breached: number;
  complianceRate: number | null;
  resolvedLast30Days: number;
}

export interface SlaViolationTicket {
  id: string;
  number: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  responseBreached: boolean;
  resolutionBreached: boolean;
  responseDueAt: string | null;
  resolutionDueAt: string | null;
  assignee: { id: string; firstName: string; lastName: string } | null;
  requester: { id: string; firstName: string; lastName: string };
  updatedAt: string;
}

// ── Analytics ──────────────────────────────────────────────────────────

export interface AnalyticsVolumePoint {
  date: string;
  created: number;
  resolved: number;
}

export interface AnalyticsResponseTimePoint {
  date: string;
  avgResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
}

export interface AnalyticsStatusBreakdown {
  status: TicketStatus;
  count: number;
}

export interface AnalyticsPriorityBreakdown {
  priority: TicketPriority;
  count: number;
}

export interface AnalyticsOverview {
  volume: AnalyticsVolumePoint[];
  responseTime: AnalyticsResponseTimePoint[];
  statusBreakdown: AnalyticsStatusBreakdown[];
  priorityBreakdown: AnalyticsPriorityBreakdown[];
  avgCsat: number | null;
  csatResponseCount: number;
}

// ── Macros & saved filters ────────────────────────────────────────────

export interface Macro {
  id: string;
  organizationId: string;
  authorId: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedFilter {
  id: string;
  userId: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: string;
}

// ── Knowledge base ────────────────────────────────────────────────────

export type KnowledgeArticleStatus = 'DRAFT' | 'PUBLISHED';

export interface KnowledgeArticleAuthor {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface KnowledgeArticle {
  id: string;
  organizationId: string;
  authorId: string;
  title: string;
  slug: string;
  body: string;
  status: KnowledgeArticleStatus;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  author: KnowledgeArticleAuthor;
}

// ── Audit log ──────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string; avatarUrl: string | null } | null;
}

// ── Realtime & notifications ─────────────────────────────────────────

export type NotificationType = 'TICKET_ASSIGNED' | 'TICKET_REPLY' | 'SLA_BREACHED' | 'SLA_ESCALATED';

export interface AppNotification {
  id: string;
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  ticketId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface PresenceUpdateEvent {
  userId: string;
  online: boolean;
}

export interface TicketTypingEvent {
  ticketId: string;
  userId: string;
  isTyping: boolean;
}

export interface TicketCommentNewEvent {
  ticketId: string;
  comment: {
    id: string;
    body: string;
    visibility: CommentVisibility;
    createdAt: string;
    author: TicketPerson & { roleId: string };
  };
}

// ── AI assist ─────────────────────────────────────────────────────────

export interface AiSummaryResponse {
  summary: string | null;
}

export interface AiSuggestReplyResponse {
  reply: string | null;
}

export interface AiDuplicateCandidate {
  ticketId: string;
  ticketNumber: number;
  subject: string;
  confidence: number;
  reasoning: string;
}

export interface AiDuplicatesResponse {
  candidates: AiDuplicateCandidate[];
}

export interface AiKbSuggestion {
  articleId: string;
  title: string;
  slug: string;
  confidence: number;
  reasoning: string;
}

export interface AiKbSuggestionsResponse {
  suggestions: AiKbSuggestion[];
}
