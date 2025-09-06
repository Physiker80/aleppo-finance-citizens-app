import React, { useState, useEffect, createContext, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import SubmitRequestPage from './pages/SubmitRequestPage';
import TrackRequestPage from './pages/TrackRequestPage';
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
import { Ticket, Employee, ContactMessage, ContactMessageStatus, ContactMessageType } from './types';
import { RequestStatus } from './types';

type Theme = 'light' | 'dark';

interface AppContextType {
  tickets: Ticket[];
  addTicket: (ticket: Omit<Ticket, 'id' | 'status'>) => string;
  findTicket: (id: string) => Ticket | undefined;
  contactMessages: ContactMessage[];
  addContactMessage: (msg: Omit<ContactMessage, 'id' | 'status' | 'submissionDate'>) => string;
  isEmployeeLoggedIn: boolean;
  currentEmployee: Employee | null;
  employeeLogin: (employee: Employee) => void;
  logout: () => void;
  updateTicketStatus: (ticketId: string, newStatus: RequestStatus) => void;
  updateContactMessageStatus: (id: string, newStatus: ContactMessageStatus) => void;
  lastSubmittedId: string | null;
  theme: Theme;
  toggleTheme: () => void;
}

export const AppContext = createContext<AppContextType | null>(null);

const App: React.FC = () => {
  const [route, setRoute] = useState(window.location.hash || '#/');
  const [tickets, setTickets] = useState<Ticket[]>([]);
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
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const uniquePart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newId = `ALF-${datePart}-${uniquePart}`;

    const newTicket: Ticket = {
      id: newId,
      status: RequestStatus.New,
      ...ticketData,
    };
    setTickets(prevTickets => [...prevTickets, newTicket]);
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

  const updateTicketStatus = (ticketId: string, newStatus: RequestStatus) => {
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
      )
    );
  };

  const updateContactMessageStatus = (id: string, newStatus: ContactMessageStatus) => {
    setContactMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
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
      case '#/confirmation':
        return <ConfirmationPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <AppContext.Provider value={{ 
      tickets, 
      addTicket, 
      findTicket, 
      contactMessages,
      addContactMessage,
      isEmployeeLoggedIn, 
      currentEmployee,
      employeeLogin,
      logout, 
      updateTicketStatus,
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