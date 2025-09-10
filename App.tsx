import React, { useState, useEffect, createContext, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import SubmitRequestPage from './pages/SubmitRequestPage';
import TrackRequestPage from './pages/TrackRequestPage_fixed';
import FaqPage from './pages/FaqPage';
import NewsPage from './pages/NewsPage';
import DashboardPage from './pages/DashboardPage';
import ConfirmationPage from './pages/ConfirmationPage';
import LoginPage from './pages/LoginPage';
import EmployeeManagementPage from './pages/EmployeeManagementPage';
import ToolsPage from './pages/ToolsPage';
import GeneralDiwanPage from './pages/GeneralDiwanPage';
import ContactPage from './pages/ContactPage';
import ContactMessagesPage from './pages/ContactMessagesPage';
import HrmsPage from './pages/HrmsPage';
import CoreHrPage from './pages/hrms/CoreHrPage';
import PayrollPage from './pages/hrms/PayrollPage';
import AttendancePage from './pages/hrms/AttendancePage';
import LeavePage from './pages/hrms/LeavePage';
import EssMssPage from './pages/hrms/EssMssPage';
import PerformancePage from './pages/hrms/PerformancePage';
import RecruitmentPage from './pages/hrms/RecruitmentPage';
import ReportsPage from './pages/hrms/ReportsPage';
import RequestsPage from './pages/RequestsPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import DepartmentsPage from './pages/DepartmentsPage';
import AdminMonitorPage from './pages/AdminMonitorPage';
import { Ticket, Employee, ContactMessage, ContactMessageStatus, ContactMessageType, Department, DepartmentNotification } from './types';
import { generateTicketId } from './utils/idGenerator';
import { RequestStatus } from './types';

type Theme = 'light' | 'dark';

interface AppContextType {
  tickets: Ticket[];
  notifications: DepartmentNotification[];
  addTicket: (ticket: Omit<Ticket, 'id' | 'status'>) => string;
  findTicket: (id: string) => Ticket | undefined;
  contactMessages: ContactMessage[];
  addContactMessage: (msg: Omit<ContactMessage, 'id' | 'status' | 'submissionDate'>) => string;
  isEmployeeLoggedIn: boolean;
  currentEmployee: Employee | null;
  employeeLogin: (employee: Employee) => void;
  logout: () => void;
  updateTicketStatus: (ticketId: string, newStatus: RequestStatus, responseText?: string, responseAttachments?: File[]) => void;
  updateTicketDepartment: (ticketId: string, newDepartment: Department) => void;
  updateTicketResponse: (ticketId: string, responseText: string, responseAttachments?: File[]) => void;
  updateTicketOpinion: (ticketId: string, opinion: string) => void;
  updateTicketForwardedTo: (ticketId: string, departments: Department[]) => void;
  markNotificationsReadForDepartment: (department: Department) => void;
  addNotification: (n: Omit<DepartmentNotification, 'id' | 'createdAt' | 'read'> & { message?: string }) => void;
  updateContactMessageStatus: (id: string, newStatus: ContactMessageStatus) => void;
  lastSubmittedId: string | null;
  theme: Theme;
  toggleTheme: () => void;
}

export const AppContext = createContext<AppContextType | null>(null);

const App: React.FC = () => {
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
  const [isEmployeeLoggedIn, setIsEmployeeLoggedIn] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(() => {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);
  // Helpers for permissions
  const isAdmin = !!(currentEmployee && currentEmployee.role === 'مدير');
  const employeeDept = currentEmployee?.department || '';
  const canAccessTicket = (t: Ticket): boolean => {
    if (isAdmin) return true;
    if (!employeeDept) return false;
    return String(t.department) === employeeDept || (t.forwardedTo || []).includes(employeeDept);
  };
  const canEditTicket = canAccessTicket; // same rule for edit in this app
  
  // تحقق من وجود جلسة سابقة
  useEffect(() => {
    const storedEmployee = localStorage.getItem('currentUser');
    if (storedEmployee) {
      try {
        const employee = JSON.parse(storedEmployee);
        setCurrentEmployee(employee);
        setIsEmployeeLoggedIn(true);
      } catch (error) {
        localStorage.removeItem('currentUser');
      }
    }
  }, []);
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
  // persist notifications
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);
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

  const handleHashChange = useCallback(() => {
    const raw = window.location.hash || '#/'
    const newRoute = raw.split('?')[0];
    if (newRoute === '#/dashboard' && !isEmployeeLoggedIn) {
        window.location.hash = '#/login';
        setRoute('#/login');
    } else {
        setRoute(newRoute);
    }
  }, [isEmployeeLoggedIn]);


  useEffect(() => {
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [handleHashChange]);

  const addTicket = (ticketData: Omit<Ticket, 'id' | 'status'>) => {
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
    } catch {}
    let newId = (manualId && manualId.length > 3) ? manualId : generateTicketId();
    // في حال حدث تكرار (مثلاً نسيان التحقق في واجهة الإرسال) نولد معرفاً جديداً آلياً
    if (tickets.some(t => t.id.toUpperCase() === newId.toUpperCase())) {
      newId = generateTicketId();
    }

    const newTicket: Ticket = {
      id: newId,
      status: RequestStatus.New,
      ...ticketData,
    };
  setTickets(prevTickets => [...prevTickets, newTicket]);
    // Notify target department of new ticket
    try {
      const dep = ticketData.department;
      if (dep) {
        setNotifications(prev => [
          {
            id: `N-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
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
    } catch {}
    setLastSubmittedId(newTicket.id);
    return newId;
  };

  const addContactMessage = (msg: Omit<ContactMessage, 'id' | 'status' | 'submissionDate'>) => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const uniquePart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newId = `MSG-${datePart}-${uniquePart}`;
    const newMsg: ContactMessage = { id: newId, status: ContactMessageStatus.New, submissionDate: now, ...msg };
    setContactMessages(prev => [newMsg, ...prev]);
    return newId;
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
          role: 'مدير'
        },
        {
          username: 'finance1',
          password: 'finance123',
          name: 'أحمد مستخدم',
          department: 'المالية',
          role: 'موظف'
        },
        {
          username: 'hr1',
          password: 'hr123',
          name: 'فاطمة علي',
          department: 'الموارد البشرية',
          role: 'موظف'
        }
      ];
      localStorage.setItem('employees', JSON.stringify(defaultEmployees));
    }
  }, []);

  const employeeLogin = (usernameOrEmployee: string | Employee, password?: string): boolean => {
    const employeesData = localStorage.getItem('employees');
    const employees: Employee[] = employeesData ? JSON.parse(employeesData) : [];
    let employee: Employee | undefined;

    if (typeof usernameOrEmployee === 'string') {
      employee = employees.find(emp => emp.username === usernameOrEmployee && emp.password === password);
    } else {
      employee = employees.find(emp => emp.username === usernameOrEmployee.username && emp.password === usernameOrEmployee.password);
    }

    if (employee) {
      setCurrentEmployee(employee);
      setIsEmployeeLoggedIn(true);
      localStorage.setItem('currentUser', JSON.stringify(employee));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentEmployee(null);
    setIsEmployeeLoggedIn(false);
    localStorage.removeItem('currentUser');
    if(route === '#/dashboard') {
        window.location.hash = '#/';
    }
  };

  const updateTicketStatus = (ticketId: string, newStatus: RequestStatus, responseText?: string, responseAttachments?: File[]) => {
    setTickets(prevTickets =>
      prevTickets.map(ticket => {
        if (ticket.id !== ticketId) return ticket;
        if (!canEditTicket(ticket)) return ticket;
        const now = new Date();
        const patch: Partial<Ticket> = { status: newStatus };
        if (newStatus === RequestStatus.InProgress && !ticket.startedAt) patch.startedAt = now;
        if (newStatus === RequestStatus.Answered) {
          patch.answeredAt = now;
          if (responseText && responseText.trim()) patch.response = responseText.trim();
          if (responseAttachments && responseAttachments.length) patch.responseAttachments = responseAttachments;
        }
        if (newStatus === RequestStatus.Closed) patch.closedAt = now;
        return { ...ticket, ...patch };
      })
    );
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
    let moved = { changed: false } as { changed: boolean };
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      // Allow if admin OR if employee owns this ticket's current department OR it is forwarded to their department
      const canMove = isAdmin || (!!employeeDept && (String(t.department) === employeeDept || (t.forwardedTo || []).includes(employeeDept)));
      if (!canMove) return t;
      if (String(t.department) === String(newDepartment)) return t;
      moved.changed = true;
      return { ...t, department: newDepartment };
    }));
    if (moved.changed) {
      // Notification: ticket moved to another department
      setNotifications(prev => [
        {
          id: `N-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          kind: 'ticket-moved',
          ticketId,
          department: newDepartment,
          message: `تم تحويل الطلب ${ticketId} إلى قسم ${newDepartment}`,
          createdAt: new Date(),
          read: false,
        },
        ...prev,
      ]);
    }
  };

  const updateTicketResponse = (ticketId: string, responseText: string, responseAttachments?: File[]) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      if (!canEditTicket(t)) return t;
      return { ...t, response: responseText, ...(responseAttachments && responseAttachments.length ? { responseAttachments } : {}) };
    }));
  };

  const updateTicketOpinion = (ticketId: string, opinion: string) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      if (!canEditTicket(t)) return t;
      return { ...t, opinion };
    }));
  };

  const updateTicketForwardedTo = (ticketId: string, departments: Department[]) => {
    const unique = Array.from(new Set(departments));
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      if (!canEditTicket(t)) return t;
      return { ...t, forwardedTo: unique };
    }));
    // Notifications for each forwarded department
    setNotifications(prev => [
      ...unique.map(dep => ({
        id: `N-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        kind: 'ticket-forwarded',
        ticketId,
        department: dep,
        message: `تم إحالة الطلب ${ticketId} إلى قسم ${dep}`,
        createdAt: new Date(),
        read: false,
      })),
      ...prev,
    ]);
  };

  const markNotificationsReadForDepartment = (department: Department) => {
    setNotifications(prev => prev.map(n => n.department === department ? { ...n, read: true } : n));
  };

  const addNotification = (n: Omit<DepartmentNotification, 'id' | 'createdAt' | 'read'> & { message?: string }) => {
    setNotifications(prev => [
      { id: `N-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, createdAt: new Date(), read: false, ...n },
      ...prev,
    ]);
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
      case '#/employees':
        return isEmployeeLoggedIn && currentEmployee?.role === 'مدير' ? <EmployeeManagementPage /> : <LoginPage />;
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
      case '#/messages':
        return isEmployeeLoggedIn ? <ContactMessagesPage /> : <LoginPage />;
      case '#/requests':
        return isEmployeeLoggedIn ? <RequestsPage /> : <LoginPage />;
      case '#/contact':
        return <ContactPage />;
      case '#/privacy':
        return <PrivacyPage />;
      case '#/terms':
        return <TermsPage />;
      case '#/departments':
        return <DepartmentsPage />;
      case '#/monitor':
        return isEmployeeLoggedIn && currentEmployee?.role === 'مدير' ? <AdminMonitorPage /> : <LoginPage />;
      case '#/confirmation':
        return <ConfirmationPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <AppContext.Provider value={{ 
      tickets, 
  notifications,
      addTicket, 
      findTicket, 
      contactMessages,
      addContactMessage,
      isEmployeeLoggedIn, 
      currentEmployee,
      employeeLogin,
      logout, 
      updateTicketStatus,
  updateTicketDepartment,
  updateTicketResponse,
  updateTicketOpinion,
  updateTicketForwardedTo,
  markNotificationsReadForDepartment,
  addNotification,
      updateContactMessageStatus,
      lastSubmittedId, 
      theme, 
      toggleTheme 
    }}>
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
            {renderPage()}
          </main>
          <Footer />
        </div>
      </div>
    </AppContext.Provider>
  );
};

export default App;