export enum RequestType {
  Inquiry = 'استعلام',
  Complaint = 'شكوى',
}

// Department names now come dynamically from the Administrative Structure (localStorage departmentsList)
// Use plain string to avoid drift with enum values.
export type Department = string;

export enum RequestStatus {
  New = 'جديد',
  InProgress = 'قيد المعالجة',
  Answered = 'تم الرد',
  Closed = 'مغلق',
}

export interface Ticket {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  nationalId: string;
  requestType: RequestType;
  department: Department; // dynamic string
  details: string;
  attachments?: File[];
  status: RequestStatus;
  submissionDate: Date;
  // Diwan documentation metadata (optional)
  diwanNumber?: string;     // e.g. D-20250915-0007
  diwanDate?: string;       // ISO date string
  // Classification
  source?: 'مواطن' | 'موظف';
  // Lifecycle timestamps for statistics (all optional)
  startedAt?: Date;    // when moved to InProgress
  answeredAt?: Date;   // when moved to Answered
  closedAt?: Date;     // when moved to Closed
  // Optional reply/answer content shown to the citizen
  response?: string;
  // Attachments associated with the response (admin-side, session-only)
  responseAttachments?: File[];
  // Optional internal opinion/notes by the employee (admin)
  opinion?: string;
  // Additional departments the ticket was forwarded to
  forwardedTo?: Department[];
  // Archiving
  archived?: boolean;         // whether saved to archive explicitly
  archivedAt?: string;        // ISO date string when archived
  printSnapshotHtml?: string; // stored printable HTML snapshot
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface NewsItem {
  title: string;
  date: string;
  content: string;
}

export interface Employee {
  username: string;
  password: string;
  name: string;
  department: string;
  role: string;
  lastLogin?: string;
  employeeNumber?: string; // رقم الموظف
  nationalId?: string; // الرقم الوطني
  address?: string; // العنوان
  phone?: string;   // رقم الهاتف
  // Profile photo (Data URL stored in localStorage)
  avatarDataUrl?: string;
  // MFA Support
  mfaEnabled?: boolean;
  mfaSecret?: string; // TOTP secret (encrypted)
  mfaBackupCodes?: string[]; // encrypted backup codes
  mfaUsedBackupCodes?: string[]; // track used codes
  lastTotpCode?: string; // prevent code reuse
  lastTotpTime?: number; // timestamp of last TOTP use
  biometricEnabled?: boolean;
  mfaEnabledAt?: Date;
  passwordLastChanged?: Date;
  passwordHistory?: string[]; // hashed previous passwords
  requirePasswordChange?: boolean;
}

export enum ContactMessageStatus {
  New = 'جديد',
  InProgress = 'قيد المعالجة',
  Closed = 'مغلق',
}

export type ContactMessageType = 'طلب' | 'شكوى' | 'اقتراح';

export interface ContactMessage {
  id: string;
  name: string;
  email?: string;
  subject?: string;
  message: string;
  type: ContactMessageType;
  department?: string;
  status: ContactMessageStatus;
  submissionDate: Date;
  replies?: ContactMessageReply[];
  // Classification and documentation
  source?: 'مواطن' | 'موظف';
  diwanNumber?: string;
  diwanDate?: string; // ISO date string
  // Multi-department forwarding
  forwardedTo?: Department[];
  // Optional per-department priorities (lower means higher priority)
  forwardedPriorities?: Record<string, number>;
  // Archiving
  archived?: boolean;
  archivedAt?: string;        // ISO date string
  printSnapshotHtml?: string; // stored printable HTML snapshot
}

// رد أو تعليق أو تحويل على رسالة التواصل
export interface ContactMessageReply {
  id: string;
  messageId: string;
  authorName: string;
  authorDepartment: string;
  type: 'reply' | 'comment' | 'transfer';
  content: string;
  transferTo?: string; // القسم المحول إليه في حالة التحويل
  attachments?: ContactReplyAttachment[];
  timestamp: string;
  isRead: boolean;
}

// مرفق مع رد رسالة التواصل
export interface ContactReplyAttachment {
  name: string;
  size: number;
  type: string;
  data: string; // Base64 encoded content
}

// In-app notifications for departments (new ticket, transfer, forwarding)
export type NotificationKind = 'ticket-new' | 'ticket-forwarded' | 'ticket-moved';

export interface DepartmentNotification {
  id: string; // unique
  kind: NotificationKind;
  ticketId: string;
  department: Department; // recipient department
  message?: string;
  createdAt: Date;
  read?: boolean;
}

// Citizen satisfaction survey entries
export interface CitizenSurvey {
  id: string;              // unique ID (timestamp + random)
  rating: number;          // 1-5
  category?: string;       // optional category of interaction
  comment?: string;        // free text feedback
  createdAt: Date;         // submission time
  wouldRecommend?: boolean;// optional yes/no question
  contactEmail?: string;   // optional if user wants follow-up
  ticketId?: string;       // optional if related to a specific ticket
}

// Document reply/comment system interfaces
export interface DocumentReply {
  id: string;
  documentId: string;
  authorName: string;
  authorDepartment: string;
  type: 'reply' | 'comment' | 'forward';
  content: string;
  forwardTo?: string; // Department forwarded to
  attachments?: DocumentReplyAttachment[];
  timestamp: string;
  isRead: boolean;
}

// Attachment for document replies
export interface DocumentReplyAttachment {
  name: string;
  size: number;
  type: string;
  data: string; // Base64 encoded content
}

// --- Multi-response ticket system ---
export interface TicketResponseAttachmentMeta {
  id?: string;          // backend id (if returned later)
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storagePath?: string; // may be undefined until persisted
}

export interface TicketResponseRecord {
  id: string;
  ticketId: string;
  bodySanitized: string;
  visibility: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';
  isInternal?: boolean; // convenience flag from backend
  createdAt: string;    // ISO date string
  redactionFlags?: string[]; // applied redactions
  attachments?: TicketResponseAttachmentMeta[];
}

export interface NewTicketResponseInput {
  body: string;
  isInternal?: boolean;
  files?: File[];
}

// MFA (Multi-Factor Authentication) Types
export enum MfaFactorType {
  PASSWORD = 'password',
  TOTP = 'totp',
  RECOVERY_CODE = 'recovery_code',
  BIOMETRIC = 'biometric'
}

export interface MfaSecret {
  secret: string;
  backupCodes: string[];
  createdAt: Date;
  lastUsed?: Date;
}

export interface MfaAttempt {
  factorType: MfaFactorType;
  code: string;
  timestamp: Date;
  success: boolean;
  ip?: string;
  userAgent?: string;
}

export interface EmployeeMfa {
  username: string;
  isEnabled: boolean;
  totpSecret?: string;
  backupCodes?: string[]; // encrypted backup codes
  usedBackupCodes?: string[]; // track used codes
  lastTotpCode?: string; // prevent reuse
  lastTotpTime?: number; // timestamp
  biometricEnabled?: boolean;
  enabledAt?: Date;
  lastUsed?: Date;
  attempts?: MfaAttempt[];
}

export interface MfaSetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MfaVerificationRequest {
  username: string;
  totpCode?: string;
  backupCode?: string;
  biometricData?: string;
}

// Session Management Types
export interface ClientFingerprint {
  userAgent: string;
  ipAddress: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  cookiesEnabled: boolean;
  doNotTrack?: boolean;
  fingerprint: string; // computed hash of above properties
}

export interface SessionData {
  sessionId: string;
  userId: string;
  username: string;
  role: string;
  department?: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
  fingerprint: ClientFingerprint;
  ipHistory: string[];
  loginCount: number;
  mfaVerified: boolean;
  suspiciousActivityCount: number;
  lastRenewal: Date;
}

export interface SuspiciousActivity {
  id: string;
  sessionId: string;
  userId: string;
  type: 'IP_CHANGE' | 'USER_AGENT_CHANGE' | 'RATE_LIMIT_EXCEEDED' | 'UNAUTHORIZED_ACCESS' | 'UNUSUAL_NAVIGATION' | 'FINGERPRINT_MISMATCH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  oldValue?: string;
  newValue?: string;
  timestamp: Date;
  handled: boolean;
  action?: 'WARN' | 'FORCE_LOGOUT' | 'REQUIRE_MFA' | 'BLOCK_SESSION';
}

export interface SessionConfig {
  sessionTimeout: number; // in minutes
  renewalInterval: number; // in minutes  
  maxConcurrentSessions: number;
  requireMfaForSensitive: boolean;
  trackFingerprint: boolean;
  strictIpCheck: boolean;
  maxSuspiciousActivities: number;
  cookieSettings: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    path: string;
    domain?: string;
  };
}

