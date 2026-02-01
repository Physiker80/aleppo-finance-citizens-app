import React, { useState, useEffect, createContext, useCallback, useRef, Suspense } from 'react';
import { apiFetch, setApiClientConfig, getCsrfToken, CSRF_HEADER } from './utils/apiClient';
import { formatArabicNumber, formatArabicDate } from './constants';
import { ThemeProvider } from './utils/themeManager';
import { initializeArabicNumeralsSystem } from './utils/arabicNumeralsForcer';
import Header from './components/Header';
import Footer from './components/Footer';
import BackToDashboardFab from './components/BackToDashboardFab';
import BackToTopFab from './components/BackToTopFab';
import CookieBanner from './components/CookieBanner';

// =====================================================
// 🚀 Code Splitting - Lazy Loading للصفحات
// يتم تحميل الصفحات عند الطلب فقط لتحسين الأداء
// =====================================================

// الصفحات الأساسية (تحميل فوري)
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';

// الصفحات الثانوية (تحميل كسول)
const SubmitRequestPage = React.lazy(() => import('./pages/SubmitRequestPage'));
const TrackRequestPage = React.lazy(() => import('./pages/TrackRequestPageSimple'));
const FaqPage = React.lazy(() => import('./pages/FaqPage'));
const NewsPage = React.lazy(() => import('./pages/NewsPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const ComplaintsManagementPage = React.lazy(() => import('./pages/ComplaintsManagementPage'));
const ConfirmationPage = React.lazy(() => import('./pages/ConfirmationPage'));
const EmployeeManagementPage = React.lazy(() => import('./pages/EmployeeManagementPage'));
const MFAManagementPage = React.lazy(() => import('./pages/MFAManagementPage'));
const SessionSecurityPage = React.lazy(() => import('./pages/SessionSecurityPage'));
const ToolsPage = React.lazy(() => import('./pages/ToolsPage'));

// صفحات الديوان (تحميل كسول)
const GeneralDiwanPage = React.lazy(() => import('./pages/GeneralDiwanPage'));
const DiwanAdminPage = React.lazy(() => import('./pages/DiwanAdminPage'));
const DiwanIncomePage = React.lazy(() => import('./pages/DiwanIncomePage'));
const DiwanLargeTaxpayersPage = React.lazy(() => import('./pages/DiwanLargeTaxpayersPage'));
const DiwanDebtPage = React.lazy(() => import('./pages/DiwanDebtPage'));
const DiwanImportsPage = React.lazy(() => import('./pages/DiwanImportsPage'));
const DiwanAuditPage = React.lazy(() => import('./pages/DiwanAuditPage'));
const DiwanInformaticsPage = React.lazy(() => import('./pages/DiwanInformaticsPage'));
const DiwanAdminDevelopmentPage = React.lazy(() => import('./pages/DiwanAdminDevelopmentPage'));
const DiwanInquiryPage = React.lazy(() => import('./pages/DiwanInquiryPage'));
const DiwanTreasuryPage = React.lazy(() => import('./pages/DiwanTreasuryPage'));
const InquiryComplaintsDiwanPage = React.lazy(() => import('./pages/InquiryComplaintsDiwanPage'));

// صفحات التواصل
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const ContactMessagesPage = React.lazy(() => import('./pages/ContactMessagesPage'));

// صفحات الموارد البشرية (تحميل كسول)
const HrmsPage = React.lazy(() => import('./pages/HrmsPage'));
const CoreHrPage = React.lazy(() => import('./pages/hrms/CoreHrPage'));
const PayrollPage = React.lazy(() => import('./pages/hrms/PayrollPage'));
const AttendancePage = React.lazy(() => import('./pages/hrms/AttendancePage'));
const LeavePage = React.lazy(() => import('./pages/hrms/LeavePage'));
const EssMssPage = React.lazy(() => import('./pages/hrms/EssMssPage'));
const PerformancePage = React.lazy(() => import('./pages/hrms/PerformancePage'));
const RecruitmentPage = React.lazy(() => import('./pages/hrms/RecruitmentPage'));
const ReportsPage = React.lazy(() => import('./pages/hrms/ReportsPage'));

// صفحات أخرى (تحميل كسول)
const RequestsPage = React.lazy(() => import('./pages/RequestsPage'));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage'));
const PrivacyEditorPage = React.lazy(() => import('./pages/PrivacyEditorPage'));
const TermsPage = React.lazy(() => import('./pages/TermsPage'));
const AboutSystemPage = React.lazy(() => import('./pages/AboutSystemPage'));
const DepartmentsPage = React.lazy(() => import('./pages/DepartmentsPage'));
const AdminMonitorPage = React.lazy(() => import('./pages/AdminMonitorPage'));
const InternalMessagesPage = React.lazy(() => import('./pages/InternalMessagesPage'));
const MessageAnalyticsPage = React.lazy(() => import('./pages/MessageAnalyticsPage'));
const TicketAnalyticsPage = React.lazy(() => import('./pages/TicketAnalyticsPage'));
const ObservabilityPage = React.lazy(() => import('./pages/ObservabilityPage'));
const AdvancedAnalyticsPage = React.lazy(() => import('./pages/AdvancedAnalyticsPage'));
const EmployeeProfilePage = React.lazy(() => import('./pages/EmployeeProfilePage'));
const RoleManagementPage = React.lazy(() => import('./pages/RoleManagementPage'));
const SecureRequestsPage = React.lazy(() => import('./pages/SecureRequestsPage'));
const UploadsDemoPage = React.lazy(() => import('./pages/UploadsDemoPage'));
const FeaturesDemo = React.lazy(() => import('./pages/FeaturesDemo'));
const EnhancedFeaturesPage = React.lazy(() => import('./pages/EnhancedFeaturesPage'));

// صفحات الأمان والعمليات (تحميل كسول)
const IncidentResponsePage = React.lazy(() => import('./pages/IncidentResponsePage'));
const BusinessContinuityPage = React.lazy(() => import('./pages/BusinessContinuityPage'));
const DailyOperationsPage = React.lazy(() => import('./pages/DailyOperationsPage'));
const SecurityGovernancePage = React.lazy(() => import('./pages/SecurityGovernancePage'));
const SecurityOpsDashboard = React.lazy(() => import('./pages/SecurityOpsDashboard'));
const CitizenSurveyPage = React.lazy(() => import('./pages/CitizenSurveyPage'));
const AIAssistantPage = React.lazy(() => import('./pages/AIAssistantPage'));

// صفحات نظام حجز المواعيد (تحميل كسول)
const AppointmentBookingPage = React.lazy(() => import('./pages/AppointmentBookingPage'));
const AppointmentDashboardPage = React.lazy(() => import('./pages/AppointmentDashboardPage'));
const QRCheckinPage = React.lazy(() => import('./pages/QRCheckinPage'));

// المكونات التفاعلية
import Chatbot from './components/Chatbot';

import { Ticket, Employee, ContactMessage, ContactMessageStatus, ContactMessageType, Department, DepartmentNotification, CitizenSurvey, ContactMessageReply, ContactReplyAttachment, TicketResponseRecord, NewTicketResponseInput, MfaFactorType, RbacEmployee, SystemRoleType, ResourceType, ActionType, Incident, NewIncidentInput, BCPPlan, NewBCPInput, DailyReport, GovernanceState, PolicyComplianceResult, SecurityViolation, PolicyException, InternalMessage } from './types';

// App Store Links Configuration
export interface AppStoreLinks {
  android: {
    enabled: boolean;
    url: string;
    qrCode?: string;
  };
  ios: {
    enabled: boolean;
    url: string;
    qrCode?: string;
  };
}

import { generateTicketId } from './utils/idGenerator';
import { sessionManager } from './utils/sessionManager';
import { secureStorage } from './utils/secureStorage';
import { authService } from './utils/authorizationService';
import { auditLogger } from './utils/auditLogger';
import './utils/testRbacSystem'; // تحميل أدوات الاختبار في وحدة التحكم
import { RequestStatus } from './types';
import { incidentPlan } from './utils/incidentResponse';
import { bcp } from './utils/businessContinuity';
import { dailyOps } from './utils/dailyOperations';
import { governance } from './utils/securityGovernance';
import PageLoader from './components/PageLoader';
import { ScrollProgressBar, useKeyboardShortcuts, SpotlightSearch, KeyboardShortcutsHelp } from './components/UXEnhancements';

// استيراد أدوات التتبع والنشاطات
import { addActivityLog } from './utils/activityLog';
import { trackNewTicket, trackFirstResponse, trackResolution } from './utils/responseTracking';
import { playSound } from './utils/notificationSounds';

type Theme = 'light' | 'dark';

interface AppContextType {
  tickets: Ticket[];
  notifications: DepartmentNotification[];
  // --- Multi-response ticket system ---
  ticketResponses?: Record<string, TicketResponseRecord[]>; // keyed by ticketId
  fetchTicketResponses?: (ticketId: string, force?: boolean) => Promise<TicketResponseRecord[]>;
  addTicketResponse?: (ticketId: string, input: NewTicketResponseInput) => Promise<TicketResponseRecord | null>;
  addTicket: (ticket: Omit<Ticket, 'id' | 'status'>) => string;
  findTicket: (id: string) => Ticket | undefined;
  contactMessages: ContactMessage[];
  addContactMessage: (msg: Omit<ContactMessage, 'id' | 'status' | 'submissionDate'>) => string;
  addContactMessageReply: (reply: Omit<ContactMessageReply, 'id' | 'timestamp' | 'isRead'>) => ContactMessageReply;
  updateContactMessageDepartment: (id: string, newDepartment: Department) => void;
  updateContactMessageForwardedTo: (id: string, departments: Department[]) => void;
  updateContactMessageForwardedPriorities: (id: string, priorities: Record<string, number>) => void;
  documentContactMessage: (id: string) => void;
  documentTicket: (id: string) => void;
  updateContactMessageSource: (id: string, source: 'مواطن' | 'موظف') => void;
  updateTicketSource: (id: string, source: 'مواطن' | 'موظف') => void;
  updateContactMessage?: (id: string, updates: Partial<ContactMessage>) => void;
  searchEmployeeByName: (name: string) => Employee[];
  searchEmployeeByNationalId: (nationalId: string) => Employee | null;
  surveys: CitizenSurvey[];
  addSurvey: (data: Omit<CitizenSurvey, 'id' | 'createdAt'>) => string;
  isEmployeeLoggedIn: boolean;
  currentEmployee: Employee | null;
  employeeLogin: (employee: Employee) => void;
  logout: () => void;
  employeeLogout: () => void;
  backendLogin?: (username: string, password: string) => Promise<boolean>;
  refreshSession?: () => Promise<void>;
  authLoading?: boolean;
  authError?: string | null;
  addToast?: (t: { message: string; type?: 'success' | 'error' | 'info'; ttlMs?: number }) => string;
  removeToast?: (id: string) => void;
  updateTicketStatus: (ticketId: string, newStatus: RequestStatus, responseText?: string, responseAttachments?: File[]) => void;
  updateTicketDepartment: (ticketId: string, newDepartment: Department) => void;
  updateTicketResponse: (ticketId: string, responseText: string, responseAttachments?: File[]) => void;
  updateTicketOpinion: (ticketId: string, opinion: string) => void;
  updateTicketForwardedTo: (ticketId: string, departments: Department[]) => void;
  updateTicket: (ticketId: string, updates: Partial<Ticket>) => void;
  forwardTicket: (ticketId: string, toDepartment: string, comment?: string) => void;
  markNotificationsReadForDepartment: (department: Department) => void;
  markAllNotificationsRead: () => void;
  clearReadNotifications: () => void;
  addNotification: (n: Omit<DepartmentNotification, 'id' | 'createdAt' | 'read'> & { message?: string }) => void;
  updateContactMessageStatus: (id: string, newStatus: ContactMessageStatus) => void;
  lastSubmittedId: string | null;
  theme: Theme;
  toggleTheme: () => void;
  // MFA functions
  updateEmployee: (employee: Employee) => void;
  requiresMFA: (employee: Employee) => boolean;
  onMfaSuccess: (factorUsed: MfaFactorType) => void;
  // Navigation function with automatic scroll to top
  navigateTo: (hash: string) => void;

  // ===== RBAC Authorization Functions =====
  hasPermission: (resource: ResourceType, action: ActionType, context?: any) => Promise<boolean>;
  requirePermission: (resource: ResourceType, action: ActionType, context?: any) => Promise<void>;
  canAccessTicket: (ticket: Ticket) => Promise<boolean>;
  canEditTicket: (ticket: Ticket) => Promise<boolean>;
  canDeleteTicket: (ticket: Ticket) => Promise<boolean>;
  canCreateTicket: () => Promise<boolean>;
  canViewReports: (departmentContext?: string) => Promise<boolean>;
  canManageEmployees: () => Promise<boolean>;
  canManageRoles: () => Promise<boolean>;
  canViewAuditLogs: () => Promise<boolean>;
  canExportData: () => Promise<boolean>;
  getCurrentUserRoles: () => SystemRoleType[];
  isSystemAdmin: () => boolean;
  isDepartmentManager: () => boolean;
  // Enhanced employee data with RBAC
  currentRbacEmployee: RbacEmployee | null;
  // ===== Incident Response =====
  incidents?: Incident[];
  listIncidents?: () => Incident[];
  createIncident?: (input: NewIncidentInput) => Promise<Incident>;
  updateIncident?: (incident: Incident) => void;
  runIncidentPlan?: (input: NewIncidentInput) => Promise<Incident>;
  // Demo/maintenance helpers
  replaceIncidents?: (list: Incident[]) => void;
  // ===== Business Continuity (BCP) =====
  continuityPlans?: BCPPlan[];
  listBCPPlans?: () => BCPPlan[];
  createBCP?: (input: NewBCPInput) => Promise<BCPPlan>;
  runBCP?: (input: NewBCPInput) => Promise<BCPPlan>;
  runBCPPhase?: (planId: string, phase: 'assessment' | 'team_activation' | 'failover' | 'data_recovery' | 'service_recovery' | 'validation' | 'normalization') => Promise<BCPPlan | null>;
  exportBCP?: (planId: string, format: 'csv' | 'pdf') => Promise<Blob | string | null>;
  submitBCPEvidence?: (planId: string, evidence: { kind: string; ref?: string; notes?: string }) => Promise<void>;
  requestBCPBackup?: (planId: string, target: string) => Promise<void>;
  replaceBCPPlans?: (list: BCPPlan[]) => void;
  // ===== Daily Operations (SOP 7.1) =====
  dailyReports?: DailyReport[];
  listDailyReports?: () => DailyReport[];
  runDailyChecks?: () => Promise<DailyReport>;
  exportDailyReport?: (id: string, format: 'csv' | 'pdf') => Promise<Blob | string | null>;
  replaceDailyReports?: (list: DailyReport[]) => void;
  // ===== Governance (8.x) =====
  governanceState?: GovernanceState;
  listViolations?: () => SecurityViolation[];
  enforcePolicy?: (policyName: 'accessControl' | 'passwordPolicy' | 'encryptionPolicy' | 'incidentResponse', context?: any) => Promise<PolicyComplianceResult>;
  exportGovernance?: (format: 'csv' | 'pdf') => Promise<string | Blob>;
  // Governance lifecycle & exceptions management
  listExceptions?: () => PolicyException[];
  addException?: (exc: Omit<PolicyException, 'id' | 'createdAt' | 'status'> & { status?: PolicyException['status'] }) => PolicyException | undefined;
  approveException?: (id: string, approver: string) => void;
  revokeException?: (id: string, reason?: string) => void;
  updatePolicyLifecycle?: (policy: 'accessControl' | 'passwordPolicy' | 'encryptionPolicy' | 'incidentResponse', updates: Partial<{ owner: string; approvers: string[]; nextReviewDate: string; lastApprovedAt: string; status: 'draft' | 'active' | 'under_review'; version: string }>) => void;
  // Backend security status (for encryption checks)
  securityStatus?: { tlsVersion?: string; hstsEnabled?: boolean; weakCiphers?: string[] } | null;
  refreshSecurityStatus?: () => Promise<void>;
  // ===== Internal Messages =====
  internalMessages?: InternalMessage[];
  sendInternalMessage?: (msg: Omit<InternalMessage, 'id' | 'createdAt' | 'updatedAt' | 'read' | 'replies'> & { toDepartment?: string; toDepartments?: string[] }) => string | null;
  markInternalMessageRead?: (id: string) => void;
  // ===== App Store Links (Admin Configurable) =====
  appStoreLinks?: AppStoreLinks;
  updateAppStoreLinks?: (links: AppStoreLinks) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

const App: React.FC = () => {
  // القسم المركزي الوحيد لاستلام الطلبات/الشكاوى/الرسائل
  const CENTRAL_DEPARTMENT: Department = 'إدارة الاستعلامات والشكاوى';

  // Feature flag: use backend for tickets instead of local-only storage
  const USE_BACKEND_TICKETS = (import.meta as any).env?.VITE_USE_BACKEND_TICKETS === 'true';

  // Debug: log the value on first render
  useEffect(() => {
    console.log('[App] USE_BACKEND_TICKETS =', USE_BACKEND_TICKETS);
  }, []);

  const [route, setRoute] = useState(window.location.hash || '#/');
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const raw = localStorage.getItem('tickets');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return parsed.map((t: any) => ({
        ...t,
        submissionDate: t.submissionDate ? new Date(t.submissionDate) : new Date(),
        startedAt: t.startedAt ? new Date(t.startedAt) : undefined,
        answeredAt: t.answeredAt ? new Date(t.answeredAt) : undefined,
        closedAt: t.closedAt ? new Date(t.closedAt) : undefined,
      })) as Ticket[];
    } catch {
      return [];
    }
  });
  const [notifications, setNotifications] = useState<DepartmentNotification[]>(() => {
    const raw = localStorage.getItem('notifications');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return parsed.map((n: any) => ({ ...n, createdAt: n.createdAt ? new Date(n.createdAt) : new Date() })) as DepartmentNotification[];
    } catch {
      return [];
    }
  });
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>(() => {
    const raw = localStorage.getItem('contactMessages');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return parsed.map((m: any) => ({
        ...m,
        submissionDate: m.submissionDate ? new Date(m.submissionDate) : new Date(),
      })) as ContactMessage[];
    } catch {
      return [];
    }
  });
  const [surveys, setSurveys] = useState<CitizenSurvey[]>(() => {
    try {
      const raw = localStorage.getItem('citizenSurveys');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return parsed.map((s: any) => ({ ...s, createdAt: s.createdAt ? new Date(s.createdAt) : new Date() })) as CitizenSurvey[];
    } catch { return []; }
  });
  const [isEmployeeLoggedIn, setIsEmployeeLoggedIn] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  // MFA states
  const [pendingMfaEmployee, setPendingMfaEmployee] = useState<Employee | null>(null);
  const [requiresMfaVerification, setRequiresMfaVerification] = useState(false);

  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [backendDepartments, setBackendDepartments] = useState<{ id: string; name: string; }[] | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info'; createdAt: number; ttlMs: number; }[]>([]);

  // حالات UX Enhancements
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // اختصارات لوحة المفاتيح
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      action: () => setShowSpotlight(true),
      description: 'فتح البحث السريع'
    },
    {
      key: 'n',
      ctrl: true,
      action: () => { window.location.hash = '#/submit'; },
      description: 'تقديم شكوى جديدة'
    },
    {
      key: 't',
      ctrl: true,
      action: () => { window.location.hash = '#/track'; },
      description: 'تتبع الطلبات'
    },
    {
      key: '/',
      action: () => setShowShortcutsHelp(true),
      description: 'عرض اختصارات لوحة المفاتيح'
    },
    {
      key: 'Escape',
      action: () => {
        setShowSpotlight(false);
        setShowShortcutsHelp(false);
      },
      description: 'إغلاق النوافذ'
    }
  ]);

  // Multi-responses cache (persisted in localStorage when backend is disabled)
  const [ticketResponses, setTicketResponses] = useState<Record<string, TicketResponseRecord[]>>(() => {
    try {
      const raw = localStorage.getItem('ticketResponses');
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      // تحويل التواريخ من strings إلى Date objects
      const converted: Record<string, TicketResponseRecord[]> = {};
      for (const [ticketId, responses] of Object.entries(parsed)) {
        converted[ticketId] = (responses as any[]).map(r => ({
          ...r,
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date()
        }));
      }
      return converted;
    } catch { return {}; }
  });
  // Prevent duplicate error toasts and coalesce concurrent fetches per ticket
  const responsesErrorShownRef = useRef<Record<string, number>>({});
  const pendingResponsesFetchRef = useRef<Record<string, Promise<TicketResponseRecord[]>>>({});
  // Incidents state
  const [incidents, setIncidents] = useState<Incident[]>(() => {
    try { const raw = localStorage.getItem('incidents'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [continuityPlans, setContinuityPlans] = useState<BCPPlan[]>(() => {
    try { const raw = localStorage.getItem('bcp_plans'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [dailyReports, setDailyReports] = useState<DailyReport[]>(() => {
    try { const raw = localStorage.getItem('daily_reports'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });
  const [governanceState, setGovernanceState] = useState<GovernanceState>(() => governance.state);
  // backend security posture snapshot
  const [securityStatus, setSecurityStatus] = useState<{ tlsVersion?: string; hstsEnabled?: boolean; weakCiphers?: string[] } | null>(null);
  // Internal messages state
  const [internalMessages, setInternalMessages] = useState<InternalMessage[]>(() => {
    try {
      const raw = localStorage.getItem('internalMessages');
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  });

  // App Store Links state (admin configurable)
  const [appStoreLinks, setAppStoreLinks] = useState<AppStoreLinks>(() => {
    try {
      const raw = localStorage.getItem('appStoreLinks');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    // Default values
    return {
      android: { enabled: false, url: '', qrCode: '' },
      ios: { enabled: false, url: '', qrCode: '' }
    };
  });

  // Update app store links (admin only)
  const updateAppStoreLinks = useCallback((links: AppStoreLinks) => {
    setAppStoreLinks(links);
    localStorage.setItem('appStoreLinks', JSON.stringify(links));
  }, []);

  // Helper to persist current user securely (AES-256, session-based, 30m TTL)
  const persistCurrentUser = useCallback(async (emp: Employee | null) => {
    if (!emp) {
      await secureStorage.remove('currentUser', { sessionBased: true });
      return;
    }
    await secureStorage.set('currentUser', emp, {
      encryption: 'AES-256',
      sessionBased: true,
      autoExpireMs: 30 * 60 * 1000,
    });
  }, []);

  // Load any previously stored session from secure storage on boot (fallback path)
  useEffect(() => {
    (async () => {
      try {
        const emp = await secureStorage.get<Employee>('currentUser', { sessionBased: true });
        if (emp) {
          setCurrentEmployee(emp);
          setIsEmployeeLoggedIn(true);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // ===== RBAC State =====
  const [currentRbacEmployee, setCurrentRbacEmployee] = useState<RbacEmployee | null>(() => {
    if (!currentEmployee) return null;
    // Convert legacy employee to RBAC employee
    return {
      ...currentEmployee,
      id: currentEmployee.username,
      roles: [],
      isActive: true,
      effectivePermissions: [],
      lastPermissionUpdate: new Date()
    };
  });

  // Update RBAC employee when current employee changes
  useEffect(() => {
    if (currentEmployee) {
      setCurrentRbacEmployee({
        ...currentEmployee,
        id: currentEmployee.username,
        roles: [],
        isActive: true,
        effectivePermissions: [],
        lastPermissionUpdate: new Date()
      });
    } else {
      setCurrentRbacEmployee(null);
    }
  }, [currentEmployee]);

  const addToast = ({ message, type = 'info', ttlMs = 5000 }: { message: string; type?: 'success' | 'error' | 'info'; ttlMs?: number }) => {
    const id = `T-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev, { id, message, type, createdAt: Date.now(), ttlMs }]);
    return id;
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));
  // Auto-expire
  useEffect(() => {
    if (!toasts.length) return;
    const now = Date.now();
    const nextExpiry = Math.min(...toasts.map(t => t.createdAt + t.ttlMs)) - now;
    const handle = setTimeout(() => {
      setToasts(prev => prev.filter(t => (t.createdAt + t.ttlMs) > Date.now()));
    }, Math.max(50, nextExpiry));
    return () => clearTimeout(handle);
  }, [toasts]);
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);

  // ===== Legacy Permission Helpers (Deprecated, use RBAC functions instead) =====
  const isAdmin = !!(currentEmployee && currentEmployee.role === 'مدير');
  const employeeDept = currentEmployee?.department || '';
  const legacyCanAccessTicket = (t: Ticket): boolean => {
    if (isAdmin) return true;
    if (!employeeDept) return false;
    return String(t.department) === employeeDept || (t.forwardedTo || []).includes(employeeDept);
  };
  const legacyCanEditTicket = legacyCanAccessTicket; // same rule for edit in this app

  // ===== Enhanced RBAC Permission Functions =====
  const hasPermission = async (resource: ResourceType, action: ActionType, context?: any): Promise<boolean> => {
    if (!currentEmployee) return false;

    try {
      return await authService.hasPermission(
        currentEmployee.username,
        resource,
        action,
        {
          userDepartment: currentEmployee.department,
          targetResource: context,
          ...context
        }
      );
    } catch (error) {
      console.warn('Permission check failed:', error);
      return false;
    }
  };

  const requirePermission = async (resource: ResourceType, action: ActionType, context?: any): Promise<void> => {
    if (!currentEmployee) {
      throw new Error('يجب تسجيل الدخول أولاً');
    }

    try {
      await authService.requirePermission(
        currentEmployee.username,
        resource,
        action,
        {
          userDepartment: currentEmployee.department,
          targetResource: context,
          ...context
        }
      );
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'ليس لديك صلاحية للقيام بهذا الإجراء');
    }
  };

  // Specific permission helper functions
  const canAccessTicket = async (ticket: Ticket): Promise<boolean> => {
    return hasPermission(ResourceType.TICKETS, ActionType.READ, {
      department: ticket.department,
      ticketId: ticket.id,
      ownerId: currentEmployee?.username
    });
  };

  const canEditTicket = async (ticket: Ticket): Promise<boolean> => {
    return hasPermission(ResourceType.TICKETS, ActionType.UPDATE, {
      department: ticket.department,
      ticketId: ticket.id,
      ownerId: currentEmployee?.username
    });
  };

  const canDeleteTicket = async (ticket: Ticket): Promise<boolean> => {
    return hasPermission(ResourceType.TICKETS, ActionType.DELETE, {
      department: ticket.department,
      ticketId: ticket.id,
      ownerId: currentEmployee?.username
    });
  };

  const canCreateTicket = async (): Promise<boolean> => {
    return hasPermission(ResourceType.TICKETS, ActionType.CREATE);
  };

  const canViewReports = async (departmentContext?: string): Promise<boolean> => {
    return hasPermission(ResourceType.REPORTS, ActionType.READ, {
      departmentId: departmentContext
    });
  };

  const canManageEmployees = async (): Promise<boolean> => {
    return hasPermission(ResourceType.EMPLOYEES, ActionType.UPDATE);
  };

  const canManageRoles = async (): Promise<boolean> => {
    // إذا لم يكن هناك موظف مسجل دخول، السماح فقط للمدير الافتراضي
    if (!currentEmployee) return false;

    // السماح للمدير الافتراضي
    if (currentEmployee.username === 'admin') return true;

    // التحقق من الصلاحية عبر نظام RBAC
    return hasPermission(ResourceType.ROLES, ActionType.UPDATE);
  };

  const canViewAuditLogs = async (): Promise<boolean> => {
    return hasPermission(ResourceType.AUDIT_LOGS, ActionType.READ);
  };

  const canExportData = async (): Promise<boolean> => {
    return hasPermission(ResourceType.REPORTS, ActionType.EXPORT);
  };

  const getCurrentUserRoles = (): SystemRoleType[] => {
    if (!currentRbacEmployee?.roles) return [];
    return currentRbacEmployee.roles.map(role => role.type);
  };

  const isSystemAdmin = (): boolean => {
    return getCurrentUserRoles().includes(SystemRoleType.SYSTEM_ADMIN);
  };

  const isDepartmentManager = (): boolean => {
    return getCurrentUserRoles().includes(SystemRoleType.DEPARTMENT_MANAGER);
  };

  // تحقق من وجود جلسة سابقة
  // Session refresh on mount (backend integration). Fallback to stored user if backend not reachable.
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setAuthLoading(true);
      setAuthError(null);
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.status === 200) {
          const data = await res.json();
          if (!cancelled && data?.ok && data.employee) {
            const emp: Employee = {
              username: data.employee.username,
              password: '***',
              name: data.employee.name || '—',
              department: data.employee.department || '—',
              role: data.employee.role,
              employeeNumber: data.employee.employeeNumber,
              nationalId: data.employee.nationalId
            } as any;
            setCurrentEmployee(emp);
            setIsEmployeeLoggedIn(true);
            await persistCurrentUser(emp);
          }
        } else if (res.status === 401) {
          // Not logged in; fall back to local storage legacy session if present
          try {
            const employee = await secureStorage.get<Employee>('currentUser', { sessionBased: true });
            if (employee) {
              setCurrentEmployee(employee);
              setIsEmployeeLoggedIn(true);
            }
          } catch { /* ignore */ }
        } else {
          setAuthError('تعذر التحقق من الجلسة');
        }
      } catch (e) {
        // Network error - keep legacy local user if present
        try {
          const employee = await secureStorage.get<Employee>('currentUser', { sessionBased: true });
          if (employee) { setCurrentEmployee(employee); setIsEmployeeLoggedIn(true); }
          else { setAuthError('لا يمكن الوصول للخادم'); }
        } catch { setAuthError('لا يمكن الوصول للخادم'); }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };
    init();

    // تهيئة نظام الأرقام العربية اللاتينية لضمان عدم ظهور الأرقام الهندية
    try {
      const numeralsSystem = initializeArabicNumeralsSystem();
      console.log('✅ تم تفعيل نظام الأرقام العربية اللاتينية بنجاح');
    } catch (error) {
      console.warn('⚠️ فشل في تفعيل نظام الأرقام العربية:', error);
    }

    return () => { cancelled = true; };
  }, []);

  // Fetch backend departments if feature flag enabled
  useEffect(() => {
    if (!USE_BACKEND_TICKETS) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/departments', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data?.ok) {
            setBackendDepartments(data.departments || []);
          }
        }
      } catch { }
    })();
    return () => { cancelled = true; };
  }, [USE_BACKEND_TICKETS]);

  // (moved) apiClient configuration effect will be placed after refreshSession definition

  const refreshSession = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.status === 200) {
        const data = await res.json();
        if (data?.ok && data.employee) {
          const emp: Employee = {
            username: data.employee.username,
            password: '***',
            name: data.employee.name || '—',
            department: data.employee.department || '—',
            role: data.employee.role,
            employeeNumber: data.employee.employeeNumber,
            nationalId: data.employee.nationalId
          } as any;
          setCurrentEmployee(emp);
          setIsEmployeeLoggedIn(true);
          await persistCurrentUser(emp);
        }
      } else if (res.status === 401) {
        setCurrentEmployee(null);
        setIsEmployeeLoggedIn(false);
        await secureStorage.remove('currentUser', { sessionBased: true });
      } else {
        setAuthError('خطأ في تحديث الجلسة');
      }
    } catch (e) {
      setAuthError('فشل الاتصال بالخادم');
    } finally {
      setAuthLoading(false);
    }
  };

  // Configure apiClient with refreshSession once defined (and update if reference changes)
  useEffect(() => {
    setApiClientConfig({ refreshSession });
  }, [refreshSession]);

  const backendLogin = async (username: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      if (res.status === 200) {
        const data = await res.json();
        if (data?.ok && data.employee) {
          const emp: Employee = {
            username: data.employee.username,
            password: '***',
            name: data.employee.name || '—',
            department: data.employee.department || '—',
            role: data.employee.role,
            employeeNumber: data.employee.employeeNumber,
            nationalId: data.employee.nationalId
          } as any;
          setCurrentEmployee(emp);
          setIsEmployeeLoggedIn(true);
          await persistCurrentUser(emp);
          return true;
        }
        setAuthError('استجابة غير متوقعة');
        return false;
      } else if (res.status === 401) {
        setAuthError('بيانات دخول غير صحيحة');
        return false;
      } else {
        try { const d = await res.json(); if (d?.error) setAuthError(d.error); else setAuthError('فشل تسجيل الدخول'); } catch { setAuthError('فشل تسجيل الدخول'); }
        return false;
      }
    } catch (e) {
      setAuthError('تعذر الاتصال بالخادم');
      return false;
    } finally {
      setAuthLoading(false);
    }
  };
  // persist contact messages
  useEffect(() => {
    localStorage.setItem('contactMessages', JSON.stringify(contactMessages));
  }, [contactMessages]);
  // persist tickets as well (strip non-serializable File objects)
  useEffect(() => {
    const serializable = tickets.map(t => {
      const { responseAttachments, ...rest } = t as any;
      return rest;
    });
    localStorage.setItem('tickets', JSON.stringify(serializable));
  }, [tickets]);

  // --- Multi-response helpers ---
  const fetchTicketResponses = useCallback(async (ticketId: string, force = false): Promise<TicketResponseRecord[]> => {
    // If backend integration is disabled, use localStorage cache
    if (!USE_BACKEND_TICKETS) {
      // إذا كانت الردود موجودة في الذاكرة، أعدها
      if (ticketResponses[ticketId] && ticketResponses[ticketId].length > 0) {
        return ticketResponses[ticketId];
      }
      // حاول تحميلها من localStorage
      try {
        const stored = localStorage.getItem('ticketResponses');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed[ticketId] && Array.isArray(parsed[ticketId])) {
            // تحويل التواريخ من strings إلى Date objects
            const responsesWithDates = parsed[ticketId].map((r: any) => ({
              ...r,
              createdAt: r.createdAt ? new Date(r.createdAt) : new Date()
            }));
            // تحديث الحالة إذا وجدت ردود جديدة
            if (!ticketResponses[ticketId] || ticketResponses[ticketId].length !== parsed[ticketId].length) {
              setTicketResponses(prev => ({ ...prev, [ticketId]: responsesWithDates }));
            }
            return responsesWithDates;
          }
        }
      } catch (e) {
        console.error('Error loading responses from localStorage:', e);
      }
      return [];
    }

    // Use cached data if available and not forcing a refresh
    if (!force && ticketResponses[ticketId]) return ticketResponses[ticketId];

    // Coalesce concurrent fetches for the same ticket
    if (!force && pendingResponsesFetchRef.current[ticketId]) {
      return pendingResponsesFetchRef.current[ticketId];
    }

    const p = (async () => {
      try {
        const res = await apiFetch(`/api/tickets/${encodeURIComponent(ticketId)}/responses`, { method: 'GET' });
        if (res?.ok && Array.isArray(res.responses)) {
          const mapped: TicketResponseRecord[] = res.responses.map((r: any) => ({
            id: r.id,
            ticketId,
            bodySanitized: r.bodySanitized,
            visibility: r.visibility,
            isInternal: r.isInternal,
            createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
            redactionFlags: r.redactionFlags ? (() => { try { return JSON.parse(r.redactionFlags); } catch { return []; } })() : undefined
          }));
          setTicketResponses(prev => ({ ...prev, [ticketId]: mapped }));
          return mapped;
        }
        // Unexpected response shape
        throw new Error('Unexpected response');
      } catch (e) {
        // Show at most one error toast per ticket within a cooldown window
        const now = Date.now();
        const last = responsesErrorShownRef.current[ticketId] || 0;
        const COOLDOWN_MS = 30000; // 30s cooldown per ticket
        if (now - last > COOLDOWN_MS) {
          addToast?.({ message: 'فشل تحميل الردود', type: 'error' });
          responsesErrorShownRef.current[ticketId] = now;
        }
        // Fallback to last known cache or empty list
        return ticketResponses[ticketId] || [];
      } finally {
        // Clear pending marker
        delete pendingResponsesFetchRef.current[ticketId];
      }
    })();

    pendingResponsesFetchRef.current[ticketId] = p;
    return p;
  }, [ticketResponses, USE_BACKEND_TICKETS, addToast]);

  const addTicketResponse = useCallback(async (ticketId: string, input: NewTicketResponseInput): Promise<TicketResponseRecord | null> => {
    console.log('[addTicketResponse] Called with:', { ticketId, input, USE_BACKEND_TICKETS, currentEmployee: currentEmployee?.username });

    if (!currentEmployee) {
      console.log('[addTicketResponse] No employee logged in');
      addToast?.({ message: 'يلزم تسجيل الدخول', type: 'error' });
      return null;
    }
    const body = (input.body || '').trim();
    if (!body) {
      console.log('[addTicketResponse] Empty body');
      addToast?.({ message: 'النص مطلوب', type: 'error' });
      return null;
    }

    // إنشاء معرف فريد للرد
    const responseId = 'resp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    console.log('[addTicketResponse] Created responseId:', responseId);

    const newResponse: TicketResponseRecord = {
      id: responseId,
      ticketId,
      bodySanitized: body,
      visibility: input.isInternal ? 'INTERNAL' : 'PUBLIC',
      isInternal: !!input.isInternal,
      createdAt: new Date(),
      redactionFlags: [],
      attachments: (input.files || []).map(f => ({ filename: f.name, mimeType: f.type, sizeBytes: f.size })),
      authorName: currentEmployee.username,
      authorDepartment: currentEmployee.department
    };

    // إذا كان الوضع localStorage (بدون backend)
    if (!USE_BACKEND_TICKETS) {
      console.log('[addTicketResponse] Using localStorage mode');
      try {
        // إضافة الرد إلى الحالة
        setTicketResponses(prev => {
          const updated = {
            ...prev,
            [ticketId]: [...(prev[ticketId] || []), newResponse]
          };
          console.log('[addTicketResponse] Updated ticketResponses:', updated);
          return updated;
        });

        // تحديث حالة التذكرة إلى "تم الرد" إذا كان الرد عاماً
        if (!input.isInternal) {
          setTickets(prev => prev.map(t => {
            if (t.id !== ticketId) return t;
            if (t.status === 'جديد' || t.status === 'قيد المعالجة') {
              return { ...t, status: 'تم الرد', answeredAt: t.answeredAt || new Date() } as Ticket;
            }
            return t;
          }));
        }

        console.log('[addTicketResponse] Success!');
        addToast?.({ message: 'تم إضافة الرد بنجاح', type: 'success' });
        return newResponse;
      } catch (e) {
        console.error('[addTicketResponse] Error:', e);
        addToast?.({ message: 'فشل إضافة الرد', type: 'error' });
        return null;
      }
    }

    // الوضع مع Backend - مع fallback إلى localStorage عند الفشل
    console.log('[addTicketResponse] Using backend mode');
    const tempId = 'temp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const optimistic: TicketResponseRecord = {
      id: tempId,
      ticketId,
      bodySanitized: body,
      visibility: input.isInternal ? 'INTERNAL' : 'PUBLIC',
      isInternal: !!input.isInternal,
      createdAt: new Date(),
      redactionFlags: [],
      attachments: (input.files || []).map(f => ({ filename: f.name, mimeType: f.type, sizeBytes: f.size }))
    };
    setTicketResponses(prev => ({ ...prev, [ticketId]: [...(prev[ticketId] || []), optimistic] }));
    try {
      const form = new FormData();
      form.append('body', body);
      if (input.isInternal) form.append('isInternal', 'true');
      (input.files || []).forEach(f => form.append('files', f));
      const csrf = getCsrfToken();
      const rawRes = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/responses`, {
        method: 'POST',
        body: form,
        credentials: 'include',
        headers: csrf ? { [CSRF_HEADER]: csrf } as any : undefined
      });
      if (!rawRes.ok) {
        throw new Error('HTTP ' + rawRes.status);
      }
      const data = await rawRes.json();
      if (!data?.ok || !data.response) throw new Error('استجابة غير متوقعة');
      const finalResp: TicketResponseRecord = {
        id: data.response.id,
        ticketId,
        bodySanitized: data.response.bodySanitized,
        visibility: data.response.visibility,
        isInternal: data.response.visibility !== 'PUBLIC',
        createdAt: data.response.createdAt ? new Date(data.response.createdAt) : new Date(),
      };
      setTicketResponses(prev => ({
        ...prev,
        [ticketId]: (prev[ticketId] || []).map(r => r.id === tempId ? finalResp : r)
      }));
      // Auto mark ticket answered if first public response
      setTickets(prev => prev.map(t => {
        if (t.id !== ticketId) return t;
        if ((finalResp.visibility === 'PUBLIC') && (t.status === 'جديد' || t.status === 'قيد المعالجة')) {
          return { ...t, status: 'تم الرد', answeredAt: t.answeredAt || new Date() } as Ticket;
        }
        return t;
      }));
      addToast?.({ message: 'تم إضافة الرد', type: 'success' });
      return finalResp;
    } catch (e) {
      console.warn('[addTicketResponse] Backend failed, falling back to localStorage:', e);

      // Fallback: حفظ في localStorage بدلاً من الـ rollback
      const localResponse: TicketResponseRecord = {
        ...optimistic,
        id: responseId, // استخدام ID حقيقي بدلاً من temp
        authorName: currentEmployee.username,
        authorDepartment: currentEmployee.department
      };

      setTicketResponses(prev => ({
        ...prev,
        [ticketId]: (prev[ticketId] || []).map(r => r.id === tempId ? localResponse : r)
      }));

      // تحديث حالة التذكرة
      if (!input.isInternal) {
        setTickets(prev => prev.map(t => {
          if (t.id !== ticketId) return t;
          if (t.status === 'جديد' || t.status === 'قيد المعالجة') {
            return { ...t, status: 'تم الرد', answeredAt: t.answeredAt || new Date() } as Ticket;
          }
          return t;
        }));
      }

      // حفظ في localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('ticketResponses') || '{}');
        stored[ticketId] = [...(stored[ticketId] || []), localResponse];
        localStorage.setItem('ticketResponses', JSON.stringify(stored));
      } catch { }

      addToast?.({ message: 'تم إضافة الرد (محلياً)', type: 'success' });
      return localResponse;
    }
  }, [USE_BACKEND_TICKETS, currentEmployee, addToast, setTicketResponses, setTickets]);
  // persist ticket responses (only when backend is disabled)
  useEffect(() => {
    if (!USE_BACKEND_TICKETS) {
      try { localStorage.setItem('ticketResponses', JSON.stringify(ticketResponses)); } catch { }
    }
  }, [ticketResponses, USE_BACKEND_TICKETS]);
  // persist notifications
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);
  // persist surveys
  useEffect(() => {
    localStorage.setItem('citizenSurveys', JSON.stringify(surveys));
  }, [surveys]);
  // persist incidents
  useEffect(() => {
    try { localStorage.setItem('incidents', JSON.stringify(incidents)); } catch { }
  }, [incidents]);
  // persist BCP plans
  useEffect(() => {
    try { localStorage.setItem('bcp_plans', JSON.stringify(continuityPlans)); } catch { }
  }, [continuityPlans]);
  // persist daily reports
  useEffect(() => {
    try { localStorage.setItem('daily_reports', JSON.stringify(dailyReports)); } catch { }
  }, [dailyReports]);
  // persist internal messages
  useEffect(() => {
    try { localStorage.setItem('internalMessages', JSON.stringify(internalMessages)); } catch { }
  }, [internalMessages]);
  // subscribe governance updates
  useEffect(() => {
    governance.onUpdate = (st) => setGovernanceState(st);
  }, []);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = window.localStorage.getItem('theme') as Theme;
      if (storedTheme) return storedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // ===== Internal Messages helpers =====
  const sendInternalMessage = (msg: Omit<InternalMessage, 'id' | 'createdAt' | 'updatedAt' | 'read' | 'replies'> & { toDepartment?: string; toDepartments?: string[] }): string | null => {
    // Basic validation
    const subject = (msg.subject || '').trim();
    const body = (msg.body || '').trim();
    if (!subject || !body) { addToast?.({ message: 'الموضوع والمحتوى مطلوبان', type: 'error' }); return null; }
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const newId = `IM-${datePart}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const toDeps: string[] | undefined = (msg.toDepartments && msg.toDepartments.length) ? msg.toDepartments : (msg.toDepartment ? [msg.toDepartment] : undefined);
    const record: InternalMessage = {
      id: newId,
      kind: msg.kind,
      docIds: msg.docIds,
      subject,
      title: msg.title || subject,
      body,
      priority: msg.priority as any,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      source: msg.source || 'نظام داخلي',
      fromEmployee: msg.fromEmployee || currentEmployee?.username,
      toEmployee: msg.toEmployee,
      fromDepartment: msg.fromDepartment || currentEmployee?.department,
      toDepartment: msg.toDepartment,
      toDepartments: toDeps,
      attachments: msg.attachments,
      templateName: msg.templateName,
      read: false,
      replies: []
    };
    setInternalMessages(prev => [record, ...prev]);
    addToast?.({ message: 'تم إرسال الرسالة الداخلية', type: 'success' });
    return newId;
  };

  const markInternalMessageRead = (id: string) => {
    setInternalMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  };

  // دالة التوجيه العامة مع الانتقال إلى أعلى الصفحة
  const navigateTo = useCallback((hash: string) => {
    window.location.hash = hash;
    // انتقال فوري إلى أعلى الصفحة
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 50);
  }, []);

  const handleHashChange = useCallback(() => {
    const raw = window.location.hash || '#/'
    const newRoute = raw.split('?')[0];
    if (newRoute === '#/dashboard' && !isEmployeeLoggedIn) {
      window.location.hash = '#/login';
      setRoute('#/login');
    } else {
      setRoute(newRoute);
    }

    // الانتقال إلى أعلى الصفحة عند تغيير الـ route
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 50);
  }, [isEmployeeLoggedIn]);
  const listIncidents = useCallback(() => {
    try { const raw = localStorage.getItem('incidents'); return raw ? JSON.parse(raw) as Incident[] : []; } catch { return []; }
  }, []);

  const createIncident = useCallback(async (input: NewIncidentInput) => {
    const inc = await incidentPlan.createIncident(input);
    setIncidents(prev => [inc, ...prev]);
    addToast?.({ message: `تم إنشاء حادث ${inc.id}`, type: 'success' });
    return inc;
  }, []);

  const updateIncident = useCallback((incident: Incident) => {
    setIncidents(prev => prev.map(i => i.id === incident.id ? incident : i));
  }, []);

  // Replace incidents list (for demo seeding/clearing)
  const replaceIncidents = useCallback((list: Incident[]) => {
    setIncidents(list);
  }, []);

  // Subscribe to plan updates to reflect in state
  useEffect(() => {
    incidentPlan.onUpdate = (inc) => {
      setIncidents(prev => {
        const idx = prev.findIndex(i => i.id === inc.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = inc;
          return next;
        }
        return [inc, ...prev];
      });
    };
  }, []);

  const runIncidentPlan = useCallback(async (input: NewIncidentInput) => {
    const inc = await incidentPlan.handleIncident(input);
    addToast?.({ message: `اكتملت خطة الحادث ${inc.id}`, type: 'success' });
    return inc;
  }, []);

  // ===== BCP helpers =====
  const listBCPPlans = useCallback(() => {
    try { const raw = localStorage.getItem('bcp_plans'); return raw ? JSON.parse(raw) as BCPPlan[] : []; } catch { return []; }
  }, []);

  const createBCP = useCallback(async (input: NewBCPInput) => {
    const plan = await bcp.create(input);
    setContinuityPlans(prev => [plan, ...prev]);
    addToast?.({ message: `تم إنشاء خطة استمرارية ${plan.id}`, type: 'success' });
    return plan;
  }, []);

  const runBCP = useCallback(async (input: NewBCPInput) => {
    const plan = await bcp.activateDisasterRecovery(input);
    addToast?.({ message: `اكتملت خطة الاستمرارية ${plan.id}`, type: 'success' });
    return plan;
  }, []);

  const runBCPPhase = useCallback(async (planId: string, phase: any) => {
    const plan = continuityPlans.find(p => p.id === planId);
    if (!plan) return null;
    const updated = await bcp.runPhase({ ...plan }, phase);
    return updated;
  }, [continuityPlans]);

  const exportBCP = useCallback(async (planId: string, format: 'csv' | 'pdf') => {
    const plan = (continuityPlans.find(p => p.id === planId));
    if (!plan) return null;
    if (format === 'csv') {
      return bcp.exportCSV(plan);
    }
    const blob = await bcp.exportPDF(plan);
    return blob;
  }, [continuityPlans]);

  const submitBCPEvidence = useCallback(async (planId: string, evidence: { kind: string; ref?: string; notes?: string }) => {
    const plan = continuityPlans.find(p => p.id === planId);
    if (!plan) return;
    await bcp.submitEvidence(plan, evidence);
    addToast?.({ message: 'تم إرسال الأدلة (وهمية)', type: 'info' });
  }, [continuityPlans]);

  const requestBCPBackup = useCallback(async (planId: string, target: string) => {
    const plan = continuityPlans.find(p => p.id === planId);
    if (!plan) return;
    await bcp.requestBackup(plan, target);
    addToast?.({ message: 'تم إرسال طلب النسخ الاحتياطي (وهمي)', type: 'info' });
  }, [continuityPlans]);

  // Replace BCP plans list (for demo seeding/clearing)
  const replaceBCPPlans = useCallback((list: BCPPlan[]) => {
    setContinuityPlans(list);
  }, []);

  // Subscribe to BCP updates
  useEffect(() => {
    bcp.onUpdate = (plan) => {
      setContinuityPlans(prev => {
        const idx = prev.findIndex(p => p.id === plan.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = plan; return next; }
        return [plan, ...prev];
      });
    };
  }, []);

  // Fetch backend security status (best-effort)
  const refreshSecurityStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/security/status', { credentials: 'include' });
      if (r.ok) {
        const data = await r.json();
        if (data) {
          setSecurityStatus({
            tlsVersion: data.tlsVersion || data.tls || data.protocol,
            hstsEnabled: data.hstsEnabled ?? data.hsts ?? false,
            weakCiphers: data.weakCiphers || data.weak || []
          });
          return;
        }
      }
    } catch { }
    // fallback: localStorage snapshot if any
    try {
      const raw = localStorage.getItem('security_status');
      if (raw) {
        const snap = JSON.parse(raw);
        setSecurityStatus({
          tlsVersion: snap.tlsVersion || snap.tls || snap.protocol,
          hstsEnabled: snap.hstsEnabled ?? snap.hsts ?? false,
          weakCiphers: snap.weakCiphers || snap.weak || []
        });
        return;
      }
    } catch { }
    // final fallback: unknown
    setSecurityStatus(null);
  }, []);

  useEffect(() => {
    refreshSecurityStatus();
  }, [refreshSecurityStatus]);

  // ===== Daily Ops helpers =====
  const listDailyReports = useCallback(() => {
    try { const raw = localStorage.getItem('daily_reports'); return raw ? JSON.parse(raw) as DailyReport[] : []; } catch { return []; }
  }, []);

  const runDailyChecks = useCallback(async () => {
    const r = await dailyOps.performDailyChecks();
    setDailyReports(prev => [r, ...prev]);
    addToast?.({ message: 'اكتملت فحوصات اليوم', type: 'success' });
    return r;
  }, []);

  const exportDailyReport = useCallback(async (id: string, format: 'csv' | 'pdf') => {
    const r = dailyReports.find(d => d.id === id) || listDailyReports().find(d => d.id === id);
    if (!r) return null;
    if (format === 'csv') return dailyOps.exportCSV(r);
    return await dailyOps.exportPDF(r);
  }, [dailyReports, listDailyReports]);

  useEffect(() => {
    dailyOps.onUpdate = (r) => setDailyReports(prev => [r, ...prev.filter(x => x.id !== r.id)]);
  }, []);

  // Replace daily reports list (for demo seeding/clearing)
  const replaceDailyReports = useCallback((list: DailyReport[]) => {
    setDailyReports(list);
  }, []);


  useEffect(() => {
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [handleHashChange]);

  // انتقال إلى أعلى الصفحة عند تحميل التطبيق لأول مرة
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const addTicket = (ticketData: Omit<Ticket, 'id' | 'status'>) => {
    // Backend path (feature flagged)
    if (USE_BACKEND_TICKETS) {
      // Department selection heuristic: find department whose name includes a core keyword of CENTRAL_DEPARTMENT else fallback first
      const targetDept = backendDepartments?.find(d => CENTRAL_DEPARTMENT.includes(d.name) || d.name.includes('شكاوى')) || backendDepartments?.[0];
      if (targetDept) {
        const tempId = `TEMP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        // Async create without blocking return (optimistic UI)
        (async () => {
          try {
            const payload = {
              departmentId: targetDept.id,
              citizenName: ticketData.fullName,
              citizenNationalId: ticketData.nationalId,
              type: ticketData.requestType
            };
            const data: any = await apiFetch('/api/tickets', { method: 'POST', body: payload as any });
            if (data?.ok && data.ticket) {
              const backendId = data.ticket.id;
              // تحويل التواريخ من strings إلى Date objects
              const ticketWithDates = {
                ...data.ticket,
                submissionDate: data.ticket.submissionDate ? new Date(data.ticket.submissionDate) : new Date(),
                startedAt: data.ticket.startedAt ? new Date(data.ticket.startedAt) : undefined,
                answeredAt: data.ticket.answeredAt ? new Date(data.ticket.answeredAt) : undefined,
                closedAt: data.ticket.closedAt ? new Date(data.ticket.closedAt) : undefined,
              };
              setTickets(prev => prev.map(t => t.id === tempId ? { ...ticketWithDates, id: backendId } : t));
              setLastSubmittedId(backendId);
              addToast?.({ message: `تم إنشاء التذكرة ${backendId} بنجاح`, type: 'success' });
              return;
            }
            throw new Error('استجابة غير متوقعة');
          } catch (e: any) {
            setTickets(prev => prev.filter(t => t.id !== tempId));
            addToast?.({ message: e?.message || 'فشل إنشاء التذكرة', type: 'error' });
          }
        })();
        // Insert optimistic ticket immediately
        const optimistic: Ticket = {
          id: tempId,
          status: RequestStatus.New,
          fullName: ticketData.fullName,
          phone: ticketData.phone,
          email: ticketData.email,
          nationalId: ticketData.nationalId,
          requestType: ticketData.requestType,
          department: ticketData.department,
          details: ticketData.details,
          submissionDate: new Date(),
          source: ticketData.source,
          attachments: ticketData.attachments,
          forwardedTo: [],
        };
        setTickets(prev => [...prev, optimistic]);
        setLastSubmittedId(tempId);
        return tempId;
      }
    }
    // السماح بإدخال معرف يدوي مخزّن مؤقتاً في localStorage (مفتاح manualTicketId)
    // إذا وُجد وأصبح يستخدم الآن سيتم استهلاكه وحذفه لعدم التكرار.
    let manualId: string | null = null;
    try {
      const rawManual = localStorage.getItem('manualTicketId');
      if (rawManual) {
        manualId = rawManual.trim();
        // مسح بعد الاستهلاك
        localStorage.removeItem('manualTicketId');
      }
    } catch { }
    let newId = (manualId && manualId.length > 3) ? manualId : generateTicketId();
    // في حال حدث تكرار (مثلاً نسيان التحقق في واجهة الإرسال) نولد معرفاً جديداً آلياً
    if (tickets.some(t => t.id.toUpperCase() === newId.toUpperCase())) {
      newId = generateTicketId();
    }

    const newTicket: Ticket = {
      id: newId,
      status: RequestStatus.New,
      ...ticketData,
      // استخدام القسم الممرر من الطلب أو الافتراضي (الديوان العام)
      department: ticketData.department || CENTRAL_DEPARTMENT,
      // الحفاظ على الإحالات إذا وجدت
      forwardedTo: ticketData.forwardedTo || [],
    };
    setTickets(prevTickets => [...prevTickets, newTicket]);

    // تسجيل النشاط وتتبع وقت الاستجابة
    try {
      addActivityLog({
        type: 'ticket_create',
        description: `تم إنشاء تذكرة جديدة: ${newTicket.id}`,
        details: { ticketId: newTicket.id, department: CENTRAL_DEPARTMENT, requestType: ticketData.requestType },
        severity: 'success'
      });
      trackNewTicket(newTicket.id, CENTRAL_DEPARTMENT as string, 'medium');
      playSound('newTicket');
    } catch { }

    // Notify target department of new ticket
    try {
      const dep = CENTRAL_DEPARTMENT;
      if (dep) {
        setNotifications(prev => [
          {
            id: `N-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            kind: 'ticket-new',
            ticketId: newTicket.id,
            department: dep,
            message: `طلب جديد (${newTicket.id}) وارد إلى قسم ${dep}`,
            createdAt: new Date(),
            read: false,
          },
          ...prev,
        ]);
      }
    } catch { }
    setLastSubmittedId(newTicket.id);
    return newId;
  };

  const addContactMessage = (msg: Omit<ContactMessage, 'id' | 'status' | 'submissionDate'>) => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const uniquePart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newId = `MSG-${datePart}-${uniquePart}`;
    // توجيه إجباري إلى إدارة الاستعلامات والشكاوى وإلغاء أي إحالات أولية
    const newMsg: ContactMessage = {
      id: newId,
      status: ContactMessageStatus.New,
      submissionDate: now,
      ...msg,
      department: CENTRAL_DEPARTMENT,
      forwardedTo: [],
    };
    setContactMessages(prev => [newMsg, ...prev]);
    return newId;
  };

  const addSurvey = (data: Omit<CitizenSurvey, 'id' | 'createdAt'>) => {
    const id = `SV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const survey: CitizenSurvey = { id, createdAt: new Date(), ...data };
    setSurveys(prev => [survey, ...prev]);
    return id;
  };

  // الردود على رسائل التواصل (تُحفظ في localStorage: contactMessageReplies)
  const addContactMessageReply = (payload: Omit<ContactMessageReply, 'id' | 'timestamp' | 'isRead'>): ContactMessageReply => {
    const newReply: ContactMessageReply = {
      id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      ...payload,
    };
    try {
      const raw = localStorage.getItem('contactMessageReplies');
      const all = raw ? JSON.parse(raw) : [];
      all.push(newReply);
      localStorage.setItem('contactMessageReplies', JSON.stringify(all));
    } catch {/* ignore storage errors */ }
    // في حال كان الرد عبارة عن تحويل، لا نغير القسم هنا تلقائياً — استخدم updateContactMessageDepartment صراحةً
    return newReply;
  };

  // تحديث قسم رسالة التواصل
  const updateContactMessageDepartment = (id: string, newDepartment: Department) => {
    // منع تغيير القسم: يبقى دائماً في الإدارة المركزية
    setContactMessages(prev => prev.map(m => m.id === id ? { ...m, department: CENTRAL_DEPARTMENT } : m));
  };

  const updateContactMessageForwardedTo = (id: string, departments: Department[]) => {
    // إلغاء الإحالات: تبقى فارغة دائماً
    setContactMessages(prev => prev.map(m => m.id === id ? { ...m, forwardedTo: [] } : m));
  };

  const updateContactMessageForwardedPriorities = (id: string, priorities: Record<string, number>) => {
    setContactMessages(prev => prev.map(m => m.id === id ? { ...m, forwardedPriorities: priorities } : m));
  };

  // Update a contact message generically (used for archiving, snapshots, etc.)
  const updateContactMessage = (id: string, updates: Partial<ContactMessage>) => {
    setContactMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const findTicket = (id: string) => {
    return tickets.find(ticket => ticket.id.toUpperCase() === id.toUpperCase());
  };

  useEffect(() => {
    // Initialize default employees if not present
    const employeesData = localStorage.getItem('employees');
    if (!employeesData) {
      const defaultEmployees: Employee[] = [
        {
          username: 'admin',
          password: 'admin123',
          name: 'مدير النظام',
          department: 'الإدارة',
          role: 'مدير',
          employeeNumber: 'EMP001',
          nationalId: '01234567890'
        },
        {
          username: 'finance1',
          password: 'finance123',
          name: 'أحمد مستخدم',
          department: 'المالية',
          role: 'موظف',
          employeeNumber: 'EMP002',
          nationalId: '01234567891'
        },
        {
          username: 'hr1',
          password: 'hr123',
          name: 'فاطمة علي',
          department: 'الموارد البشرية',
          role: 'موظف',
          employeeNumber: 'EMP003',
          nationalId: '01234567892'
        },
        {
          username: 'it1',
          password: 'it123',
          name: 'محمد حسن',
          department: 'تكنولوجيا المعلومات',
          role: 'موظف',
          employeeNumber: 'EMP004',
          nationalId: '01234567893'
        },
        {
          username: 'legal1',
          password: 'legal123',
          name: 'سارة أحمد',
          department: 'الشؤون القانونية',
          role: 'موظف',
          employeeNumber: 'EMP005',
          nationalId: '01234567894'
        }
      ];
      localStorage.setItem('employees', JSON.stringify(defaultEmployees));
    }
  }, []);

  // Session validation and renewal interval
  useEffect(() => {
    if (!isEmployeeLoggedIn || !currentEmployee) {
      return;
    }

    const sessionValidationInterval = setInterval(() => {
      try {
        // Get current user's active sessions
        const activeSessions = sessionManager.getUserActiveSessions(currentEmployee.username);

        if (activeSessions.length === 0) {
          // No active session found, force logout
          console.warn('لا توجد جلسة نشطة، تسجيل خروج تلقائي');
          logout();
          return;
        }

        // Check for suspicious activity on current session
        const currentSession = activeSessions.find(s => s.isCurrentSession);
        if (currentSession) {
          // Generate current fingerprint for comparison
          const currentFingerprint = sessionManager.generateClientFingerprint();
          const suspiciousActivities = sessionManager.checkSuspiciousActivity(
            currentSession.sessionId,
            currentFingerprint
          );

          if (suspiciousActivities.length > 0) {
            console.warn('تم اكتشاف نشاط مشبوه:', suspiciousActivities);

            // Log security violation
            sessionManager.logSecurityEvent(
              currentSession.sessionId,
              currentEmployee.username,
              'SUSPICIOUS_ACTIVITY',
              `Suspicious activity detected: ${suspiciousActivities.map(a => a.type).join(', ')}`,
              'WARN'
            );

            // Optionally terminate sessions on critical security issues
            const criticalActivities = suspiciousActivities.filter(a => a.severity === 'CRITICAL');
            if (criticalActivities.length > 0) {
              activeSessions.forEach(session => {
                sessionManager.terminateSession(session.sessionId, 'Critical security threat detected');
              });
              logout();
              alert('تم اكتشاف نشاط أمني مشبوه، تم إنهاء جميع الجلسات لحماية حسابك');
              return;
            }
          }
        }

        // Renew session periodically
        if (currentSession) {
          const timeSinceLastRenewal = Date.now() - currentSession.lastActivity.getTime();
          if (timeSinceLastRenewal > 15 * 60 * 1000) { // 15 minutes
            sessionManager.renewSession(currentSession.sessionId);
          }
        }
      } catch (error) {
        console.error('خطأ في التحقق من صحة الجلسة:', error);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(sessionValidationInterval);
  }, [isEmployeeLoggedIn, currentEmployee]);

  const employeeLogin = async (usernameOrEmployee: string | Employee, password?: string): Promise<boolean> => {
    const employeesData = localStorage.getItem('employees');
    const employees: Employee[] = employeesData ? JSON.parse(employeesData) : [];
    let employee: Employee | undefined;

    if (typeof usernameOrEmployee === 'string') {
      employee = employees.find(emp => emp.username === usernameOrEmployee && emp.password === password);
    } else {
      employee = employees.find(emp => emp.username === usernameOrEmployee.username && emp.password === usernameOrEmployee.password);
    }

    if (employee) {
      try {
        // Create secure session for the user
        const session = sessionManager.createSession(
          employee.username,
          employee.username,
          employee.role || 'موظف',
          employee.department,
          false // MFA not verified yet
        );

        // Check if MFA is enabled for this employee
        if (employee.mfaEnabled) {
          setPendingMfaEmployee(employee);
          setRequiresMfaVerification(true);
          return true; // Initial authentication successful, but need MFA
        } else {
          // No MFA required, complete login
          setCurrentEmployee(employee);
          setIsEmployeeLoggedIn(true);
          await persistCurrentUser(employee);

          // Log successful session creation
          sessionManager.logSecurityEvent(session.sessionId, employee.username, 'LOGIN', 'User logged in successfully', 'INFO');
          return true;
        }
      } catch (error) {
        console.error('فشل في إنشاء جلسة آمنة:', error);
        // Log failed session creation (without sessionId)
        const tempSessionId = Date.now().toString();
        sessionManager.logSecurityEvent(tempSessionId, employee.username, 'SECURITY_VIOLATION', 'Failed to create secure session', 'ERROR');
        return false;
      }
    }

    // Log failed login attempt
    if (typeof usernameOrEmployee === 'string') {
      const tempSessionId = Date.now().toString();
      sessionManager.logSecurityEvent(tempSessionId, usernameOrEmployee, 'SECURITY_VIOLATION', 'Invalid credentials provided', 'WARN');
    }
    return false;
  };

  const logout = () => {
    // Terminate active session if logged in
    if (currentEmployee) {
      try {
        // Find and terminate all active sessions for this user
        const activeSessions = sessionManager.getUserActiveSessions(currentEmployee.username);
        activeSessions.forEach(session => {
          sessionManager.terminateSession(session.sessionId, 'User logout');
        });
      } catch (error) {
        console.error('خطأ في إنهاء الجلسة:', error);
      }
    }

    setCurrentEmployee(null);
    setIsEmployeeLoggedIn(false);
    setPendingMfaEmployee(null);
    setRequiresMfaVerification(false);
    secureStorage.remove('currentUser', { sessionBased: true }).catch(() => { });
    if (route === '#/dashboard') {
      window.location.hash = '#/';
    }
    // Attempt backend logout (non-blocking)
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => { });
  };

  // MFA helper functions
  const updateEmployee = (updatedEmployee: Employee) => {
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    const index = employees.findIndex((emp: Employee) => emp.username === updatedEmployee.username);
    if (index !== -1) {
      employees[index] = updatedEmployee;
      localStorage.setItem('employees', JSON.stringify(employees));

      // If this is the current employee, update the current state
      if (currentEmployee && currentEmployee.username === updatedEmployee.username) {
        setCurrentEmployee(updatedEmployee);
        persistCurrentUser(updatedEmployee);
      }
    }
  };

  const requiresMFA = (employee: Employee): boolean => {
    return employee.mfaEnabled || false;
  };

  const onMfaSuccess = (factorUsed: MfaFactorType) => {
    if (pendingMfaEmployee) {
      try {
        // Update the session to mark MFA as verified
        const session = sessionManager.createSession(
          pendingMfaEmployee.username,
          pendingMfaEmployee.username,
          pendingMfaEmployee.role || 'موظف',
          pendingMfaEmployee.department,
          true // MFA verified
        );

        // Update last TOTP usage if TOTP was used
        let updatedEmployee = pendingMfaEmployee;
        if (factorUsed === 'totp') {
          // This would normally be handled by the MFAManager, but for simplicity we'll just clear the state
        }

        setCurrentEmployee(updatedEmployee);
        setIsEmployeeLoggedIn(true);
        persistCurrentUser(updatedEmployee);

        // Log successful MFA verification
        sessionManager.logSecurityEvent(session.sessionId, updatedEmployee.username, 'MFA_CHALLENGE', `MFA verification successful using ${factorUsed}`, 'INFO');

        // Clear MFA verification state
        setPendingMfaEmployee(null);
        setRequiresMfaVerification(false);
      } catch (error) {
        console.error('خطأ في إنشاء جلسة بعد MFA:', error);
        // Clear MFA state on error
        setPendingMfaEmployee(null);
        setRequiresMfaVerification(false);
      }
    }
  };

  // HR Database Search Functions
  const searchEmployeeByName = (name: string): Employee[] => {
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    return employees.filter((emp: Employee) =>
      emp.name && emp.name.toLowerCase().includes(name.toLowerCase())
    );
  };

  const searchEmployeeByNationalId = (nationalId: string): Employee | null => {
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    return employees.find((emp: Employee) => emp.nationalId === nationalId) || null;
  };

  // Diwan documentation helper: daily counter stored in localStorage (per yyyyMMdd)
  const getNextDiwanNumber = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const key = `diwanCounter_${today}`;
    let counter = 0;
    try { counter = parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch { }
    counter += 1;
    try { localStorage.setItem(key, String(counter)); } catch { }
    const seq = String(counter).padStart(4, '0');
    return { number: `D-${today}-${seq}`, date: new Date().toISOString() };
  };

  const documentContactMessage = (id: string) => {
    const { number, date } = getNextDiwanNumber();
    setContactMessages(prev => prev.map(m => m.id === id ? { ...m, diwanNumber: number, diwanDate: date } as ContactMessage : m));
  };

  const documentTicket = (id: string) => {
    const { number, date } = getNextDiwanNumber();
    setTickets(prev => prev.map(t => t.id === id ? { ...t, diwanNumber: number, diwanDate: date } as Ticket : t));
  };

  const updateContactMessageSource = (id: string, source: 'مواطن' | 'موظف') => {
    setContactMessages(prev => prev.map(m => m.id === id ? { ...m, source } as ContactMessage : m));
  };

  const updateTicketSource = (id: string, source: 'مواطن' | 'موظف') => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, source } as Ticket : t));
  };

  const updateTicketStatus = (ticketId: string, newStatus: RequestStatus, responseText?: string, responseAttachments?: File[]) => {
    const backendMap: Record<RequestStatus, string> = {
      [RequestStatus.New]: 'NEW',
      [RequestStatus.InProgress]: 'IN_PROGRESS',
      [RequestStatus.Answered]: 'ANSWERED',
      [RequestStatus.Closed]: 'CLOSED'
    } as const;
    const inverseMap: Record<string, RequestStatus> = {
      NEW: RequestStatus.New,
      IN_PROGRESS: RequestStatus.InProgress,
      ANSWERED: RequestStatus.Answered,
      CLOSED: RequestStatus.Closed
    } as const;

    // Optimistic local update
    let previous: Ticket | undefined;
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      previous = t;
      if (!canEditTicket(t)) return t;
      const now = new Date();
      const patch: Partial<Ticket> = { status: newStatus };
      if (newStatus === RequestStatus.InProgress && !t.startedAt) patch.startedAt = now;
      if (newStatus === RequestStatus.Answered) {
        patch.answeredAt = now;
        if (responseText && responseText.trim()) patch.response = responseText.trim();
        if (responseAttachments && responseAttachments.length) patch.responseAttachments = responseAttachments;
      }
      if (newStatus === RequestStatus.Closed) patch.closedAt = now;
      return { ...t, ...patch };
    }));

    // تسجيل النشاط وتتبع حالة التذكرة
    try {
      addActivityLog({
        type: 'ticket_update',
        description: `تم تحديث حالة التذكرة ${ticketId} إلى: ${newStatus}`,
        userId: currentEmployee?.username,
        details: { ticketId, oldStatus: previous?.status, newStatus },
        severity: 'info'
      });
      if (newStatus === RequestStatus.Closed) {
        trackResolution(ticketId);
      }
      if (newStatus === RequestStatus.Answered) {
        trackFirstResponse(ticketId, currentEmployee?.username);
      }
    } catch { }

    if (USE_BACKEND_TICKETS) {
      (async () => {
        try {
          await apiFetch(`/api/tickets/${ticketId}/status`, {
            method: 'PATCH',
            body: { status: backendMap[newStatus] } as any
          });
          addToast?.({ message: `تم تحديث حالة التذكرة ${ticketId}`, type: 'success' });
        } catch (e: any) {
          // Revert
          setTickets(prev => prev.map(t => t.id === ticketId && previous ? previous : t));
          addToast?.({ message: e?.message || 'فشل تحديث الحالة', type: 'error' });
        }
      })();
    }
  };

  const updateContactMessageStatus = (id: string, newStatus: ContactMessageStatus) => {
    setContactMessages(prev => prev.map(m => {
      if (m.id !== id) return m;
      // Restrict updates to admin or same department messages
      if (!isAdmin && employeeDept && m.department && m.department !== employeeDept) return m;
      if (!isAdmin && employeeDept && !m.department) return m; // messages without department editable by admin only
      return { ...m, status: newStatus };
    }));
  };

  const updateTicketDepartment = (ticketId: string, newDepartment: Department) => {
    // منع النقل: يبقى القسم مركزياً دائماً
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, department: CENTRAL_DEPARTMENT } : t));
  };

  const updateTicketResponse = (ticketId: string, responseText: string, responseAttachments?: File[]) => {
    let previous: Ticket | undefined;
    const shouldMarkAnswered = (t: Ticket) => t.status !== RequestStatus.Answered && t.status !== RequestStatus.Closed;

    // Optimistic update
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      if (!canEditTicket(t)) return t;
      previous = t;
      const patch: Partial<Ticket> = { response: responseText };
      if (responseAttachments && responseAttachments.length) (patch as any).responseAttachments = responseAttachments;
      if (shouldMarkAnswered(t)) {
        patch.status = RequestStatus.Answered;
        if (!t.answeredAt) patch.answeredAt = new Date();
      }
      return { ...t, ...patch };
    }));

    // تسجيل النشاط وتتبع الرد الأول
    try {
      addActivityLog({
        type: 'ticket_respond',
        description: `تم الرد على التذكرة: ${ticketId}`,
        userId: currentEmployee?.username,
        details: { ticketId, responseLength: responseText.length },
        severity: 'success'
      });
      trackFirstResponse(ticketId, currentEmployee?.username);
      playSound('success');
    } catch { }

    if (USE_BACKEND_TICKETS) {
      (async () => {
        try {
          const attachmentsMeta = (responseAttachments || []).map(f => ({ filename: f.name, mimeType: f.type, sizeBytes: f.size }));
          await apiFetch(`/api/tickets/${ticketId}/response`, {
            method: 'PATCH',
            body: {
              responseText: responseText.trim(),
              markAnswered: true, // we auto-mark answered when a response is set
              attachments: attachmentsMeta
            } as any
          });
          addToast?.({ message: `تم إرسال الرد للتذكرة ${ticketId}`, type: 'success' });
        } catch (e: any) {
          // Revert on failure
          setTickets(prev => prev.map(t => (t.id === ticketId && previous) ? previous : t));
          addToast?.({ message: e?.message || 'فشل إرسال الرد', type: 'error' });
        }
      })();
    }
  };

  const updateTicketOpinion = (ticketId: string, opinion: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      if (!canEditTicket(t)) return t;
      return { ...t, opinion };
    }));
  };

  const updateTicketForwardedTo = (ticketId: string, departments: Department[]) => {
    // إلغاء جميع الإحالات: القائمة تبقى فارغة
    setTickets(prev => prev.map(t => (t.id === ticketId && canEditTicket(t)) ? { ...t, forwardedTo: [] } : t));
  };

  const markNotificationsReadForDepartment = (department: Department) => {
    setNotifications(prev => prev.map(n => n.department === department ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearReadNotifications = () => {
    setNotifications(prev => {
      // If admin, remove all read
      if (isAdmin) return prev.filter(n => !n.read);
      // If employee, remove read notifications belonging to their department
      if (employeeDept) {
        return prev.filter(n => {
          if (n.department === employeeDept && n.read) return false;
          return true;
        });
      }
      return prev;
    });
  };

  const addNotification = (n: Omit<DepartmentNotification, 'id' | 'createdAt' | 'read'> & { message?: string }) => {
    setNotifications(prev => [
      { id: `N-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: new Date(), read: false, ...n },
      ...prev,
    ]);
  };

  // دالة تحديث التذكرة بشكل شامل
  const updateTicket = (ticketId: string, updates: Partial<Ticket>) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      if (!canEditTicket(t)) return t;
      return { ...t, ...updates };
    }));
  };

  // دالة إعادة الإرسال لقسم آخر
  const forwardTicket = (ticketId: string, toDepartment: string, comment?: string) => {
    // إلغاء ميزة الإحالة: لا يتم إجراء أي تحويلات، ويتم ضمان بقاء التذكرة دون إحالات
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, forwardedTo: [] } : t));
  };


  const renderPage = () => {
    switch (route) {
      case '#/submit':
        return <SubmitRequestPage />;
      case '#/track':
        return <TrackRequestPage />;
      case '#/faq':
        return <FaqPage />;
      case '#/news':
        return <NewsPage />;
      case '#/login':
        return <LoginPage />;
      case '#/dashboard':
        return isEmployeeLoggedIn ? <DashboardPage /> : <LoginPage />;
      case '#/complaints-management':
        return isEmployeeLoggedIn ? <ComplaintsManagementPage /> : <LoginPage />;
      case '#/employees':
        return isEmployeeLoggedIn && currentEmployee?.role === 'مدير' ? <EmployeeManagementPage /> : <LoginPage />;
      case '#/mfa-management':
        return isEmployeeLoggedIn ? <MFAManagementPage /> : <LoginPage />;
      case '#/session-security':
        return isEmployeeLoggedIn ? <SessionSecurityPage /> : <LoginPage />;
      case '#/hrms':
        return isEmployeeLoggedIn ? <HrmsPage /> : <LoginPage />;
      case '#/hrms/core':
        return isEmployeeLoggedIn ? <CoreHrPage /> : <LoginPage />;
      case '#/hrms/payroll':
        return isEmployeeLoggedIn ? <PayrollPage /> : <LoginPage />;
      case '#/hrms/attendance':
        return isEmployeeLoggedIn ? <AttendancePage /> : <LoginPage />;
      case '#/hrms/leave':
        return isEmployeeLoggedIn ? <LeavePage /> : <LoginPage />;
      case '#/hrms/ess-mss':
        return isEmployeeLoggedIn ? <EssMssPage /> : <LoginPage />;
      case '#/hrms/performance':
        return isEmployeeLoggedIn ? <PerformancePage /> : <LoginPage />;
      case '#/hrms/recruitment':
        return isEmployeeLoggedIn ? <RecruitmentPage /> : <LoginPage />;
      case '#/hrms/reports':
        return isEmployeeLoggedIn ? <ReportsPage /> : <LoginPage />;
      case '#/tools':
        return isEmployeeLoggedIn && currentEmployee?.role === 'مدير' ? <ToolsPage /> : <LoginPage />;
      case '#/diwan':
        return isEmployeeLoggedIn ? <GeneralDiwanPage /> : <LoginPage />;
      case '#/diwan/admin':
        return isEmployeeLoggedIn ? <DiwanAdminPage /> : <LoginPage />;
      case '#/diwan/income':
        return isEmployeeLoggedIn ? <DiwanIncomePage /> : <LoginPage />;
      case '#/diwan/large-taxpayers':
        return isEmployeeLoggedIn ? <DiwanLargeTaxpayersPage /> : <LoginPage />;
      case '#/diwan/debt':
        return isEmployeeLoggedIn ? <DiwanDebtPage /> : <LoginPage />;
      case '#/diwan/imports':
        return isEmployeeLoggedIn ? <DiwanImportsPage /> : <LoginPage />;
      case '#/diwan/audit':
        return isEmployeeLoggedIn ? <DiwanAuditPage /> : <LoginPage />;
      case '#/diwan/informatics':
        return isEmployeeLoggedIn ? <DiwanInformaticsPage /> : <LoginPage />;
      case '#/diwan/admin-development':
        return isEmployeeLoggedIn ? <DiwanAdminDevelopmentPage /> : <LoginPage />;
      case '#/diwan/inquiry':
        return isEmployeeLoggedIn ? <DiwanInquiryPage /> : <LoginPage />;
      case '#/diwan/treasury':
        return isEmployeeLoggedIn ? <DiwanTreasuryPage /> : <LoginPage />;
      case '#/messages':
        return isEmployeeLoggedIn ? <ContactMessagesPage /> : <LoginPage />;
      case '#/requests':
        return isEmployeeLoggedIn ? <RequestsPage /> : <LoginPage />;
      case '#/contact':
        return <ContactPage />;
      case '#/privacy':
        return <PrivacyPage />;
      case '#/privacy-editor':
        return isEmployeeLoggedIn && currentEmployee?.role === 'مدير' ? <PrivacyEditorPage /> : <LoginPage />;
      case '#/terms':
        return <TermsPage />;
      case '#/about-system':
        return <AboutSystemPage />;
      case '#/about':
        return <AboutSystemPage />;
      case '#/departments':
        return <DepartmentsPage />;
      case '#/survey':
        return <CitizenSurveyPage />;
      case '#/monitor':
        return isEmployeeLoggedIn && currentEmployee?.role === 'مدير' ? <AdminMonitorPage /> : <LoginPage />;
      case '#/internal-messages':
        return isEmployeeLoggedIn ? <InternalMessagesPage /> : <LoginPage />;
      case '#/employee/profile':
        return isEmployeeLoggedIn ? <EmployeeProfilePage /> : <LoginPage />;
      case '#/message-analytics':
        return isEmployeeLoggedIn ? <MessageAnalyticsPage /> : <LoginPage />;
      case '#/ticket-analytics':
        return isEmployeeLoggedIn ? <TicketAnalyticsPage /> : <LoginPage />;
      case '#/observability':
        return isEmployeeLoggedIn && currentEmployee?.role === 'مدير' ? <ObservabilityPage /> : <LoginPage />;
      case '#/incident-response':
        return isEmployeeLoggedIn && currentEmployee?.role === 'مدير' ? <IncidentResponsePage /> : <LoginPage />;
      case '#/business-continuity':
        return isEmployeeLoggedIn && currentEmployee?.role === 'مدير' ? <BusinessContinuityPage /> : <LoginPage />;
      case '#/security-governance':
        return isEmployeeLoggedIn && currentEmployee?.role === 'مدير' ? <SecurityGovernancePage /> : <LoginPage />;
      case '#/security-ops':
        return isEmployeeLoggedIn && currentEmployee?.role === 'مدير' ? <SecurityOpsDashboard /> : <LoginPage />;
      case '#/ai-assistant':
        return isEmployeeLoggedIn && currentEmployee?.role === 'مدير' ? <AIAssistantPage /> : <LoginPage />;
      case '#/daily-ops':
        return isEmployeeLoggedIn && currentEmployee?.role === 'مدير' ? <DailyOperationsPage /> : <LoginPage />;
      case '#/advanced-analytics':
        return isEmployeeLoggedIn && currentEmployee?.role === 'مدير' ? (
          <React.Suspense fallback={<div className="text-sm">جارٍ تحميل التحليلات المتقدمة…</div>}>
            <AdvancedAnalyticsPage />
          </React.Suspense>
        ) : <LoginPage />;
      case '#/role-management':
        return isEmployeeLoggedIn && currentEmployee?.role === 'مدير' ? <RoleManagementPage /> : <LoginPage />;
      case '#/secure-requests':
        return isEmployeeLoggedIn ? <SecureRequestsPage /> : <LoginPage />;
      case '#/uploads-demo':
        return <UploadsDemoPage />;
      case '#/features-demo':
        return <FeaturesDemo />;
      case '#/enhanced-features':
        return isEmployeeLoggedIn ? <EnhancedFeaturesPage /> : <LoginPage />;
      case '#/diwan-inquiries':
        return isEmployeeLoggedIn ? <InquiryComplaintsDiwanPage /> : <LoginPage />;
      case '#/appointment-booking':
        return <AppointmentBookingPage />;
      case '#/appointment-dashboard':
        return isEmployeeLoggedIn ? <AppointmentDashboardPage /> : <LoginPage />;
      case '#/qr-checkin':
        return isEmployeeLoggedIn ? <QRCheckinPage /> : <LoginPage />;
      case '#/confirmation':
        return <ConfirmationPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <ThemeProvider>
      <AppContext.Provider value={{
        tickets,
        notifications,
        ticketResponses,
        fetchTicketResponses,
        addTicketResponse,
        addTicket,
        findTicket,
        contactMessages,
        addContactMessage,
        addContactMessageReply,
        updateContactMessageDepartment,
        updateContactMessageForwardedTo,
        updateContactMessageForwardedPriorities,
        documentContactMessage,
        documentTicket,
        updateContactMessageSource,
        updateTicketSource,
        updateContactMessage,
        surveys,
        addSurvey,
        isEmployeeLoggedIn,
        currentEmployee,
        employeeLogin,
        logout,
        employeeLogout: logout, // Alias for compatibility 
        backendLogin,
        refreshSession,
        authLoading,
        authError,
        addToast,
        removeToast,
        searchEmployeeByName,
        searchEmployeeByNationalId,
        updateTicketStatus,
        updateTicketDepartment,
        updateTicketResponse,
        updateTicketOpinion,
        updateTicketForwardedTo,
        markNotificationsReadForDepartment,
        markAllNotificationsRead,
        clearReadNotifications,
        addNotification,
        updateContactMessageStatus,
        updateTicket,
        forwardTicket,
        lastSubmittedId,
        theme,
        toggleTheme,
        // MFA functions
        updateEmployee,
        requiresMFA,
        onMfaSuccess,
        // Navigation function
        navigateTo,

        // ===== RBAC Authorization Functions =====
        hasPermission,
        requirePermission,
        canAccessTicket,
        canEditTicket,
        canDeleteTicket,
        canCreateTicket,
        canViewReports,
        canManageEmployees,
        canManageRoles,
        canViewAuditLogs,
        canExportData,
        getCurrentUserRoles,
        isSystemAdmin,
        isDepartmentManager,
        currentRbacEmployee,
        // ===== Incident Response =====
        incidents,
        listIncidents,
        createIncident,
        updateIncident,
        runIncidentPlan
        ,
        replaceIncidents,
        // ===== BCP exports =====
        continuityPlans,
        listBCPPlans,
        createBCP,
        runBCP
        , runBCPPhase, exportBCP, submitBCPEvidence, requestBCPBackup, replaceBCPPlans
        ,
        // ===== Daily Ops =====
        dailyReports,
        listDailyReports,
        runDailyChecks,
        exportDailyReport, replaceDailyReports,
        // ===== Governance =====
        governanceState,
        listViolations: () => governance.getViolations(),
        enforcePolicy: (name: any, context?: any) => governance.enforcePolicy(name, context),
        exportGovernance: async (format: 'csv' | 'pdf') => format === 'csv' ? governance.exportCSV() : await governance.exportPDF(),
        // Lifecycle & exceptions
        listExceptions: () => governance.getExceptions(),
        addException: (exc) => governance.addException(exc as any),
        approveException: (id: string, approver: string) => governance.approveException(id, approver),
        revokeException: (id: string, reason?: string) => governance.revokeException(id, reason),
        updatePolicyLifecycle: (policy: any, updates: any) => governance.updatePolicyLifecycle(policy, updates),
        // Security posture
        securityStatus,
        refreshSecurityStatus,
        // Internal Messages
        internalMessages,
        sendInternalMessage,
        markInternalMessageRead,
        // App Store Links
        appStoreLinks,
        updateAppStoreLinks
      }}>
        {/* شريط تقدم التمرير */}
        <ScrollProgressBar />

        <div
          className="flex flex-col min-h-screen text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900"
          style={{
            backgroundImage: "url('https://syrian.zone/syid/materials/pattern.svg')",
            backgroundAttachment: 'fixed',
          }}
        >
          <div className="flex flex-col min-h-screen bg-white/95 dark:bg-gray-900/95">
            <Header />
            <main className="flex-grow relative container mx-auto px-4 py-8">
              {/* Suspense wrapper for lazy-loaded pages */}
              <Suspense fallback={<PageLoader />}>
                {renderPage()}
              </Suspense>
            </main>
            {/* زر عائم للرجوع للوحة التحكم يظهر فقط في الصفحات الحساسة */}
            <BackToDashboardFab />
            {/* زر عائم عام للرجوع إلى أعلى الصفحة */}
            <BackToTopFab />

            {/* المساعد الذكي - Chatbot - يظهر فقط في الصفحات العامة وليس في صفحات الموظفين أو تسجيل الدخول */}
            {(!isEmployeeLoggedIn && route !== '#/login') && <Chatbot />}

            <Footer />
            {/* Toast container */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-md px-4">
              {toasts.map(t => (
                <div key={t.id} className={`pointer-events-auto rounded-xl shadow-lg px-4 py-3 text-sm font-medium backdrop-blur border flex items-start gap-3 animate-fade-in-down
                ${t.type === 'success' ? 'bg-green-600/90 text-white border-green-400/40' : ''}
                ${t.type === 'error' ? 'bg-red-600/90 text-white border-red-400/40' : ''}
                ${t.type === 'info' ? 'bg-gray-800/90 text-white border-gray-600/40' : ''}
              `}>
                  <div className="flex-1 leading-relaxed">{t.message}</div>
                  <button onClick={() => removeToast(t.id)} className="text-white/70 hover:text-white text-lg leading-none">×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Cookie Consent Banner */}
          <CookieBanner
            onAcceptAll={() => {
              addToast({ message: 'تم قبول جميع ملفات تعريف الارتباط بنجاح', type: 'success' });
            }}
            onAcceptEssential={() => {
              addToast({ message: 'تم قبول ملفات تعريف الارتباط الأساسية فقط', type: 'info' });
            }}
            onShowPrivacyPolicy={() => {
              window.location.hash = '#privacy';
            }}
          />

          {/* Spotlight Search (Ctrl+K) */}
          <SpotlightSearch
            isOpen={showSpotlight}
            onClose={() => setShowSpotlight(false)}
            items={[
              { id: 'home', title: 'الصفحة الرئيسية', icon: '🏠', action: () => { window.location.hash = '#/'; setShowSpotlight(false); } },
              { id: 'submit', title: 'تقديم شكوى جديدة', icon: '📝', action: () => { window.location.hash = '#/submit'; setShowSpotlight(false); } },
              { id: 'track', title: 'تتبع الطلبات', icon: '🔍', action: () => { window.location.hash = '#/track'; setShowSpotlight(false); } },
              { id: 'contact', title: 'تواصل معنا', icon: '📧', action: () => { window.location.hash = '#/contact'; setShowSpotlight(false); } },
              { id: 'login', title: 'تسجيل دخول الموظفين', icon: '👤', action: () => { window.location.hash = '#/login'; setShowSpotlight(false); } },
              ...(isEmployeeLoggedIn ? [
                { id: 'dashboard', title: 'لوحة التحكم', icon: '📊', action: () => { window.location.hash = '#/dashboard'; setShowSpotlight(false); } },
                { id: 'complaints', title: 'إدارة الشكاوى', icon: '📋', action: () => { window.location.hash = '#/complaints'; setShowSpotlight(false); } },
                { id: 'employees', title: 'إدارة الموظفين', icon: '👥', action: () => { window.location.hash = '#/employees'; setShowSpotlight(false); } },
              ] : [])
            ]}
            placeholder="ابحث عن صفحة أو إجراء..."
          />

          {/* Keyboard Shortcuts Help Modal */}
          <KeyboardShortcutsHelp
            isOpen={showShortcutsHelp}
            onClose={() => setShowShortcutsHelp(false)}
            shortcuts={[
              { key: 'Ctrl+K', description: 'فتح البحث السريع' },
              { key: 'Ctrl+N', description: 'تقديم شكوى جديدة' },
              { key: 'Ctrl+T', description: 'تتبع الطلبات' },
              { key: '/', description: 'عرض اختصارات لوحة المفاتيح' },
              { key: 'Esc', description: 'إغلاق النوافذ' }
            ]}
          />
        </div>
      </AppContext.Provider>
    </ThemeProvider>
  );
};

export default App;