import React, { useContext } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { RequestStatus, Ticket } from '../types';

const statusColors: { [key in RequestStatus]: string } = {
  [RequestStatus.New]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  [RequestStatus.InProgress]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  [RequestStatus.Answered]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  [RequestStatus.Closed]: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300',
};

const StatusBadge: React.FC<{ status: RequestStatus }> = ({ status }) => (
  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[status]}`}>
    {status}
  </span>
);

const DashboardPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const tickets = appContext?.tickets || [];
  const updateTicketStatus = appContext?.updateTicketStatus;
  const currentEmployee = appContext?.currentEmployee;

  const handleStatusChange = (ticket: Ticket, newStatus: string) => {
    if (updateTicketStatus) {
      updateTicketStatus(ticket.id, newStatus as RequestStatus);

      if (ticket.email) {
        const sendEmail = window.confirm(`تم تغيير حالة الطلب إلى "${newStatus}".\nهل تريد إرسال بريد إلكتروني لإعلام ${ticket.fullName}؟`);
        
        if (sendEmail) {
            const subject = `تحديث بخصوص طلبك رقم ${ticket.id}`;
            const trackUrl = new URL('#/track', window.location.href).href;
            const body = `مرحباً ${ticket.fullName}،

تم تحديث حالة طلبك.

الحالة الجديدة: ${newStatus}

يمكنك متابعة طلبك عبر الرابط التالي:
${trackUrl}

رقم التتبع الخاص بك هو: ${ticket.id}

مع تحيات،
مديرية مالية حلب`;

            const mailtoLink = `mailto:${ticket.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.trim())}`;
            
            window.open(mailtoLink, '_blank');
        }
      }
    }
  };

  const escapeCSV = (str: string): string => {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportCSV = () => {
    if (tickets.length === 0) return;
    
    const headers = [
      'ID',
      'Submission Date',
      'Full Name',
      'Email',
      'Phone',
      'National ID',
      'Request Type',
      'Department',
      'Details',
      'Status'
    ];
    
    const csvRows = [
      headers.join(','),
      ...tickets.map(ticket => [
        escapeCSV(ticket.id),
        escapeCSV(ticket.submissionDate.toISOString()),
        escapeCSV(ticket.fullName),
        escapeCSV(ticket.email || ''),
        escapeCSV(ticket.phone),
        escapeCSV(ticket.nationalId),
        escapeCSV(ticket.requestType),
        escapeCSV(ticket.department),
        escapeCSV(ticket.details),
        escapeCSV(ticket.status)
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tickets_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  return (
    <Card>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">لوحة تحكم الموظفين</h2>
          {currentEmployee && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              مرحباً {currentEmployee.name} - {currentEmployee.department} ({currentEmployee.role})
            </div>
          )}
        </div>
        <div className="flex space-x-2 rtl:space-x-reverse">
          {currentEmployee?.role === 'مدير' && (
            <Button 
              onClick={() => window.location.hash = '#/employees'} 
              variant="secondary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 rtl:ml-0 rtl:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              إدارة الموظفين
            </Button>
          )}
          {tickets.length > 0 && (
            <Button onClick={handleExportCSV} variant="secondary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 rtl:ml-0 rtl:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            تصدير إلى CSV
          </Button>
          )}
        </div>
      </div>      {tickets.length === 0 ? (
        <div className="text-center py-16">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">لا توجد طلبات</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">لم يتم تقديم أي طلبات من قبل المستخدمين حتى الآن.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">رقم التتبع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">تاريخ التقديم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">مقدم الطلب</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">القسم</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">تغيير الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">{ticket.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{ticket.submissionDate.toLocaleDateString('ar-SY')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="text-gray-900 dark:text-gray-100 font-medium">{ticket.fullName}</div>
                    {ticket.email && <div className="text-gray-500 dark:text-gray-400">{ticket.email}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{ticket.department}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={ticket.status} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket, e.target.value)}
                      className="w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                      aria-label={`Change status for ticket ${ticket.id}`}
                    >
                      {Object.values(RequestStatus).map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default DashboardPage;