export interface ActiveSession {
  sessionId: string;
  device: string;
  location: string;
  ipAddress: string;
  lastActivity: Date;
  isCurrentSession: boolean;
  isSuspicious: boolean;
}

export interface SecurityLog {
  id: string;
  sessionId: string;
  userId: string;
  event: 'LOGIN' | 'LOGOUT' | 'SESSION_RENEWAL' | 'SUSPICIOUS_ACTIVITY' | 'SECURITY_VIOLATION' | 'MFA_CHALLENGE';
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
}

// Cookie Consent Types
export interface CookieCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
  enabled: boolean;
  cookies: CookieDetails[];
}

export interface CookieDetails {
  name: string;
  description: string;
  purpose: string;
  duration: string;
  type: 'essential' | 'functional' | 'analytics' | 'marketing' | 'security';
  domain?: string;
}

export interface CookiePreferences {
  userId?: string;
  consentTimestamp: Date;
  lastUpdated: Date;
  categories: {
    essential: boolean;
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
    security: boolean;
  };
  acceptedVersion: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CookieBanner {
  isVisible: boolean;
  hasConsented: boolean;
  showDetails: boolean;
  consentVersion: string;
}

export interface DataCollection {
  category: string;
  dataType: string;
  purpose: string;
  retention: string;
  processing: string;
  sharing: string;
}

// ===== RBAC (Role-Based Access Control) System Types =====

// Role Types
export enum SystemRoleType {
  SYSTEM_ADMIN = 'مدير النظام',
  DEPARTMENT_MANAGER = 'مدير القسم',
  PROCESSOR = 'موظف معالجة',
  INQUIRY_OFFICER = 'موظف استعلامات',
  AUDITOR = 'مراجع',
  EMPLOYEE = 'موظف'
}

export interface Role {
  id: string;
  name: string;
  type: SystemRoleType;
  description: string;
  parentRoleId?: string;
  parentRole?: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions?: Permission[];
  // Hierarchical permissions inheritance
  inheritedPermissions?: Permission[];
  // Department restrictions (optional)
  departmentRestrictions?: Department[];
  // Custom attributes for role
  attributes?: Record<string, any>;
}

// Permission Types
export enum ResourceType {
  TICKETS = 'tickets',
  USERS = 'users',
  EMPLOYEES = 'employees', 
  DEPARTMENTS = 'departments',
  REPORTS = 'reports',
  AUDIT_LOGS = 'audit_logs',
  SETTINGS = 'settings',
  ROLES = 'roles',
  PERMISSIONS = 'permissions',
  NOTIFICATIONS = 'notifications',
  CONTACT_MESSAGES = 'contact_messages',
  DOCUMENTS = 'documents',
  SURVEYS = 'surveys',
  FAQ = 'faq',
  NEWS = 'news',
  ANALYTICS = 'analytics'
}

export enum ActionType {
  CREATE = 'create',
  READ = 'read', 
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  EXPORT = 'export',
  IMPORT = 'import',
  APPROVE = 'approve',
  REJECT = 'reject',
  FORWARD = 'forward',
  ASSIGN = 'assign',
  ARCHIVE = 'archive',
  RESTORE = 'restore',
  ESCALATE = 'escalate',
  COMMENT = 'comment',
  REPLY = 'reply'
}

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains';
  value: any;
  description?: string;
}

export interface Permission {
  id: string;
  resource: ResourceType;
  action: ActionType;
  conditions?: PermissionCondition[];
  description: string;
  isSystemPermission: boolean; // System permissions cannot be deleted
  createdAt: Date;
  updatedAt: Date;
  // Context information for conditional permissions
  requiresOwnership?: boolean; // Resource must be owned by user
  departmentScoped?: boolean; // Permission limited to user's department
  // Custom validation logic
  customValidator?: string; // Function name or code for complex validation
}

// User-Role Assignment
export interface UserRole {
  userId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  // Context-specific assignments
  departmentContext?: Department;
  conditions?: Record<string, any>;
}

// Role-Permission Assignment  
export interface RolePermission {
  roleId: string;
  permissionId: string;
  grantedBy: string;
  grantedAt: Date;
  conditions?: Record<string, any>;
  // Override inherited permissions
  isDenied?: boolean; // Explicitly deny this permission
}

// Authorization Context
export interface AuthorizationContext {
  userId: string;
  userDepartment?: Department;
  targetResource?: any;
  targetResourceId?: string;
  ownerId?: string;
  departmentId?: Department;
  additionalContext?: Record<string, any>;
  requestTime?: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Access Attempt Logging
export interface AccessAttempt {
  id: string;
  userId: string;
  username: string;
  resource: ResourceType;
  action: ActionType;
  resourceId?: string;
  granted: boolean;
  reason?: string; // Why access was denied
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  context?: AuthorizationContext;
  // Performance metrics
  checkDurationMs?: number;
  permissionsEvaluated?: number;
}

// Permission Check Result
export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  matchedPermissions?: Permission[];
  failedConditions?: PermissionCondition[];
  context?: AuthorizationContext;
  checkDurationMs?: number;
}

