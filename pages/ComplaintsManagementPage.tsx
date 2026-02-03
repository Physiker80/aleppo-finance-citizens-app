import React, { useContext, useState, useMemo, useEffect } from 'react';
import { AppContext } from '../AppContext';
import { RequestStatus, ContactMessageStatus, RequestType } from '../types';
import type { Ticket, ContactMessage } from '../types';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { DonutChart, BarChart, type ChartDatum } from '../components/ui/Charts';
import { useDepartmentNames } from '../utils/departments';
import AIAssistPanel from '../components/AIAssistPanel';

// ===== تحليل المشاعر =====
interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  urgency: 'عالي' | 'متوسط' | 'عادي';
  emoji: string;
}

const analyzeSentiment = (text: string): SentimentResult => {
  const positiveWords = ['سعيد', 'ممتاز', 'رائع', 'شكراً', 'جيد', 'مبهر', 'محترم', 'سريع', 'ممتن', 'راضي'];
  const negativeWords = ['غاضب', 'سيء', 'متأخر', 'مشكلة', 'خطأ', 'بطيء', 'سلبي', 'مزعج', 'محبط', 'ظلم'];

  let score = 0;
  const words = text.split(/\s+/);

  words.forEach(word => {
    if (positiveWords.some(p => word.includes(p))) score += 1;
    if (negativeWords.some(n => word.includes(n))) score -= 1;
  });

  const sentiment = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
  const urgency = score < -1 ? 'عالي' : score < 0 ? 'متوسط' : 'عادي';
  const emoji = sentiment === 'positive' ? '😊' : sentiment === 'negative' ? '😠' : '😐';

  return { sentiment, score, urgency, emoji };
};