// Enhanced Employee with RBAC
export interface RbacEmployee extends Omit<Employee, 'role'> {
  id: string;
  roles: Role[];
  assignedRoles?: UserRole[];
  effectivePermissions?: Permission[];
  lastPermissionUpdate?: Date;
  // Account status
  isActive: boolean;
  isLocked?: boolean;
  lockedAt?: Date;
  lockedReason?: string;
  // Security tracking
  failedLoginAttempts?: number;
  lastFailedLogin?: Date;
  // Temporary permissions
  temporaryPermissions?: {
    permission: Permission;
    expiresAt: Date;
    grantedBy: string;
  }[];
}

// System Statistics for RBAC
export interface RbacSystemStats {
  totalRoles: number;
  totalPermissions: number;
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  systemAdmins: number;
  recentAccessAttempts: number;
  deniedAttempts: number;
  mostAccessedResources: {
    resource: ResourceType;
    count: number;
  }[];
  topActiveUsers: {
    userId: string;
    username: string;
    accessCount: number;
  }[];
}

// Role Template for common role configurations
export interface RoleTemplate {
  id: string;
  name: string;
  roleType: SystemRoleType;
  description: string;
  defaultPermissions: Permission[];
  suggestedDepartments?: Department[];
  isSystemTemplate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Bulk Operations Types
export interface BulkRoleAssignment {
  userIds: string[];
  roleIds: string[];
  assignedBy: string;
  expiresAt?: Date;
  departmentContext?: Department;
}

export interface BulkPermissionUpdate {
  roleIds: string[];
  permissionIds: string[];
  operation: 'grant' | 'revoke';
  updatedBy: string;
}

// RBAC Migration and Backup Types
export interface RbacBackup {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  roles: Role[];
  permissions: Permission[];
  userRoles: UserRole[];
  rolePermissions: RolePermission[];
  checksumValidation: string;
}

export interface RbacMigration {
  id: string;
  version: string;
  description: string;
  appliedAt: Date;
  appliedBy: string;
  changes: {
    added: any[];
    modified: any[];
    removed: any[];
  };
}

// Audit Trail for RBAC changes
export interface RbacAuditLog {
  id: string;
  entityType: 'role' | 'permission' | 'user_role' | 'role_permission';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'assign' | 'revoke';
  performedBy: string;
  timestamp: Date;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

// ===== Incident Response System Types =====

export type IncidentPhase =
  | 'detection'
  | 'containment'
  | 'investigation'
  | 'eradication'
  | 'recovery'
  | 'lessons_learned';

export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface IncidentAction {
  id: string;
  phase: IncidentPhase;
  action: string;
  result: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'INFO';
  details?: string;
  at: string; // ISO date string
}

export interface IncidentTimelineEntry {
  at: string; // ISO
  event: string;
  meta?: Record<string, any>;
}

export interface IncidentInvestigation {
  timeline: IncidentTimelineEntry[];
  rootCause?: Record<string, any> | null;
  attackVector?: string | null;
  indicators?: Record<string, any>;
  evidence?: string[]; // references/ids/notes
}

export interface IncidentRecovery {
  steps: string[];
  validation: string[];
  monitoring: string[];
}

export interface IncidentReport {
  summary: string;
  timeline: IncidentTimelineEntry[];
  rootCause?: Record<string, any> | null;
  impact?: Record<string, any> | null;
  response: {
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
  };
  recommendations: string[];
  actionItems: string[];
}

export interface Incident {
  id: string;
  title: string;
  description?: string;
  detectedAt: string; // ISO
  updatedAt: string;  // ISO
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  phase: IncidentPhase;
  severity: IncidentSeverity;
  type?: string;
  responseTeam?: { lead?: string; members?: string[] };
  affectedSystems: string[];
  compromisedAccounts: string[];
  affectedServices: string[];
  timeWindow?: { from?: string; to?: string };
  impact?: Record<string, any> | null;
  investigation?: IncidentInvestigation;
  recovery?: IncidentRecovery;
  report?: IncidentReport;
  actions: IncidentAction[];
}

export interface NewIncidentInput {
  title: string;
  description?: string;
  severity: IncidentSeverity;
  affectedSystems?: string[];
  compromisedAccounts?: string[];
  affectedServices?: string[];
  timeWindow?: { from?: string; to?: string };
}

// ===== Business Continuity (BCP) Types =====

export type DisasterSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Disaster {
  type: string; // e.g., 'انقطاع مركز البيانات', 'هجوم فدية', 'كارثة طبيعية'
  severity: DisasterSeverity;
  description?: string;
  occurredAt: string; // ISO date
  affectedSystems: string[];
  affectedServices: string[];
  impactedData?: string[];
}

export type BCPPhase =
  | 'assessment'
  | 'team_activation'
  | 'failover'
  | 'data_recovery'
  | 'service_recovery'
  | 'validation'
  | 'normalization'
  | 'failed'
  | 'completed';

export interface BCPAction {
  id: string;
  phase: BCPPhase;
  action: string;
  result: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'INFO';
  details?: string;
  at: string; // ISO
}

export interface DamageAssessment {
  affectedSystems: string[];
  affectedServices: string[];
  dataLoss?: boolean;
  estimatedDowntimeHours?: number;
  notes?: string;
}

export interface FailoverStep {
  system: string;
  secondary: string;
  completedAt: string; // ISO
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
}

export interface FailoverResult {
  primary: string[]; // affected primary systems
  secondary: string[]; // activated secondary systems
  startTime: string; // ISO
  steps: FailoverStep[];
}

export interface BCPDataRecovery {
  strategy: 'INCREMENTAL' | 'FULL' | 'SNAPSHOT' | 'NONE';
  recoveredPoints: string[]; // recovery point identifiers (timestamps, snapshot ids)
  notes?: string;
}

export interface ServiceRecoveryStatus {
  name: string;
  restarted: boolean;
  validated: boolean;
  notes?: string;
}

export interface BCPValidation {
  success: boolean;
  tests: string[];
  results: string[];
}

export interface Normalization {
  switchedBackAt?: string; // ISO when returning traffic to primary
  steps: string[];
}

export interface BCPPlan {
  id: string;
  disaster: Disaster;
  startTime: string; // ISO
  endTime?: string; // ISO
  status: 'ACTIVE' | 'FAILED' | 'COMPLETED';
  phase: BCPPhase;
  rto: { critical: number; high: number; medium: number; low: number }; // minutes
  rpo: { critical: number; high: number; medium: number; low: number }; // minutes
  // Progress tracking
  progress?: number; // 0..100
  progressByPhase?: Partial<Record<BCPPhase, number>>;
  // SLA tracking
  sla?: {
    rtoDeadline?: string; // ISO deadline for RTO
    rpoWindowMinutes?: number; // allowed data loss window
    breaches?: { kind: 'RTO' | 'RPO'; at: string; details?: string }[];
  };
  warnings?: string[];
  assessment?: DamageAssessment;
  team?: { lead?: string; members?: string[] };
  failover?: FailoverResult;
  dataRecovery?: BCPDataRecovery;
  serviceRecovery?: { services: ServiceRecoveryStatus[] };
  validation?: BCPValidation;
  normalization?: Normalization;
  actions: BCPAction[];
  error?: string;
}

export interface NewBCPInput {
  type: string;
  severity: DisasterSeverity;
  description?: string;
  affectedSystems?: string[];
  affectedServices?: string[];
}

// ===== Daily Operations (SOP 7.1) Types =====

export type DailyIssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DailyCheckEntry {
  name: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  details?: any;
}

export interface DailyIssue {
  severity: DailyIssueSeverity;
  description: string;
  action?: string;
}

export interface DailyMetrics {
  domContentLoadedMs?: number;
  loadTimeMs?: number;
  jsHeapUsedMB?: number;
  jsHeapTotalMB?: number;
  timestamp?: string; // ISO
}

export interface DailyReport {
  id: string;
  date: string; // ISO
  checks: DailyCheckEntry[];
  issues: DailyIssue[];
  metrics: DailyMetrics;
  createdAt: string; // ISO
}

// ===== Security Governance & Compliance (8.x) =====

export interface SecurityOrgUnit {
  name: string;
  children?: SecurityOrgUnit[];
}

export interface SecurityViolation {
  id: string;
  policy: string;
  context?: any;
  violations: string[];
  timestamp: string; // ISO
  auditId?: string; // link to audit logger entry
}

export interface PolicyComplianceResult {
  compliant: boolean;
  violations: string[];
}

export interface AccessControlPolicy {
  title: string;
  version: string;
  effectiveDate: string;
  rules: string[];
  // Lifecycle & ownership
  owner?: string;
  approvers?: string[];
  nextReviewDate?: string; // ISO
  lastApprovedAt?: string; // ISO
  status?: 'draft' | 'active' | 'under_review';
}

export interface PasswordPolicyRequirements {
  minLength: number;
  complexity: { uppercase: boolean; lowercase: boolean; numbers: boolean; symbols: boolean };
  expiry: number; // days
  history: number; // previous count
  lockout: { attempts: number; duration: number }; // minutes
}

export interface PasswordPolicyDoc {
  title: string;
  version: string;
  requirements: PasswordPolicyRequirements;
  // Lifecycle & ownership
  owner?: string;
  approvers?: string[];
  nextReviewDate?: string; // ISO
  lastApprovedAt?: string; // ISO
  status?: 'draft' | 'active' | 'under_review';
}

export interface EncryptionPolicyDoc {
  title: string;
  version: string;
  standards: { inTransit: string; atRest: string; keyManagement: string; hashAlgorithm: string };
  // Lifecycle & ownership
  owner?: string;
  approvers?: string[];
  nextReviewDate?: string; // ISO
  lastApprovedAt?: string; // ISO
  status?: 'draft' | 'active' | 'under_review';
}

export interface IncidentResponsePolicyDoc {
  title: string;
  version: string;
  procedures: { detection: string; containment: string; escalation: string; communication: string; documentation: string };
  // Lifecycle & ownership
  owner?: string;
  approvers?: string[];
  nextReviewDate?: string; // ISO
  lastApprovedAt?: string; // ISO
  status?: 'draft' | 'active' | 'under_review';
}

export interface SecurityPolicies {
  accessControl: AccessControlPolicy;
  passwordPolicy: PasswordPolicyDoc;
  encryptionPolicy: EncryptionPolicyDoc;
  incidentResponse: IncidentResponsePolicyDoc;
}

export interface PolicyException {
  id: string;
  policy: keyof SecurityPolicies | string;
  scope?: string; // matching hint e.g. username, route, or '*'
  reason: string;
  requestedBy: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'revoked';
  createdAt: string; // ISO
  expiresAt?: string; // ISO
}

export interface GovernanceState {
  orgStructure: SecurityOrgUnit;
  policies: SecurityPolicies;
  violations: SecurityViolation[];
  exceptions?: PolicyException[];
}

// ===== Internal Messages Types =====

export interface InternalMessageAttachment {
  name: string;
  size: number;
  type: string;
  data: string; // Base64 data URL
}

export interface InternalMessageReply {
  id: string;
  messageId: string;
  replyBy: string;          // employee name or username
  department: string;       // department of replier
  content: string;
  attachments?: InternalMessageAttachment[];
  createdAt: string;        // ISO
  type: 'reply' | 'comment' | 'opinion';
}

export interface InternalMessage {
  id: string;                      // IM-YYYYMMDD-XXXX
  kind?: string;                   // optional classification
  docIds?: string[];               // related document IDs
  subject: string;                 // عنوان/موضوع الرسالة
  title?: string;                  // توافق قديم مع بعض الواجهات
  body: string;                    // محتوى الرسالة
  priority?: 'عادي' | 'هام' | 'عاجل';
  createdAt: string;               // ISO
  updatedAt?: string;              // ISO
  source?: string;                 // مصدر الإنشاء (نظام/يدوي)
  fromEmployee?: string;           // اسم مستخدم المُرسل
  toEmployee?: string;             // اسم مستخدم المستلم (اختياري)
  fromDepartment?: string;         // قسم المُرسل
  toDepartment?: string;           // قسم واحد للمستلم (توافق)
  toDepartments?: string[];        // أقسام متعددة للمستلمين
  attachments?: InternalMessageAttachment[];
  templateName?: string;           // اسم القالب إن وُجد
  read?: boolean;                  // تم القراءة أم لا
  replies?: InternalMessageReply[];
}