const ComplaintsManagementPage: React.FC = () => {
  const appContext = useContext(AppContext);

  if (!appContext) {
    return <div className="text-center py-10 text-red-600">خطأ في تحميل السياق</div>;
  }

  if (!appContext.isEmployeeLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">يتطلب تسجيل الدخول</h2>
          <p className="mb-6">يجب تسجيل الدخول كموظف للوصول إلى هذه الصفحة</p>
          <button
            onClick={() => window.location.hash = '#/'}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            العودة للرئيسية
          </button>
          {/* Back button removed per policy; rely on global BackToDashboardFab */}
        </div>
      </div>
    );
  }

  const {
    tickets = [],
    contactMessages = [],
    currentEmployee,
    updateTicketStatus,
    updateTicket,
    forwardTicket
  } = appContext;

  // Filter states
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [docFilter, setDocFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [activeView, setActiveView] = useState<'all' | 'employees' | 'citizens'>('all');
  const [subView, setSubView] = useState<'all' | 'inquiries' | 'complaints' | 'messages'>('all');
  const [showFullStats, setShowFullStats] = useState<boolean>(false);
  const [showSummaryStats, setShowSummaryStats] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('showSummaryStats');
      return v === null ? true : v === 'true';
    } catch {
      return true;
    }
  });
  const [showAssist, setShowAssist] = useState<boolean>(false);

  // Sorting and archive scope states (persisted)
  const [archiveScope, setArchiveScope] = useState<'ALL' | 'ARCHIVED' | 'NOT_ARCHIVED'>(() => {
    try { return (localStorage.getItem('cm_archive_scope') as any) || 'ALL'; } catch { return 'ALL'; }
  });
  const [sortBy, setSortBy] = useState<'date' | 'id' | 'priority' | 'new' | 'archived'>(() => {
    try { return (localStorage.getItem('cm_sort_by') as any) || 'date'; } catch { return 'date'; }
  });
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() => {
    try { return (localStorage.getItem('cm_sort_dir') as any) || 'desc'; } catch { return 'desc'; }
  });

  useEffect(() => {
    try { localStorage.setItem('showSummaryStats', String(showSummaryStats)); } catch { }
  }, [showSummaryStats]);

  useEffect(() => {
    try {
      localStorage.setItem('cm_archive_scope', archiveScope);
      localStorage.setItem('cm_sort_by', sortBy);
      localStorage.setItem('cm_sort_dir', sortDir);
    } catch { }
  }, [archiveScope, sortBy, sortDir]);

  // حالة اللوحة الجانبية للطلبات المفتوحة
  const [openTickets, setOpenTickets] = useState<(Ticket | ContactMessage)[]>([]);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [sidePanelSort, setSidePanelSort] = useState<'date' | 'id' | 'status'>('date');
  const [sidePanelSortDir, setSidePanelSortDir] = useState<'asc' | 'desc'>('desc');
  // حالة الردود للطلبات المفتوحة في اللوحة الجانبية
  const [sidePanelResponses, setSidePanelResponses] = useState<Record<string, string>>({});
  // حالة توسيع/طي المرفقات في اللوحة الجانبية
  const [expandedAttachments, setExpandedAttachments] = useState<Record<string, boolean>>({});
  // حالة التوثيق للطلبات في اللوحة الجانبية
  const [sidePanelDiwan, setSidePanelDiwan] = useState<Record<string, { number: string; date: string; editing: boolean }>>({});
  // حالة نموذج التحويل لقسم آخر
  const [sidePanelForward, setSidePanelForward] = useState<Record<string, { show: boolean; dept: string; comment: string }>>({});
  // حالة الأرشفة
  const [sidePanelArchive, setSidePanelArchive] = useState<Record<string, { showNote: boolean; note: string }>>({});
  // حالة عرض/إخفاء QR Code
  const [sidePanelQR, setSidePanelQR] = useState<Record<string, boolean>>({});

  // دالة توليد رابط QR Code للتتبع
  const generateTrackingQRUrl = (ticketId: string) => {
    const trackingData = JSON.stringify({
      ticketId,
      trackingUrl: `${window.location.origin}/#/track?id=${ticketId}`,
    });
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingData)}`;
  };

  // دالة توليد رابط QR Code للتوثيق
  const generateDocQRUrl = (ticket: Ticket | ContactMessage) => {
    const t = ticket as any;
    const qrData = JSON.stringify({
      id: ticket.id,
      diwanNumber: t.diwanNumber || '',
      diwanDate: t.diwanDate || '',
      type: 'requestType' in ticket ? ticket.requestType : 'رسالة تواصل',
      submissionDate: t.submissionDate || t.submittedAt
    });
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
  };

  const handleViewChange = (newView: 'all' | 'employees' | 'citizens') => {
    setActiveView(newView);
    setSubView('all'); // Reset sub-view when changing main view
  };

  // إضافة طلب للوحة الجانبية (فتح متعدد)
  const handleAddToSidePanel = (ticket: Ticket | ContactMessage) => {
    setOpenTickets(prev => {
      // تحقق من عدم وجوده مسبقاً
      if (prev.some(t => t.id === ticket.id)) {
        return prev;
      }
      return [...prev, ticket];
    });
    setShowSidePanel(true);
    
    // إنشاء QR Codes للطلب
    if ('requestType' in ticket) {
      const trackingData = JSON.stringify({
        ticketId: ticket.id,
        trackingUrl: `${window.location.origin}/#/track?id=${ticket.id}`,
        type: ticket.requestType,
        submissionDate: ticket.submissionDate
      });
      const trackingQR = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingData)}`;
      
      let diwanQR = '';
      if ((ticket as any).diwanNumber && (ticket as any).diwanDate) {
        const diwanData = JSON.stringify({
          id: ticket.id,
          diwanNumber: (ticket as any).diwanNumber,
          diwanDate: (ticket as any).diwanDate,
          type: ticket.requestType,
          submissionDate: ticket.submissionDate
        });
        diwanQR = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(diwanData)}`;
      }
      
      setSidePanelQR(prev => ({ ...prev, [ticket.id]: { tracking: trackingQR, diwan: diwanQR } }));
    }
  };

  // إزالة طلب من اللوحة الجانبية
  const handleRemoveFromSidePanel = (ticketId: string) => {
    setOpenTickets(prev => prev.filter(t => t.id !== ticketId));
  };

  // ترتيب الطلبات المفتوحة
  const sortedOpenTickets = useMemo(() => {
    const sorted = [...openTickets];
    sorted.sort((a, b) => {
      let comparison = 0;
      if (sidePanelSort === 'date') {
        const dateA = new Date((a as any).submissionDate || (a as any).submittedAt || 0).getTime();
        const dateB = new Date((b as any).submissionDate || (b as any).submittedAt || 0).getTime();
        comparison = dateA - dateB;
      } else if (sidePanelSort === 'id') {
        comparison = a.id.localeCompare(b.id);
      } else if (sidePanelSort === 'status') {
        const statusA = 'status' in a ? a.status : '';
        const statusB = 'status' in b ? b.status : '';
        comparison = statusA.localeCompare(statusB);
      }
      return sidePanelSortDir === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [openTickets, sidePanelSort, sidePanelSortDir]);

  // Employee access control
  const isAdmin = currentEmployee?.role === 'مدير';
  const myDept = currentEmployee?.department;
  const departmentNames = useDepartmentNames();

  // Function to check ticket access permissions
  const canAccessTicket = (ticket: Ticket): boolean => {
    if (isAdmin) return true;
    if (!myDept) return false;
    return String(ticket.department) === myDept || (ticket.forwardedTo || []).includes(myDept);
  };

  // Statistics
  const ticketStats = useMemo(() => {
    const total = tickets.length;
    const byStatus: Record<RequestStatus, number> = {
      [RequestStatus.New]: 0,
      [RequestStatus.InProgress]: 0,
      [RequestStatus.Answered]: 0,
      [RequestStatus.Closed]: 0,
    };
    let employeeTickets = 0;
    let citizenTickets = 0;

    // Separate statistics for employees and citizens
    const employeeStats = {
      total: 0,
      byStatus: { ...byStatus }
    };

    const citizenStats = {
      total: 0,
      byStatus: { ...byStatus }
    };

    tickets.forEach(t => {
      byStatus[t.status]++;
      if (t.source === 'موظف') {
        employeeTickets++;
        employeeStats.total++;
        employeeStats.byStatus[t.status]++;
      } else {
        citizenTickets++;
        citizenStats.total++;
        citizenStats.byStatus[t.status]++;
      }
    });

    return { total, byStatus, employeeTickets, citizenTickets, employeeStats, citizenStats };
  }, [tickets]);

  const contactStats = useMemo(() => {
    const total = contactMessages.length;
    const byStatus: Record<ContactMessageStatus, number> = {
      [ContactMessageStatus.New]: 0,
      [ContactMessageStatus.InProgress]: 0,
      [ContactMessageStatus.Closed]: 0,
    };
    let employeeMessages = 0;
    let citizenMessages = 0;

    contactMessages.forEach(m => {
      byStatus[m.status]++;
      if (m.source === 'موظف') {
        employeeMessages++;
      } else {
        citizenMessages++;
      }
    });

    return { total, byStatus, employeeMessages, citizenMessages };
  }, [contactMessages]);

  // Build history for peak predictions from tickets and messages
  const peakHistory = useMemo(() => {
    const h: Array<{ timestamp: string }> = [];
    (tickets || []).forEach(t => {
      const d = t.submissionDate instanceof Date ? t.submissionDate : new Date(t.submissionDate as any);
      if (!isNaN(d.getTime())) h.push({ timestamp: d.toISOString() });
    });
    (contactMessages || []).forEach(m => {
      const d = m.submissionDate instanceof Date ? m.submissionDate : new Date(m.submissionDate as any);
      if (!isNaN(d.getTime())) h.push({ timestamp: d.toISOString() });
    });
    return h;
  }, [tickets, contactMessages]);

  // Helpers: map statuses to gradient classes (aligned with charts palette)
  const ticketStatusGradient = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.New:
        return 'from-indigo-300 via-indigo-500 to-indigo-600';
      case RequestStatus.InProgress:
        return 'from-amber-300 via-amber-500 to-amber-600';
      case RequestStatus.Answered:
        return 'from-teal-300 via-teal-500 to-teal-600';
      case RequestStatus.Closed:
      default:
        return 'from-blue-300 via-blue-500 to-blue-600';
    }
  };

  const ticketStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.New:
        return 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white';
      case RequestStatus.InProgress:
        return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white';
      case RequestStatus.Answered:
        return 'bg-gradient-to-r from-teal-500 to-teal-600 text-white';
      case RequestStatus.Closed:
      default:
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
    }
  };

  const messageStatusGradient = (status: ContactMessageStatus) => {
    switch (status) {
      case ContactMessageStatus.New:
        return 'from-indigo-300 via-indigo-500 to-indigo-600';
      case ContactMessageStatus.InProgress:
        return 'from-amber-300 via-amber-500 to-amber-600';
      case ContactMessageStatus.Closed:
      default:
        return 'from-blue-300 via-blue-500 to-blue-600';
    }
  };

  const messageStatusBadge = (status: ContactMessageStatus) => {
    switch (status) {
      case ContactMessageStatus.New:
        return 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white';
      case ContactMessageStatus.InProgress:
        return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white';
      case ContactMessageStatus.Closed:
      default:
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
    }
  };

  // Priority and sort helpers
  const priorityTextOrder: Record<string, number> = { 'عاجل': 1, 'هام': 2, 'متوسط': 3, 'عادي': 4 };
  const getMessagePriorityWeight = (m: ContactMessage): number => {
    const fp = m.forwardedPriorities;
    if (fp) {
      if (isAdmin) {
        const vals = Object.values(fp);
        if (vals.length) return Math.min(...vals);
      } else if (myDept && typeof fp[myDept] === 'number') {
        return fp[myDept] as number;
      }
    }
    const p = (m as any).priority as string | undefined;
    if (p && priorityTextOrder[p] !== undefined) return priorityTextOrder[p];
    return 99;
  };
  const getTicketPriorityWeight = (_t: Ticket): number => 99;
  const statusOrderTicket: Record<RequestStatus, number> = {
    [RequestStatus.New]: 0,
    [RequestStatus.InProgress]: 1,
    [RequestStatus.Answered]: 2,
    [RequestStatus.Closed]: 3,
  };
  const statusOrderMessage: Record<ContactMessageStatus, number> = {
    [ContactMessageStatus.New]: 0,
    [ContactMessageStatus.InProgress]: 1,
    [ContactMessageStatus.Closed]: 2,
  };
  const dirMul = sortDir === 'asc' ? 1 : -1;
  const numericId = (id: string) => {
    const n = parseInt(String(id || '').replace(/\D+/g, ''), 10);
    return isNaN(n) ? null : n;
  };

  // Ring color helpers for clearer distinction
  const ticketStatusRing = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.New:
        return 'ring-indigo-300 dark:ring-indigo-500';
      case RequestStatus.InProgress:
        return 'ring-amber-300 dark:ring-amber-500';
      case RequestStatus.Answered:
        return 'ring-teal-300 dark:ring-teal-500';
      case RequestStatus.Closed:
      default:
        return 'ring-blue-300 dark:ring-blue-500';
    }
  };

  const messageStatusRing = (status: ContactMessageStatus) => {
    switch (status) {
      case ContactMessageStatus.New:
        return 'ring-indigo-300 dark:ring-indigo-500';
      case ContactMessageStatus.InProgress:
        return 'ring-amber-300 dark:ring-amber-500';
      case ContactMessageStatus.Closed:
      default:
        return 'ring-blue-300 dark:ring-blue-500';
    }
  };

  // Department-level stats (simple counts)
  const deptStats = useMemo(() => {
    const map = new Map<string, { tickets: number; messages: number }>();
    (tickets || []).forEach(t => {
      const dept = (t.department || 'غير محدد') as string;
      const entry = map.get(dept) || { tickets: 0, messages: 0 };
      entry.tickets += 1;
      map.set(dept, entry);
    });
    (contactMessages || []).forEach(m => {
      const dept = (m.department || 'غير محدد') as string;
      const entry = map.get(dept) || { tickets: 0, messages: 0 };
      entry.messages += 1;
      map.set(dept, entry);
    });
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  }, [tickets, contactMessages]);

  // Chart datasets
  const ticketStatusData: ChartDatum[] = useMemo(() => ([
    { label: 'جديد', value: ticketStats.byStatus[RequestStatus.New], color: '#6366f1' },
    { label: 'قيد المعالجة', value: ticketStats.byStatus[RequestStatus.InProgress], color: '#f59e0b' },
    { label: 'تم الرد', value: ticketStats.byStatus[RequestStatus.Answered], color: '#14b8a6' },
    { label: 'مغلق', value: ticketStats.byStatus[RequestStatus.Closed], color: '#3b82f6' },
  ]), [ticketStats.byStatus]);

  const messageStatusData: ChartDatum[] = useMemo(() => ([
    { label: 'جديد', value: contactStats.byStatus?.[ContactMessageStatus.New] ?? 0, color: '#6366f1' },
    { label: 'قيد المعالجة', value: contactStats.byStatus?.[ContactMessageStatus.InProgress] ?? 0, color: '#f59e0b' },
    { label: 'مغلق', value: contactStats.byStatus?.[ContactMessageStatus.Closed] ?? 0, color: '#3b82f6' },
  ]), [contactStats.byStatus]);

  const topDepartmentsData: ChartDatum[] = useMemo(() => {
    const sorted = [...deptStats].sort((a, b) => (b.tickets + b.messages) - (a.tickets + a.messages)).slice(0, 8);
    const palette = ['#06b6d4', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#84cc16', '#8b5cf6', '#ec4899'];
    return sorted.map((d, i) => ({ label: d.name, value: d.tickets + d.messages, color: palette[i % palette.length] }));
  }, [deptStats]);

  // Filtered and visible messages
  const visibleMessages = useMemo(() => {
    let base = (contactMessages || []).filter(m => {
      if (!isAdmin) {
        if (!myDept) return false;
        const owns = (!!m.department && m.department === myDept) || (m.forwardedTo || []).includes(myDept);
        if (!owns) return false;
      }

      // Filter by active view
      if (activeView === 'employees' && m.source !== 'موظف') return false;
      if (activeView === 'citizens' && m.source === 'موظف') return false;

      // Hide messages when tickets sub-view is active (inquiries or complaints)
      if (subView === 'inquiries' || subView === 'complaints') return false;

      // Show messages only when messages sub-view is active or all sub-views
      if (activeView !== 'all' && subView !== 'all' && subView !== 'messages') return false;

      if (deptFilter !== 'ALL' && (m.department || '') !== deptFilter) return false;
      if (docFilter !== 'ALL') {
        const documented = !!(m.diwanNumber && m.diwanDate);
        if (docFilter === 'موثق' && !documented) return false;
        if (docFilter === 'غير موثق' && documented) return false;
      }
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim();
        const hay = [m.id, m.name, m.email || '', m.subject || '', m.message];
        if (!hay.some(h => h && h.includes(q))) return false;
      }
      return true;
    });

    // Archive scope filter
    base = base.filter(m => {
      if (archiveScope === 'ARCHIVED') return !!m.archived;
      if (archiveScope === 'NOT_ARCHIVED') return !m.archived;
      return true;
    });

    // Sorting
    const arr = [...base];
    arr.sort((a, b) => {
      const mul = (sortBy === 'new' || sortBy === 'archived') ? 1 : dirMul;
      if (sortBy === 'date') {
        const av = new Date(a.submissionDate as any).getTime() || 0;
        const bv = new Date(b.submissionDate as any).getTime() || 0;
        return (av - bv) * mul;
      } else if (sortBy === 'id') {
        const an = numericId(a.id);
        const bn = numericId(b.id);
        if (an !== null && bn !== null) return (an - bn) * mul;
        return String(a.id).localeCompare(String(b.id)) * mul;
      } else if (sortBy === 'priority') {
        const av = getMessagePriorityWeight(a);
        const bv = getMessagePriorityWeight(b);
        return (av - bv) * mul;
      } else if (sortBy === 'new') {
        const av = statusOrderMessage[a.status];
        const bv = statusOrderMessage[b.status];
        return (av - bv) * mul;
      } else if (sortBy === 'archived') {
        const av = a.archived ? 0 : 1;
        const bv = b.archived ? 0 : 1;
        return (av - bv) * mul;
      }
      return 0;
    });
    return arr;
  }, [contactMessages, isAdmin, myDept, deptFilter, statusFilter, search, docFilter, activeView, subView, archiveScope, sortBy, sortDir]);

  // Filtered and visible tickets
  const visibleTickets = useMemo(() => {
    let base = (tickets || []).filter(t => {
      if (!isAdmin) {
        if (!myDept) return false;
        const owns = (!!t.department && t.department === myDept) || (t.forwardedTo || []).includes(myDept);
        if (!owns) return false;
      }

      // Filter by active view
      if (activeView === 'employees' && t.source !== 'موظف') return false;
      if (activeView === 'citizens' && t.source === 'موظف') return false;

      // Filter by sub-view (inquiries, complaints)
      if (activeView === 'employees' && subView === 'inquiries' && t.requestType !== RequestType.Inquiry) return false;
      if (activeView === 'employees' && subView === 'complaints' && t.requestType !== RequestType.Complaint) return false;
      if (activeView === 'citizens' && subView === 'inquiries' && t.requestType !== RequestType.Inquiry) return false;
      if (activeView === 'citizens' && subView === 'complaints' && t.requestType !== RequestType.Complaint) return false;

      // Hide tickets when messages sub-view is active
      if (subView === 'messages') return false;

      // Apply نوع الطلب filter (map 'request' to Inquiry for backward-compat)
      if (typeFilter !== 'all') {
        if (typeFilter === 'inquiry' || typeFilter === 'request') {
          if (t.requestType !== RequestType.Inquiry) return false;
        } else if (typeFilter === 'complaint') {
          if (t.requestType !== RequestType.Complaint) return false;
        }
      }

      if (deptFilter !== 'ALL' && (t.department || '') !== deptFilter) return false;
      if (docFilter !== 'ALL') {
        const documented = !!(t.diwanNumber && t.diwanDate);
        if (docFilter === 'موثق' && !documented) return false;
        if (docFilter === 'غير موثق' && documented) return false;
      }
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim();
        const hay = [t.id, t.fullName, t.email || '', t.details];
        if (!hay.some(h => h && h.includes(q))) return false;
      }
      return true;
    });

    // Archive scope filter
    base = base.filter(t => {
      if (archiveScope === 'ARCHIVED') return !!t.archived;
      if (archiveScope === 'NOT_ARCHIVED') return !t.archived;
      return true;
    });

    // Sorting
    const arr = [...base];
    arr.sort((a, b) => {
      const mul = (sortBy === 'new' || sortBy === 'archived') ? 1 : dirMul;
      if (sortBy === 'date') {
        const av = new Date(a.submissionDate as any).getTime() || 0;
        const bv = new Date(b.submissionDate as any).getTime() || 0;
        return (av - bv) * mul;
      } else if (sortBy === 'id') {
        const an = numericId(a.id);
        const bn = numericId(b.id);
        if (an !== null && bn !== null) return (an - bn) * mul;
        return String(a.id).localeCompare(String(b.id)) * mul;
      } else if (sortBy === 'priority') {
        const av = getTicketPriorityWeight(a);
        const bv = getTicketPriorityWeight(b);
        return (av - bv) * mul;
      } else if (sortBy === 'new') {
        const av = statusOrderTicket[a.status];
        const bv = statusOrderTicket[b.status];
        return (av - bv) * mul;
      } else if (sortBy === 'archived') {
        const av = a.archived ? 0 : 1;
        const bv = b.archived ? 0 : 1;
        return (av - bv) * mul;
      }
      return 0;
    });
    return arr;
  }, [tickets, isAdmin, myDept, deptFilter, statusFilter, search, docFilter, activeView, subView, archiveScope, sortBy, sortDir]);

  return (
    <div className="min-h-screen bg-transparent p-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">إدارة الاستعلامات والشكاوى</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">إدارة شاملة للطلبات والاستعلامات والشكاوى الواردة مصنفة حسب المصدر</p>
          <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => setShowFullStats(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow"
              title="عرض الإحصائيات الكاملة"
            >
              الإحصائيات الكاملة
            </button>
            <button
              onClick={() => setShowSummaryStats(s => !s)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors shadow ${showSummaryStats ? 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
              title={showSummaryStats ? 'إخفاء الإحصائيات المختصرة' : 'إظهار الإحصائيات المختصرة'}
            >
              {showSummaryStats ? 'إخفاء الإحصائيات' : 'إظهار الإحصائيات'}
            </button>
            <button
              onClick={() => setShowAssist(s => !s)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors shadow ${showAssist ? 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100' : 'bg-cyan-600 hover:bg-cyan-700 text-white'}`}
              title={showAssist ? 'إخفاء المساعد الذكي' : 'فتح المساعد الذكي'}
            >
              {showAssist ? 'إخفاء المساعد' : 'فتح المساعد الذكي'}
            </button>
          </div>
        </div>

        {showAssist && (
          <div className="mb-6">
            <AIAssistPanel
              history={peakHistory}
              subtitle="مساعد عملي داخل إدارة التذاكر والرسائل"
            />
          </div>
        )}
        {/* إمكانية إظهار/إخفاء الإحصائيات المختصرة */}
        {showSummaryStats && (
          <>
            {/* الإحصائيات العامة */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {/* إجمالي الوارد (تذاكر + رسائل) */}
              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-2xl p-4 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-sm text-purple-700 dark:text-purple-300 mb-1">إجمالي الوارد</div>
                  <div className="text-3xl font-bold text-purple-800 dark:text-purple-200">
                    {ticketStats.total + contactStats.total}
                  </div>
                </div>
              </div>

              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-2xl p-4 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">مغلق</div>
                  <div className="text-3xl font-bold text-blue-800 dark:text-blue-200">
                    {ticketStats.byStatus[RequestStatus.Closed]}
                  </div>
                </div>
              </div>

              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-2xl p-4 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-sm text-teal-700 dark:text-teal-300 mb-1">تم الرد</div>
                  <div className="text-3xl font-bold text-teal-800 dark:text-teal-200">
                    {ticketStats.byStatus[RequestStatus.Answered]}
                  </div>
                </div>
              </div>

              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-2xl p-4 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-sm text-amber-700 dark:text-amber-300 mb-1">قيد المعالجة</div>
                  <div className="text-3xl font-bold text-amber-800 dark:text-amber-200">
                    {ticketStats.byStatus[RequestStatus.InProgress]}
                  </div>
                </div>
              </div>

              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-2xl p-4 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-sm text-indigo-700 dark:text-indigo-300 mb-1">جديد</div>
                  <div className="text-3xl font-bold text-indigo-800 dark:text-indigo-200">
                    {ticketStats.byStatus[RequestStatus.New]}
                  </div>
                </div>
              </div>

              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-2xl p-4 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">إجمالي (حسب المرفقات)</div>
                  <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                    {ticketStats.total}
                  </div>
                </div>
              </div>
            </div>

            {/* إحصائيات متوسط زمن الاستجابة */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-2xl p-6 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-lg text-green-700 dark:text-green-300 mb-2">متوسط زمن الاستجابة</div>
                  <div className="text-4xl font-bold text-green-800 dark:text-green-200">27</div>
                  <div className="text-sm text-green-600 dark:text-green-400 mt-1">د</div>
                </div>
              </div>

              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-2xl p-6 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-lg text-cyan-700 dark:text-cyan-300 mb-2">متوسط زمن الرد</div>
                  <div className="text-4xl font-bold text-cyan-800 dark:text-cyan-200">
                    <span className="text-2xl">21</span>
                    <span className="text-lg mx-2">س</span>
                    <span className="text-2xl">25</span>
                  </div>
                  <div className="text-sm text-cyan-600 dark:text-cyan-400 mt-1">د</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* أدوات التصفية العامة */}
        <div className="mb-6 p-4 bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-2xl border border-gray-200/30 dark:border-gray-700/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Input
                id="cm-search"
                label="البحث"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="البحث في الطلبات..."
              />
            </div>

            <div>
              <Select id="cm-type" label="نوع الطلب" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">جميع الأنواع</option>
                <option value="request">طلب</option>
                <option value="inquiry">استعلام</option>
                <option value="complaint">شكوى</option>
              </Select>
            </div>

            <div>
              <Select id="cm-dept" label="القسم" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                <option value="ALL">جميع الأقسام</option>
                {departmentNames.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </Select>
            </div>

            <div>
              <Select id="cm-status" label="الحالة" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">جميع الحالات</option>
                <option value={RequestStatus.New}>جديد</option>
                <option value={RequestStatus.InProgress}>قيد المعالجة</option>
                <option value={RequestStatus.Answered}>تم الرد</option>
                <option value={RequestStatus.Closed}>مغلق</option>
              </Select>
            </div>

            <div>
              <Select id="cm-doc" label="التوثيق" value={docFilter} onChange={(e) => setDocFilter(e.target.value)}>
                <option value="ALL">الكل</option>
                <option value="موثق">موثق</option>
                <option value="غير موثق">غير موثق</option>
              </Select>
            </div>
          </div>

          {/* أدوات الفرز والتصنيف */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Select id="cm-sort-by" label="فرز حسب" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <option value="date">التاريخ</option>
                <option value="id">الرقم</option>
                <option value="priority">الأولوية</option>
                <option value="new">الجديد أولاً</option>
                <option value="archived">المؤرشف أولاً</option>
              </Select>
            </div>
            <div>
              <Select id="cm-sort-dir" label="ترتيب" value={sortDir} onChange={(e) => setSortDir(e.target.value as any)}>
                <option value="desc">تنازلي</option>
                <option value="asc">تصاعدي</option>
              </Select>
            </div>
            <div>
              <Select id="cm-scope" label="النطاق" value={archiveScope} onChange={(e) => setArchiveScope(e.target.value as any)}>
                <option value="ALL">الكل</option>
                <option value="ARCHIVED">المؤرشف فقط</option>
                <option value="NOT_ARCHIVED">غير المؤرشف فقط</option>
              </Select>
            </div>
          </div>
        </div>

        {/* عند عرض الكل: اجعل الكارتين بجانب بعضهما ضمن شبكة */}
        <div className={activeView === 'all' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : ''}>

          {/* كارت طلبات الموظفين */}
          <div className={`mb-6 ${activeView === 'citizens' ? 'hidden' : ''}`}>
            <div
              className={`cursor-pointer p-6 backdrop-blur rounded-2xl transition-all duration-300 border ${activeView === 'employees'
                  ? 'bg-white/20 dark:bg-gray-800/20 border-gray-200/30 dark:border-gray-700/30 ring-2 ring-emerald-400'
                  : 'bg-white/20 dark:bg-gray-800/20 border-gray-200/30 dark:border-gray-700/30'
                }`}
              onClick={() => handleViewChange(activeView === 'employees' ? 'all' : 'employees')}
              title={activeView === 'employees' ? 'اضغط لإغلاق وعرض جميع الأقسام' : 'اضغط لعرض طلبات الموظفين فقط'}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-600 dark:bg-emerald-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-emerald-800 dark:text-emerald-200">طلبات الموظفين</h4>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">الاستعلامات والشكاوى ورسائل التواصل</p>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {ticketStats.employeeTickets + contactStats.employeeMessages}
                  </div>
                  <div className="text-sm text-emerald-600 dark:text-emerald-400">إجمالي جميع الطلبات</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div
                  className={`cursor-pointer transition-all duration-200 rounded-lg p-3 border ${activeView === 'employees' && subView === 'inquiries'
                      ? 'bg-white/40 dark:bg-gray-800/40 border-gray-200/40 dark:border-gray-700/40 ring-2 ring-emerald-300 shadow'
                      : 'bg-white/40 dark:bg-gray-800/40 border-gray-200/40 dark:border-gray-700/40 hover:ring hover:ring-emerald-200'
                    }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeView !== 'employees') {
                      setActiveView('employees');
                      setSubView('inquiries');
                    } else {
                      setSubView(subView === 'inquiries' ? 'all' : 'inquiries');
                    }
                  }}
                  title={subView === 'inquiries' && activeView === 'employees' ? 'اضغط للإغلاق' : 'اضغط لعرض الاستعلامات'}
                >
                  <div className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">الاستعلامات</div>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {tickets.filter(t => t.source === 'موظف' && t.requestType === RequestType.Inquiry).length}
                  </div>
                  {activeView === 'employees' && subView === 'inquiries' && (
                    <div className="text-xs text-emerald-800 dark:text-emerald-200 mt-1 font-medium">✓ عرض نشط - اضغط للإغلاق</div>
                  )}
                </div>
                <div
                  className={`cursor-pointer transition-all duration-200 rounded-lg p-3 border ${activeView === 'employees' && subView === 'complaints'
                      ? 'bg-white/40 dark:bg-gray-800/40 border-gray-200/40 dark:border-gray-700/40 ring-2 ring-emerald-300 shadow'
                      : 'bg-white/40 dark:bg-gray-800/40 border-gray-200/40 dark:border-gray-700/40 hover:ring hover:ring-emerald-200'
                    }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeView !== 'employees') {
                      setActiveView('employees');
                      setSubView('complaints');
                    } else {
                      setSubView(subView === 'complaints' ? 'all' : 'complaints');
                    }
                  }}
                  title={subView === 'complaints' && activeView === 'employees' ? 'اضغط للإغلاق' : 'اضغط لعرض الشكاوى'}
                >
                  <div className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">الشكاوى</div>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {tickets.filter(t => t.source === 'موظف' && t.requestType === RequestType.Complaint).length}
                  </div>
                  {activeView === 'employees' && subView === 'complaints' && (
                    <div className="text-xs text-emerald-800 dark:text-emerald-200 mt-1 font-medium">✓ عرض نشط - اضغط للإغلاق</div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <div
                  className={`cursor-pointer transition-all duration-200 rounded-lg p-3 border ${activeView === 'employees' && subView === 'messages'
                      ? 'bg-white/40 dark:bg-gray-800/40 border-gray-200/40 dark:border-gray-700/40 ring-2 ring-emerald-300 shadow'
                      : 'bg-white/40 dark:bg-gray-800/40 border-gray-200/40 dark:border-gray-700/40 hover:ring hover:ring-emerald-200'
                    }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeView !== 'employees') {
                      setActiveView('employees');
                      setSubView('messages');
                    } else {
                      setSubView(subView === 'messages' ? 'all' : 'messages');
                    }
                  }}
                  title={subView === 'messages' && activeView === 'employees' ? 'اضغط للإغلاق' : 'اضغط لعرض رسائل التواصل'}
                >
                  <div className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">رسائل التواصل</div>
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{contactStats.employeeMessages}</div>
                  <div className="text-xs text-emerald-800 dark:text-emerald-200">
                    استفسارات وملاحظات من الموظفين
                    {activeView === 'employees' && subView === 'messages' && (
                      <span className="font-medium"> - ✓ عرض نشط - اضغط للإغلاق</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {activeView === 'employees' && (
              <div className="mt-4 p-3 bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-lg border border-gray-200/30 dark:border-gray-700/30">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-emerald-800 dark:text-emerald-100 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-600 dark:bg-emerald-400 rounded-full"></span>
                    عرض نشط - يتم عرض طلبات الموظفين فقط
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation?.(); handleViewChange('all'); }}
                    className="text-xs text-emerald-700 dark:text-emerald-300 bg-white/30 dark:bg-gray-700/40 hover:bg-white/40 dark:hover:bg-gray-700/60 px-3 py-1 rounded-full border border-gray-200/50 dark:border-gray-600/50 font-medium transition-all duration-200"
                  >
                    اضغط للإغلاق ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* كارت طلبات المواطنين */}
          <div className={`mb-6 ${activeView === 'employees' ? 'hidden' : ''}`}>
            <div
              className={`cursor-pointer p-6 backdrop-blur rounded-2xl transition-all duration-300 border ${activeView === 'citizens'
                  ? 'bg-white/20 dark:bg-gray-800/20 border-gray-200/30 dark:border-gray-700/30 ring-2 ring-blue-400'
                  : 'bg-white/20 dark:bg-gray-800/20 border-gray-200/30 dark:border-gray-700/30'
                }`}
              onClick={() => handleViewChange(activeView === 'citizens' ? 'all' : 'citizens')}
              title={activeView === 'citizens' ? 'اضغط لإغلاق وعرض جميع الأقسام' : 'اضغط لعرض طلبات المواطنين فقط'}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-blue-800 dark:text-blue-200">طلبات المواطنين</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">الاستعلامات والشكاوى ورسائل التواصل</p>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {ticketStats.citizenTickets + contactStats.citizenMessages}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">إجمالي جميع الطلبات</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div
                  className={`cursor-pointer transition-all duration-200 rounded-lg p-3 border ${activeView === 'citizens' && subView === 'inquiries'
                      ? 'bg-white/40 dark:bg-gray-800/40 border-gray-200/40 dark:border-gray-700/40 ring-2 ring-blue-300 shadow'
                      : 'bg-white/40 dark:bg-gray-800/40 border-gray-200/40 dark:border-gray-700/40 hover:ring hover:ring-blue-200'
                    }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeView !== 'citizens') {
                      setActiveView('citizens');
                      setSubView('inquiries');
                    } else {
                      setSubView(subView === 'inquiries' ? 'all' : 'inquiries');
                    }
                  }}
                  title={subView === 'inquiries' && activeView === 'citizens' ? 'اضغط للإغلاق' : 'اضغط لعرض الاستعلامات'}
                >
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">الاستعلامات</div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {tickets.filter(t => t.source !== 'موظف' && t.requestType === RequestType.Inquiry).length}
                  </div>
                  {activeView === 'citizens' && subView === 'inquiries' && (
                    <div className="text-xs text-blue-800 dark:text-blue-200 mt-1 font-medium">✓ عرض نشط - اضغط للإغلاق</div>
                  )}
                </div>
                <div
                  className={`cursor-pointer transition-all duration-200 rounded-lg p-3 border ${activeView === 'citizens' && subView === 'complaints'
                      ? 'bg-white/40 dark:bg-gray-800/40 border-gray-200/40 dark:border-gray-700/40 ring-2 ring-blue-300 shadow'
                      : 'bg-white/40 dark:bg-gray-800/40 border-gray-200/40 dark:border-gray-700/40 hover:ring hover:ring-blue-200'
                    }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeView !== 'citizens') {
                      setActiveView('citizens');
                      setSubView('complaints');
                    } else {
                      setSubView(subView === 'complaints' ? 'all' : 'complaints');
                    }
                  }}
                  title={subView === 'complaints' && activeView === 'citizens' ? 'اضغط للإغلاق' : 'اضغط لعرض الشكاوى'}
                >
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">الشكاوى</div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {tickets.filter(t => t.source !== 'موظف' && t.requestType === RequestType.Complaint).length}
                  </div>
                  {activeView === 'citizens' && subView === 'complaints' && (
                    <div className="text-xs text-blue-800 dark:text-blue-200 mt-1 font-medium">✓ عرض نشط - اضغط للإغلاق</div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <div
                  className={`cursor-pointer transition-all duration-200 rounded-lg p-3 border ${activeView === 'citizens' && subView === 'messages'
                      ? 'bg-white/40 dark:bg-gray-800/40 border-gray-200/40 dark:border-gray-700/40 ring-2 ring-blue-300 shadow'
                      : 'bg-white/40 dark:bg-gray-800/40 border-gray-200/40 dark:border-gray-700/40 hover:ring hover:ring-blue-200'
                    }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (activeView !== 'citizens') {
                      setActiveView('citizens');
                      setSubView('messages');
                    } else {
                      setSubView(subView === 'messages' ? 'all' : 'messages');
                    }
                  }}
                  title={subView === 'messages' && activeView === 'citizens' ? 'اضغط للإغلاق' : 'اضغط لعرض رسائل التواصل'}
                >
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">رسائل التواصل</div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{contactStats.citizenMessages}</div>
                  <div className="text-xs text-blue-800 dark:text-blue-200">
                    استفسارات وملاحظات من المواطنين
                    {activeView === 'citizens' && subView === 'messages' && (
                      <span className="font-medium"> - ✓ عرض نشط - اضغط للإغلاق</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {activeView === 'citizens' && (
              <div className="mt-4 p-3 bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-lg border border-gray-200/30 dark:border-gray-700/30">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-blue-800 dark:text-blue-100 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></span>
                    عرض نشط - يتم عرض طلبات المواطنين فقط
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation?.(); handleViewChange('all'); }}
                    className="text-xs text-emerald-700 dark:text-emerald-300 bg-white/30 dark:bg-gray-700/40 hover:bg-white/40 dark:hover:bg-gray-700/60 px-3 py-1 rounded-full border border-gray-200/50 dark:border-gray-600/50 font-medium transition-all duration-200"
                  >
                    اضغط للإغلاق ✕
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
        {/* إغلاق حاوية الشبكة */}

        {/* إحصائيات تفصيلية للموظفين */}
        {activeView === 'employees' && (
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 text-center">إحصائيات طلبات الموظفين</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-xl p-3 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-sm text-indigo-700 dark:text-indigo-300 mb-1">جديد</div>
                  <div className="text-2xl font-bold text-indigo-800 dark:text-indigo-200">
                    {ticketStats.employeeStats.byStatus[RequestStatus.New]}
                  </div>
                </div>
              </div>

              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-xl p-3 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-sm text-amber-700 dark:text-amber-300 mb-1">قيد المعالجة</div>
                  <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                    {ticketStats.employeeStats.byStatus[RequestStatus.InProgress]}
                  </div>
                </div>
              </div>

              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-xl p-3 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-sm text-teal-700 dark:text-teal-300 mb-1">تم الرد</div>
                  <div className="text-2xl font-bold text-teal-800 dark:text-teal-200">
                    {ticketStats.employeeStats.byStatus[RequestStatus.Answered]}
                  </div>
                </div>
              </div>

              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-xl p-3 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">مغلق</div>
                  <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {ticketStats.employeeStats.byStatus[RequestStatus.Closed]}
                  </div>
                </div>
              </div>

              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-xl p-3 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">المجموع</div>
                  <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    {ticketStats.employeeStats.total}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* إحصائيات تفصيلية للمواطنين */}
        {activeView === 'citizens' && (
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 text-center">إحصائيات طلبات المواطنين</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-xl p-3 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-sm text-indigo-700 dark:text-indigo-300 mb-1">جديد</div>
                  <div className="text-2xl font-bold text-indigo-800 dark:text-indigo-200">
                    {ticketStats.citizenStats.byStatus[RequestStatus.New]}
                  </div>
                </div>
              </div>

              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-xl p-3 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-sm text-amber-700 dark:text-amber-300 mb-1">قيد المعالجة</div>
                  <div className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                    {ticketStats.citizenStats.byStatus[RequestStatus.InProgress]}
                  </div>
                </div>
              </div>

              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-xl p-3 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-sm text-teal-700 dark:text-teal-300 mb-1">تم الرد</div>
                  <div className="text-2xl font-bold text-teal-800 dark:text-teal-200">
                    {ticketStats.citizenStats.byStatus[RequestStatus.Answered]}
                  </div>
                </div>
              </div>

              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-xl p-3 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">مغلق</div>
                  <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {ticketStats.citizenStats.byStatus[RequestStatus.Closed]}
                  </div>
                </div>
              </div>

              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-xl p-3 border border-gray-200/30 dark:border-gray-700/30">
                <div className="text-center">
                  <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">المجموع</div>
                  <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    {ticketStats.citizenStats.total}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* عرض الطلبات المفلترة */}
        {(activeView === 'employees' || activeView === 'citizens') && (visibleTickets.length > 0 || visibleMessages.length > 0) && (
          <div className="space-y-6">
            {/* عرض التذاكر */}
            {visibleTickets.length > 0 && (
              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-2xl p-6 border border-gray-200/30 dark:border-gray-700/30">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {subView === 'inquiries' ? 'الاستعلامات' :
                      subView === 'complaints' ? 'الشكاوى' :
                        'الطلبات والاستعلامات'}
                    {activeView === 'employees' && ' - الموظفين'}
                    {activeView === 'citizens' && ' - المواطنين'}
                    <span className="text-sm font-normal text-gray-600 dark:text-gray-300 mr-2">
                      ({visibleTickets.length})
                    </span>
                  </h4>
                  <div className="flex gap-2">
                    {subView !== 'all' && (
                      <button
                        onClick={() => setSubView('all')}
                        className="px-3 py-1 text-xs bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-700 rounded-full border border-emerald-300 dark:border-emerald-600"
                      >
                        عرض جميع الأنواع
                      </button>
                    )}
                    <button
                      onClick={() => handleViewChange('all')}
                      className="px-3 py-1 text-xs bg-white/30 text-gray-800 dark:text-white hover:bg-white/40 rounded-full border border-gray-200/50 dark:border-gray-600/50"
                    >
                      عرض الكل
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {visibleTickets.slice(0, 10).map((ticket) => (
                    <div
                      key={ticket.id}
                      className={`relative overflow-hidden p-4 backdrop-blur rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.01] ring-1 ring-offset-0 ${ticketStatusRing(ticket.status)} bg-white/80 hover:bg-white/90 dark:bg-gray-900/30 dark:hover:bg-gray-900/40 border-gray-200/50 dark:border-gray-700/50 ${openTickets.some(t => t.id === ticket.id) ? 'ring-2 ring-emerald-500' : ''}`}
                      onClick={() => handleAddToSidePanel(ticket)}
                      title="اضغط لفتح التفاصيل في اللوحة الجانبية"
                    >
                      {/* Status gradient strips (RTL: right side and top bar) */}
                      <div className={`absolute inset-y-0 right-0 w-2 bg-gradient-to-b ${ticketStatusGradient(ticket.status)}`}></div>
                      <div className={`absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r ${ticketStatusGradient(ticket.status)}`}></div>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-800 dark:text-gray-100">
                              #{ticket.id}
                            </span>
                            {ticket.source === 'موظف' && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                                موظف
                              </span>
                            )}
                            <span className={`px-3 py-0.5 rounded-full text-xs font-medium shadow-sm ring-1 ring-white/20 ${ticketStatusBadge(ticket.status)}`}>
                              {ticket.status}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ticket.requestType === RequestType.Inquiry ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300' :
                                'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
                              }`}>
                              {ticket.requestType}
                            </span>
                          </div>

                          <h5 className="font-medium text-gray-800 dark:text-gray-100 mb-1">
                            {ticket.requestType === RequestType.Inquiry ? 'استعلام' : 'شكوى'}
                          </h5>

                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                            {ticket.details}
                          </p>

                          {/* مؤشر تحليل المشاعر */}
                          {(() => {
                            const sentiment = analyzeSentiment(ticket.details);
                            return (
                              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs mb-2 ${sentiment.sentiment === 'positive' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                                  sentiment.sentiment === 'negative' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' :
                                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                <span>{sentiment.emoji}</span>
                                <span>{sentiment.sentiment === 'positive' ? 'إيجابي' : sentiment.sentiment === 'negative' ? 'سلبي' : 'محايد'}</span>
                                {sentiment.urgency !== 'عادي' && (
                                  <span className="mr-1 text-red-600 dark:text-red-400">• إلحاح {sentiment.urgency}</span>
                                )}
                              </div>
                            );
                          })()}

                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>المقدم: {ticket.fullName}</span>
                            <span>القسم: {ticket.department}</span>
                            <span>التاريخ: {ticket.submissionDate ? (ticket.submissionDate instanceof Date ? ticket.submissionDate : new Date(ticket.submissionDate)).toLocaleDateString('ar-SY-u-nu-latn') : ''}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 mr-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToSidePanel(ticket);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                              openTickets.some(t => t.id === ticket.id)
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                : 'bg-white/60 dark:bg-gray-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                            }`}
                            title={openTickets.some(t => t.id === ticket.id) ? 'مفتوح في اللوحة الجانبية' : 'فتح في اللوحة الجانبية'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                            </svg>
                            <span className="text-xs">{openTickets.some(t => t.id === ticket.id) ? 'مفتوح' : 'فتح جانبي'}</span>
                          </button>
                          <div className="flex items-center gap-1 px-2 py-1 bg-white/60 dark:bg-gray-700/50 rounded-lg">
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="text-xs text-gray-600 dark:text-gray-400">عرض التفاصيل</span>
                          </div>

                          {(isAdmin || canAccessTicket(ticket)) && (
                            <>
                              {ticket.status === RequestStatus.New && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateTicketStatus(ticket.id, RequestStatus.InProgress);
                                  }}
                                  className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-900/70 transition-colors"
                                >
                                  بدء المعالجة
                                </button>
                              )}

                              {ticket.status === RequestStatus.InProgress && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateTicketStatus(ticket.id, RequestStatus.Answered);
                                  }}
                                  className="px-3 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-900/70 transition-colors"
                                >
                                  إرسال الرد
                                </button>
                              )}

                              {ticket.status === RequestStatus.Answered && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateTicketStatus(ticket.id, RequestStatus.Closed);
                                  }}
                                  className="px-3 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/70 transition-colors"
                                >
                                  إغلاق
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* عرض رسائل التواصل */}
            {visibleMessages.length > 0 && (
              <div className="bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-2xl p-6 border border-gray-200/30 dark:border-gray-700/30">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white">
                    رسائل التواصل
                    {activeView === 'employees' && ' - الموظفين'}
                    {activeView === 'citizens' && ' - المواطنين'}
                    <span className="text-sm font-normal text-gray-600 dark:text-gray-300 mr-2">
                      ({visibleMessages.length})
                    </span>
                  </h4>
                  <div className="flex gap-2">
                    {subView !== 'all' && (
                      <button
                        onClick={() => setSubView('all')}
                        className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700 rounded-full border border-blue-300 dark:border-blue-600"
                      >
                        عرض جميع الأنواع
                      </button>
                    )}
                    <button
                      onClick={() => handleViewChange('all')}
                      className="px-3 py-1 text-xs bg-white/30 text-gray-800 dark:text-white hover:bg-white/40 rounded-full border border-gray-200/50 dark:border-gray-600/50"
                    >
                      عرض الكل
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {visibleMessages.slice(0, 10).map((message) => (
                    <div
                      key={message.id}
                      className={`relative overflow-hidden p-4 backdrop-blur rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.01] ring-1 ring-offset-0 ${messageStatusRing(message.status)} bg-white/80 hover:bg-white/90 dark:bg-gray-900/30 dark:hover:bg-gray-900/40 border-gray-200/50 dark:border-gray-700/50 ${openTickets.some(t => t.id === message.id) ? 'ring-2 ring-emerald-500' : ''}`}
                      onClick={() => handleAddToSidePanel(message)}
                      title="اضغط لفتح التفاصيل في اللوحة الجانبية"
                    >
                      {/* Status gradient strips (RTL: right side and top bar) */}
                      <div className={`absolute inset-y-0 right-0 w-2 bg-gradient-to-b ${messageStatusGradient(message.status)}`}></div>
                      <div className={`absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r ${messageStatusGradient(message.status)}`}></div>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-800 dark:text-gray-100">
                              {message.name}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {message.email}
                            </span>
                            {message.source === 'موظف' && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                                موظف
                              </span>
                            )}
                            <span className={`px-3 py-0.5 rounded-full text-xs font-medium shadow-sm ring-1 ring-white/20 ${messageStatusBadge(message.status)}`}>
                              {message.status}
                            </span>
                          </div>

                          <h5 className="font-medium text-gray-800 dark:text-gray-100 mb-1">
                            {message.subject}
                          </h5>

                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                            {message.message}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>التاريخ: {new Date(message.submissionDate).toLocaleDateString('ar-SY-u-nu-latn')}</span>
                            {message.department && <span>القسم: {message.department}</span>}
                          </div>
                        </div>

                        <div className="flex gap-2 mr-4">
                          <div className="flex items-center gap-1 px-2 py-1 bg-white/60 dark:bg-gray-700/50 rounded-lg">
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="text-xs text-gray-600 dark:text-gray-400">عرض التفاصيل</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // يمكن إضافة منطق سريع للرد هنا
                            }}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/70 transition-colors"
                          >
                            رد سريع
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* رسالة إرشادية عند عدم تحديد عرض */}
        {activeView === 'all' && visibleTickets.length === 0 && visibleMessages.length === 0 && (
          <div className="text-center py-12 text-gray-600 dark:text-gray-300 bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-2xl border border-gray-200/30 dark:border-gray-700/30">
            <div className="w-20 h-20 mx-auto mb-4 bg-white/30 dark:bg-gray-700/30 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h4 className="text-lg font-medium mb-2">اضغط على الكارتات أعلاه</h4>
            <p>اختر كارت الموظفين أو المواطنين لعرض الطلبات المصنفة</p>
          </div>
        )}
      </div>

      {/* اللوحة الجانبية للطلبات المفتوحة */}
      {showSidePanel && openTickets.length > 0 && (
        <div className="fixed inset-y-0 left-0 z-[60] w-full max-w-3xl bg-white dark:bg-gray-900 shadow-2xl border-r border-gray-200 dark:border-gray-700 flex flex-col animate-slide-in-left">
          {/* رأس اللوحة */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold">الطلبات المفتوحة ({openTickets.length})</h3>
              <div className="flex items-center gap-2 text-sm">
                <span>ترتيب:</span>
                <select
                  value={sidePanelSort}
                  onChange={(e) => setSidePanelSort(e.target.value as any)}
                  className="bg-white/20 border border-white/30 rounded px-2 py-1 text-white text-sm"
                >
                  <option value="date">التاريخ</option>
                  <option value="id">الرقم</option>
                  <option value="status">الحالة</option>
                </select>
                <button
                  onClick={() => setSidePanelSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
                  title={sidePanelSortDir === 'asc' ? 'تصاعدي' : 'تنازلي'}
                >
                  {sidePanelSortDir === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpenTickets([])}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
              >
                إغلاق الكل
              </button>
              <button
                onClick={() => setShowSidePanel(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* قائمة الطلبات المفتوحة */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {sortedOpenTickets.map((ticket, index) => (
              <div
                key={ticket.id}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* رأس الطلب */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{index + 1}</span>
                    <span className="font-bold text-gray-800 dark:text-gray-100">#{ticket.id}</span>
                    {'requestType' in ticket && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        ticket.requestType === RequestType.Inquiry
                          ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
                      }`}>
                        {ticket.requestType}
                      </span>
                    )}
                    {'status' in ticket && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        ticket.status === RequestStatus.New ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300' :
                        ticket.status === RequestStatus.InProgress ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' :
                        ticket.status === RequestStatus.Answered ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300'
                      }`}>
                        {ticket.status}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveFromSidePanel(ticket.id)}
                    className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="إغلاق هذا الطلب"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* محتوى الطلب الكامل */}
                <div className="p-4 space-y-4">
                  {/* المعلومات الأساسية */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">المقدم: </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {'fullName' in ticket ? ticket.fullName : ('name' in ticket ? ticket.name : '')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">القسم: </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {'department' in ticket ? ticket.department : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">البريد: </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {'email' in ticket ? ticket.email : ''}
                      </span>
                    </div>
                    {'phone' in ticket && ticket.phone && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">الهاتف: </span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{ticket.phone}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">التاريخ: </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {new Date((ticket as any).submissionDate || (ticket as any).submittedAt || Date.now()).toLocaleDateString('ar-SY-u-nu-latn')}
                      </span>
                    </div>
                    {'subject' in ticket && ticket.subject && (
                      <div className="col-span-2">
                        <span className="text-gray-500 dark:text-gray-400">الموضوع: </span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{ticket.subject}</span>
                      </div>
                    )}
                  </div>

                  {/* التفاصيل الكاملة */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">التفاصيل:</span>
                    <p className="mt-2 text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                      {'details' in ticket ? ticket.details : ('message' in ticket ? (ticket as any).message : '')}
                    </p>
                  </div>

                  {/* المرفقات إن وجدت */}
                  {'attachments_data' in ticket && ticket.attachments_data && ticket.attachments_data.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedAttachments(prev => ({ ...prev, [ticket.id]: !prev[ticket.id] }))}
                      >
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          المرفقات ({ticket.attachments_data.length})
                        </span>
                        <svg className={`w-4 h-4 text-blue-600 transition-transform ${expandedAttachments[ticket.id] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      {expandedAttachments[ticket.id] && (
                        <div className="mt-3 space-y-2">
                          {ticket.attachments_data.map((att: any, attIdx: number) => (
                            <div key={attIdx} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-2 text-sm">
                              <div className="flex items-center gap-2">
                                {att.type?.startsWith('image/') ? (
                                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                ) : att.type === 'application/pdf' ? (
                                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                ) : (
                                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                )}
                                <span className="text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{att.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {(att.url || att.base64) && (
                                  <button
                                    onClick={() => window.open(att.url || att.base64, '_blank')}
                                    className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                                    title="فتح"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* الرد الموجود */}
                  {'response' in ticket && ticket.response && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">الرد:</span>
                      <p className="mt-2 text-emerald-800 dark:text-emerald-200 text-sm leading-relaxed whitespace-pre-wrap">
                        {ticket.response}
                      </p>
                      {'responseDate' in ticket && ticket.responseDate && (
                        <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                          تاريخ الرد: {new Date(ticket.responseDate).toLocaleDateString('ar-SY-u-nu-latn')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* التوثيق والمعلومات الإضافية */}
                  {'requestType' in ticket && (
                    <div className="bg-slate-50 dark:bg-slate-900/20 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">توثيق الديوان</span>
                        {!sidePanelDiwan[ticket.id]?.editing && (
                          <button
                            onClick={() => setSidePanelDiwan(prev => ({
                              ...prev,
                              [ticket.id]: {
                                number: (ticket as any).diwanNumber || '',
                                date: (ticket as any).diwanDate || '',
                                editing: true
                              }
                            }))}
                            className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          >
                            تعديل
                          </button>
                        )}
                      </div>
                      {sidePanelDiwan[ticket.id]?.editing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="رقم الديوان"
                            value={sidePanelDiwan[ticket.id]?.number || ''}
                            onChange={(e) => setSidePanelDiwan(prev => ({
                              ...prev,
                              [ticket.id]: { ...prev[ticket.id], number: e.target.value }
                            }))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          />
                          <input
                            type="date"
                            value={sidePanelDiwan[ticket.id]?.date || ''}
                            onChange={(e) => setSidePanelDiwan(prev => ({
                              ...prev,
                              [ticket.id]: { ...prev[ticket.id], date: e.target.value }
                            }))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const diwan = sidePanelDiwan[ticket.id];
                                if (diwan && updateTicket) {
                                  updateTicket(ticket.id, { diwanNumber: diwan.number, diwanDate: diwan.date });
                                  setOpenTickets(prev => prev.map(t =>
                                    t.id === ticket.id ? { ...t, diwanNumber: diwan.number, diwanDate: diwan.date } as any : t
                                  ));
                                }
                                setSidePanelDiwan(prev => ({ ...prev, [ticket.id]: { ...prev[ticket.id], editing: false } }));
                              }}
                              className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            >
                              حفظ
                            </button>
                            <button
                              onClick={() => setSidePanelDiwan(prev => ({ ...prev, [ticket.id]: { ...prev[ticket.id], editing: false } }))}
                              className="px-3 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">رقم الديوان: </span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{(ticket as any).diwanNumber || 'غير موثق'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">تاريخ الديوان: </span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{(ticket as any).diwanDate || 'غير محدد'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* QR Code للتتبع والتوثيق */}
                  {'requestType' in ticket && sidePanelQR[ticket.id] && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-400">رموز QR</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {/* QR للتتبع */}
                        <div className="text-center">
                          <p className="text-xs text-purple-600 dark:text-purple-400 mb-2 font-medium">QR للتتبع</p>
                          {sidePanelQR[ticket.id]?.tracking && (
                            <img 
                              src={sidePanelQR[ticket.id].tracking} 
                              alt="QR Code للتتبع" 
                              className="mx-auto w-24 h-24 border border-purple-200 dark:border-purple-700 rounded-lg bg-white p-1"
                            />
                          )}
                        </div>
                        {/* QR للتوثيق */}
                        <div className="text-center">
                          <p className="text-xs text-purple-600 dark:text-purple-400 mb-2 font-medium">QR للتوثيق</p>
                          {sidePanelQR[ticket.id]?.diwan ? (
                            <img 
                              src={sidePanelQR[ticket.id].diwan} 
                              alt="QR Code للتوثيق" 
                              className="mx-auto w-24 h-24 border border-purple-200 dark:border-purple-700 rounded-lg bg-white p-1"
                            />
                          ) : (
                            <div className="mx-auto w-24 h-24 border border-dashed border-purple-300 dark:border-purple-600 rounded-lg flex items-center justify-center bg-purple-50/50 dark:bg-purple-900/30">
                              <span className="text-xs text-purple-400 dark:text-purple-500 text-center px-1">يتطلب<br/>توثيق الديوان</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          // تحديث QR للتوثيق بعد حفظ بيانات الديوان
                          const diwanNumber = (ticket as any).diwanNumber || sidePanelDiwan[ticket.id]?.number;
                          const diwanDate = (ticket as any).diwanDate || sidePanelDiwan[ticket.id]?.date;
                          if (diwanNumber && diwanDate) {
                            const diwanData = JSON.stringify({
                              id: ticket.id,
                              diwanNumber,
                              diwanDate,
                              type: (ticket as any).requestType,
                              submissionDate: (ticket as any).submissionDate
                            });
                            const diwanQR = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(diwanData)}`;
                            setSidePanelQR(prev => ({ ...prev, [ticket.id]: { ...prev[ticket.id], diwan: diwanQR } }));
                          }
                        }}
                        className="mt-3 w-full px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      >
                        تحديث QR للتوثيق
                      </button>
                    </div>
                  )}

                  {/* التواصل مع المواطن */}
                  {'requestType' in ticket && (ticket.email || ticket.phone) && (
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg p-3 border-2 border-dashed border-emerald-300/50 dark:border-emerald-600/50">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">التواصل مع المواطن</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {ticket.email && (
                          <a
                            href={`mailto:${ticket.email}?subject=${encodeURIComponent(`رد على طلبك رقم ${ticket.id}`)}`}
                            className="flex items-center justify-center gap-1 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            بريد
                          </a>
                        )}
                        {ticket.phone && (
                          <a
                            href={`sms:${ticket.phone}?body=${encodeURIComponent(`رد على طلبك رقم ${ticket.id}: `)}`}
                            className="flex items-center justify-center gap-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            SMS
                          </a>
                        )}
                        {ticket.phone && (
                          <a
                            href={`https://wa.me/${ticket.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`رد على طلبك رقم ${ticket.id}:\n\n`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1 p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            واتساب
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* إرسال لقسم آخر */}
                  {'requestType' in ticket && (isAdmin || canAccessTicket(ticket)) && (
                    <div className="space-y-2">
                      <button
                        onClick={() => setSidePanelForward(prev => ({
                          ...prev,
                          [ticket.id]: { show: !prev[ticket.id]?.show, dept: prev[ticket.id]?.dept || '', comment: prev[ticket.id]?.comment || '' }
                        }))}
                        className="w-full px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        {sidePanelForward[ticket.id]?.show ? 'إخفاء التحويل' : 'إرسال لقسم آخر'}
                      </button>
                      {sidePanelForward[ticket.id]?.show && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 space-y-2">
                          <select
                            value={sidePanelForward[ticket.id]?.dept || ''}
                            onChange={(e) => setSidePanelForward(prev => ({
                              ...prev,
                              [ticket.id]: { ...prev[ticket.id], dept: e.target.value }
                            }))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          >
                            <option value="">اختر القسم</option>
                            {departmentNames.map(dept => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                          <textarea
                            placeholder="ملاحظة (اختياري)"
                            value={sidePanelForward[ticket.id]?.comment || ''}
                            onChange={(e) => setSidePanelForward(prev => ({
                              ...prev,
                              [ticket.id]: { ...prev[ticket.id], comment: e.target.value }
                            }))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                            rows={2}
                          />
                          <button
                            onClick={() => {
                              const fwd = sidePanelForward[ticket.id];
                              if (fwd?.dept && forwardTicket) {
                                forwardTicket(ticket.id, fwd.dept, fwd.comment);
                                const updatedForwardedTo = [...((ticket as any).forwardedTo || []), fwd.dept];
                                setOpenTickets(prev => prev.map(t =>
                                  t.id === ticket.id ? { ...t, forwardedTo: updatedForwardedTo } as any : t
                                ));
                                setSidePanelForward(prev => ({ ...prev, [ticket.id]: { show: false, dept: '', comment: '' } }));
                              }
                            }}
                            disabled={!sidePanelForward[ticket.id]?.dept}
                            className="w-full px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors"
                          >
                            إرسال
                          </button>
                        </div>
                      )}
                      {/* عرض الأقسام المحال إليها */}
                      {'forwardedTo' in ticket && (ticket as any).forwardedTo?.length > 0 && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-wrap gap-1 items-center">
                          <span>محال إلى:</span>
                          {(ticket as any).forwardedTo.map((dept: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full">{dept}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* الأرشفة */}
                  {'requestType' in ticket && (isAdmin || canAccessTicket(ticket)) && (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          const t = ticket as any;
                          const hasReply = !!(t.response && String(t.response).trim());
                          // إذا لم تكن الحالة مغلق
                          if (t.status !== RequestStatus.Closed) {
                            alert('لا يمكن الأرشفة إلا بعد إغلاق الطلب. يرجى إغلاق الطلب أولاً.');
                            return;
                          }
                          // إذا مغلق بدون رد: نطلب السبب
                          if (!hasReply) {
                            setSidePanelArchive(prev => ({
                              ...prev,
                              [ticket.id]: { showNote: true, note: prev[ticket.id]?.note || '' }
                            }));
                            return;
                          }
                          // أرشفة مباشرة
                          if (updateTicket) {
                            updateTicket(ticket.id, { archived: true, archivedAt: new Date().toISOString() });
                            setOpenTickets(prev => prev.map(t =>
                              t.id === ticket.id ? { ...t, archived: true } as any : t
                            ));
                            alert('تم الأرشفة بنجاح');
                          }
                        }}
                        className="w-full px-3 py-2 text-sm bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        حفظ وأرشفة
                      </button>
                      {sidePanelArchive[ticket.id]?.showNote && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700 space-y-2">
                          <p className="text-xs text-amber-700 dark:text-amber-300">تم إغلاق الطلب دون رد. يرجى كتابة سبب الإغلاق:</p>
                          <textarea
                            placeholder="سبب الإغلاق دون رد..."
                            value={sidePanelArchive[ticket.id]?.note || ''}
                            onChange={(e) => setSidePanelArchive(prev => ({
                              ...prev,
                              [ticket.id]: { ...prev[ticket.id], note: e.target.value }
                            }))}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                            rows={2}
                          />
                          <button
                            onClick={() => {
                              const note = sidePanelArchive[ticket.id]?.note;
                              if (!note?.trim()) {
                                alert('يرجى كتابة سبب الإغلاق');
                                return;
                              }
                              if (updateTicket) {
                                const newOpinion = `${(ticket as any).opinion ? (ticket as any).opinion + '\n' : ''}[سبب الإغلاق دون رد]: ${note.trim()}`;
                                updateTicket(ticket.id, { archived: true, archivedAt: new Date().toISOString(), opinion: newOpinion });
                                setOpenTickets(prev => prev.map(t =>
                                  t.id === ticket.id ? { ...t, archived: true } as any : t
                                ));
                                setSidePanelArchive(prev => ({ ...prev, [ticket.id]: { showNote: false, note: '' } }));
                                alert('تم الأرشفة بنجاح');
                              }
                            }}
                            disabled={!sidePanelArchive[ticket.id]?.note?.trim()}
                            className="w-full px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded transition-colors"
                          >
                            تأكيد الأرشفة
                          </button>
                        </div>
                      )}
                      {(ticket as any).archived && (
                        <div className="text-xs text-center text-amber-600 dark:text-amber-400 font-medium">✓ تمت الأرشفة</div>
                      )}
                    </div>
                  )}

                  {/* حقل الرد الجديد (للطلبات التي لم يتم الرد عليها) */}
                  {'status' in ticket && 'requestType' in ticket && (isAdmin || canAccessTicket(ticket)) && 
                   (ticket.status === RequestStatus.New || ticket.status === RequestStatus.InProgress) && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">إضافة رد:</label>
                      <textarea
                        value={sidePanelResponses[ticket.id] || ''}
                        onChange={(e) => setSidePanelResponses(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                        placeholder="اكتب ردك هنا..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                        rows={3}
                      />
                      <button
                        onClick={() => {
                          const response = sidePanelResponses[ticket.id];
                          if (response?.trim()) {
                            updateTicketStatus(ticket.id, RequestStatus.Answered, response);
                            setSidePanelResponses(prev => {
                              const updated = { ...prev };
                              delete updated[ticket.id];
                              return updated;
                            });
                            // تحديث الطلب في اللوحة الجانبية
                            setOpenTickets(prev => prev.map(t => 
                              t.id === ticket.id 
                                ? { ...t, status: RequestStatus.Answered, response, responseDate: new Date() } as any
                                : t
                            ));
                          }
                        }}
                        disabled={!sidePanelResponses[ticket.id]?.trim()}
                        className="w-full px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                      >
                        إرسال الرد
                      </button>
                    </div>
                  )}

                  {/* أزرار الإجراءات السريعة */}
                  {'status' in ticket && 'requestType' in ticket && (isAdmin || canAccessTicket(ticket)) && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                      {ticket.status === RequestStatus.New && (
                        <button
                          onClick={() => {
                            updateTicketStatus(ticket.id, RequestStatus.InProgress);
                            setOpenTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: RequestStatus.InProgress } as any : t));
                          }}
                          className="px-3 py-1.5 text-xs bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:hover:bg-yellow-900/70 text-yellow-800 dark:text-yellow-300 rounded-lg transition-colors"
                        >
                          بدء المعالجة
                        </button>
                      )}
                      {ticket.status === RequestStatus.Answered && (
                        <button
                          onClick={() => {
                            updateTicketStatus(ticket.id, RequestStatus.Closed);
                            setOpenTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: RequestStatus.Closed } as any : t));
                          }}
                          className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700/50 dark:hover:bg-gray-700/70 text-gray-800 dark:text-gray-300 rounded-lg transition-colors"
                        >
                          إغلاق الطلب
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* زر إظهار اللوحة الجانبية عندما تكون مخفية */}
      {openTickets.length > 0 && !showSidePanel && (
        <button
          onClick={() => setShowSidePanel(true)}
          className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg transition-all hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <span className="font-medium">الطلبات المفتوحة ({openTickets.length})</span>
        </button>
      )}

      {/* نافذة الإحصائيات الكاملة */}
      {showFullStats && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-6xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">الإحصائيات الكاملة</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFullStats(false)}
                  className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
                >
                  إغلاق
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8 max-h-[75vh] overflow-y-auto">
              {/* الملخص العام */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-indigo-600/15 dark:bg-indigo-800/20 rounded-xl p-4 border border-indigo-300/30 dark:border-indigo-600/30">
                  <div className="text-center">
                    <div className="text-sm text-indigo-700 dark:text-indigo-300 mb-1">جديد</div>
                    <div className="text-3xl font-bold text-indigo-800 dark:text-indigo-200">{ticketStats.byStatus[RequestStatus.New]}</div>
                  </div>
                </div>
                <div className="bg-amber-600/15 dark:bg-amber-800/20 rounded-xl p-4 border border-amber-300/30 dark:border-amber-600/30">
                  <div className="text-center">
                    <div className="text-sm text-amber-700 dark:text-amber-300 mb-1">قيد المعالجة</div>
                    <div className="text-3xl font-bold text-amber-800 dark:text-amber-200">{ticketStats.byStatus[RequestStatus.InProgress]}</div>
                  </div>
                </div>
                <div className="bg-teal-600/15 dark:bg-teal-800/20 rounded-xl p-4 border border-teal-300/30 dark:border-teal-600/30">
                  <div className="text-center">
                    <div className="text-sm text-teal-700 dark:text-teal-300 mb-1">تم الرد</div>
                    <div className="text-3xl font-bold text-teal-800 dark:text-teal-200">{ticketStats.byStatus[RequestStatus.Answered]}</div>
                  </div>
                </div>
                <div className="bg-blue-600/15 dark:bg-blue-800/20 rounded-xl p-4 border border-blue-300/30 dark:border-blue-600/30">
                  <div className="text-center">
                    <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">مغلق</div>
                    <div className="text-3xl font-bold text-blue-800 dark:text-blue-200">{ticketStats.byStatus[RequestStatus.Closed]}</div>
                  </div>
                </div>
                <div className="bg-emerald-600/15 dark:bg-emerald-800/20 rounded-xl p-4 border border-emerald-300/30 dark:border-emerald-600/30">
                  <div className="text-center">
                    <div className="text-sm text-emerald-700 dark:text-emerald-300 mb-1">من الموظفين</div>
                    <div className="text-3xl font-bold text-emerald-800 dark:text-emerald-200">{ticketStats.employeeTickets}</div>
                  </div>
                </div>
                <div className="bg-sky-600/15 dark:bg-sky-800/20 rounded-xl p-4 border border-sky-300/30 dark:border-sky-600/30">
                  <div className="text-center">
                    <div className="text-sm text-sky-700 dark:text-sky-300 mb-1">من المواطنين</div>
                    <div className="text-3xl font-bold text-sky-800 dark:text-sky-200">{ticketStats.citizenTickets}</div>
                  </div>
                </div>
              </div>

              {/* تذاكر حسب المصدر */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200/40 dark:border-gray-700/40">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">تذاكر الموظفين حسب الحالة</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-indigo-100/60 dark:bg-indigo-900/40 text-center">
                      <div className="text-xs text-indigo-800 dark:text-indigo-300">جديد</div>
                      <div className="text-xl font-bold text-indigo-900 dark:text-indigo-200">{ticketStats.employeeStats.byStatus[RequestStatus.New]}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-100/60 dark:bg-amber-900/40 text-center">
                      <div className="text-xs text-amber-800 dark:text-amber-300">قيد المعالجة</div>
                      <div className="text-xl font-bold text-amber-900 dark:text-amber-200">{ticketStats.employeeStats.byStatus[RequestStatus.InProgress]}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-teal-100/60 dark:bg-teal-900/40 text-center">
                      <div className="text-xs text-teal-800 dark:text-teal-300">تم الرد</div>
                      <div className="text-xl font-bold text-teal-900 dark:text-teal-200">{ticketStats.employeeStats.byStatus[RequestStatus.Answered]}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-100/60 dark:bg-blue-900/40 text-center">
                      <div className="text-xs text-blue-800 dark:text-blue-300">مغلق</div>
                      <div className="text-xl font-bold text-blue-900 dark:text-blue-200">{ticketStats.employeeStats.byStatus[RequestStatus.Closed]}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200/40 dark:border-gray-700/40">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">تذاكر المواطنين حسب الحالة</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-indigo-100/60 dark:bg-indigo-900/40 text-center">
                      <div className="text-xs text-indigo-800 dark:text-indigo-300">جديد</div>
                      <div className="text-xl font-bold text-indigo-900 dark:text-indigo-200">{ticketStats.citizenStats.byStatus[RequestStatus.New]}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-100/60 dark:bg-amber-900/40 text-center">
                      <div className="text-xs text-amber-800 dark:text-amber-300">قيد المعالجة</div>
                      <div className="text-xl font-bold text-amber-900 dark:text-amber-200">{ticketStats.citizenStats.byStatus[RequestStatus.InProgress]}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-teal-100/60 dark:bg-teal-900/40 text-center">
                      <div className="text-xs text-teal-800 dark:text-teal-300">تم الرد</div>
                      <div className="text-xl font-bold text-teal-900 dark:text-teal-200">{ticketStats.citizenStats.byStatus[RequestStatus.Answered]}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-100/60 dark:bg-blue-900/40 text-center">
                      <div className="text-xs text-blue-800 dark:text-blue-300">مغلق</div>
                      <div className="text-xl font-bold text-blue-900 dark:text-blue-200">{ticketStats.citizenStats.byStatus[RequestStatus.Closed]}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* رسائل التواصل + مخططات */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200/40 dark:border-gray-700/40">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">رسائل التواصل - المجموع</h4>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{contactStats.total}</div>
                </div>
                <div className="bg-emerald-600/15 dark:bg-emerald-800/20 rounded-xl p-4 border border-emerald-300/30 dark:border-emerald-600/30">
                  <div className="text-sm text-emerald-800 dark:text-emerald-300 mb-1">من الموظفين</div>
                  <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-200">{contactStats.employeeMessages}</div>
                </div>
                <div className="bg-sky-600/15 dark:bg-sky-800/20 rounded-xl p-4 border border-sky-300/30 dark:border-sky-600/30">
                  <div className="text-sm text-sky-800 dark:text-sky-300 mb-1">من المواطنين</div>
                  <div className="text-3xl font-bold text-sky-900 dark:text-sky-200">{contactStats.citizenMessages}</div>
                </div>
              </div>

              {/* مخططات بيانية */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">حالة التذاكر</h4>
                  <DonutChart data={ticketStatusData} centerLabel="التذاكر" />
                </div>
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">حالة الرسائل</h4>
                  <DonutChart data={messageStatusData} centerLabel="الرسائل" />
                </div>
              </div>

              {/* أهم الأقسام */}
              <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">أهم الأقسام حسب إجمالي النشاط</h4>
                <BarChart data={topDepartmentsData} />
              </div>

              {/* حسب القسم */}
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">توزيع حسب الأقسام</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-auto pr-1">
                  {deptStats.map(row => (
                    <div key={row.name} className="p-3 rounded-lg bg-white/40 dark:bg-gray-800/40 border border-gray-200/40 dark:border-gray-700/40 flex items-center justify-between">
                      <div className="text-gray-800 dark:text-gray-200 font-medium">{row.name}</div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">تذاكر: {row.tickets}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300">رسائل: {row.messages}</span>
                      </div>
                    </div>
                  ))}
                  {deptStats.length === 0 && (
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">لا توجد بيانات متاحة</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsManagementPage;