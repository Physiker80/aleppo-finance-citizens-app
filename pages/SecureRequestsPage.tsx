/**
 * صفحة الطلبات الآمنة مع تطبيق نظام التفويض على مستوى البيانات
 * Secure Requests Page with Data-Level Authorization applied
 */

import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { useDataLevelAuthorization } from '../utils/dataAuthIntegration';
import { DataOperation } from '../utils/dataLevelAuthorization';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SecurityInfoButton from '../components/SecurityInfoButton';
import { RequestStatus, Ticket } from '../types';
import { FiEye, FiEdit, FiTrash2, FiDownload, FiShield, FiLock, FiUnlock } from 'react-icons/fi';

const SecureRequestsPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const dataAuth = useDataLevelAuthorization();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showClassificationDetails, setShowClassificationDetails] = useState(false);

  if (!appContext?.isEmployeeLoggedIn || !appContext.currentEmployee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="p-8 text-center">
          <FiLock className="text-6xl text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            الوصول مرفوض
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            يجب تسجيل الدخول كموظف للوصول لهذه الصفحة
          </p>
        </Card>
      </div>
    );
  }

  const { tickets = [], currentEmployee } = appContext;

  // تصفية التذاكر حسب صلاحيات الموظف
  const accessibleTickets = dataAuth.filterTicketsByAccess(tickets, currentEmployee);

  // إحصائيات الوصول
  const accessStats = {
    total: tickets.length,
    accessible: accessibleTickets.length,
    restricted: tickets.length - accessibleTickets.length
  };

  const handleViewTicket = (ticket: Ticket) => {
    if (dataAuth.checkTicketAccess(ticket, currentEmployee, DataOperation.READ)) {
      setSelectedTicket(ticket);
    } else {
      alert('ليس لديك صلاحية لعرض هذه التذكرة');
    }
  };

  const handleEditTicket = (ticket: Ticket) => {
    if (dataAuth.canEditTicket(ticket, currentEmployee)) {
      // فتح صفحة التحرير
      window.location.hash = `#/edit-ticket/${ticket.id}`;
    } else {
      alert('ليس لديك صلاحية لتحرير هذه التذكرة');
    }
  };

  const handleDeleteTicket = (ticket: Ticket) => {
    if (dataAuth.canDeleteTicket(ticket, currentEmployee)) {
      if (confirm('هل أنت متأكد من حذف هذه التذكرة؟')) {
        // حذف التذكرة - استخدام طريقة بديلة
        alert('تم طلب حذف التذكرة - يرجى تنفيذ العملية من خلال واجهة الإدارة');
      }
    } else {
      alert('ليس لديك صلاحية لحذف هذه التذكرة');
    }
  };

  const handleExportTicket = (ticket: Ticket) => {
    if (dataAuth.canExportTicket(ticket, currentEmployee)) {
      // تصدير التذكرة
      const dataStr = JSON.stringify(ticket, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `ticket_${ticket.id}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } else {
      alert('ليس لديك صلاحية لتصدير هذه التذكرة');
    }
  };

  const getClassificationBadge = (ticket: Ticket) => {
    // تحديد التصنيف الأمني للتذكرة
    const content = `${ticket.requestType} ${ticket.details}`.toLowerCase();
    let level = 'داخلي';
    let colorClass = 'bg-blue-100 text-blue-800';

    if (content.includes('تحقيق') || content.includes('فساد')) {
      level = 'سري للغاية';
      colorClass = 'bg-red-100 text-red-800';
    } else if (content.includes('راتب') || content.includes('معاش')) {
      level = 'سري';
      colorClass = 'bg-orange-100 text-orange-800';
    } else if (content.includes('استعلام') || content.includes('معلومات')) {
      level = 'عام';
      colorClass = 'bg-green-100 text-green-800';
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        <FiShield className="inline ml-1" size={12} />
        {level}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Statistics */}
        <Card className="mb-6 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                صفحة الطلبات الآمنة
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                إدارة الطلبات مع تطبيق نظام التفويض على مستوى البيانات
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SecurityInfoButton context="secure-requests" />
              <Button
                onClick={() => setShowClassificationDetails(!showClassificationDetails)}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <FiShield />
                تفاصيل التصنيف
              </Button>
              {/* Back button removed per policy; floating BackToDashboardFab handles navigation */}
            </div>
          </div>

          {/* Access Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                    إجمالي التذاكر
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {accessStats.total}
                  </p>
                </div>
                <FiEye className="text-blue-500" size={24} />
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 dark:text-green-400 text-sm font-medium">
                    مسموح بالوصول
                  </p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {accessStats.accessible}
                  </p>
                </div>
                <FiUnlock className="text-green-500" size={24} />
              </div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                    مقيد الوصول
                  </p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                    {accessStats.restricted}
                  </p>
                </div>
                <FiLock className="text-red-500" size={24} />
              </div>
            </div>
          </div>

          {/* Classification Details */}
          {showClassificationDetails && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-bold text-gray-800 dark:text-white mb-3">
                مستويات التصنيف الأمني:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <FiShield className="inline ml-1" size={12} />
                    عام
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">معلومات عامة</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <FiShield className="inline ml-1" size={12} />
                    داخلي
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">للاستخدام الداخلي</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    <FiShield className="inline ml-1" size={12} />
                    سري
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">بيانات مالية</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <FiShield className="inline ml-1" size={12} />
                    سري للغاية
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">تحقيقات قانونية</span>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Tickets List */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            التذاكر المتاحة ({accessStats.accessible})
          </h2>

          {accessibleTickets.length === 0 ? (
            <div className="text-center py-8">
              <FiLock className="text-6xl text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                لا توجد تذاكر متاحة للعرض حسب صلاحياتك
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {accessibleTickets.map((ticket) => {
                const canRead = dataAuth.checkTicketAccess(ticket, currentEmployee, DataOperation.READ);
                const canEdit = dataAuth.canEditTicket(ticket, currentEmployee);
                const canDelete = dataAuth.canDeleteTicket(ticket, currentEmployee);
                const canExport = dataAuth.canExportTicket(ticket, currentEmployee);

                return (
                  <div key={ticket.id} className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-800 dark:text-white">
                            {ticket.fullName}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ticket.status === RequestStatus.New ? 'bg-blue-100 text-blue-800' :
                            ticket.status === RequestStatus.InProgress ? 'bg-yellow-100 text-yellow-800' :
                            ticket.status === RequestStatus.Answered ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ticket.status}
                          </span>
                          {getClassificationBadge(ticket)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          الرقم: {ticket.id} | القسم: {ticket.department}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          النوع: {ticket.requestType} | التاريخ: {new Date(ticket.submissionDate).toLocaleDateString('ar')}
                        </p>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {canRead && (
                          <Button
                            variant="secondary"
                            onClick={() => handleViewTicket(ticket)}
                            title="عرض التفاصيل"
                            className="p-2"
                          >
                            <FiEye size={16} />
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            variant="secondary"
                            onClick={() => handleEditTicket(ticket)}
                            title="تحرير"
                            className="p-2"
                          >
                            <FiEdit size={16} />
                          </Button>
                        )}
                        {canExport && (
                          <Button
                            variant="secondary"
                            onClick={() => handleExportTicket(ticket)}
                            title="تصدير"
                            className="p-2"
                          >
                            <FiDownload size={16} />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="secondary"
                            onClick={() => handleDeleteTicket(ticket)}
                            title="حذف"
                            className="p-2 text-red-600 hover:text-red-700"
                          >
                            <FiTrash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Permissions Display */}
                    <div className="flex gap-2 text-xs">
                      <span className={`px-2 py-1 rounded ${canRead ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {canRead ? '✓ قراءة' : '✗ قراءة'}
                      </span>
                      <span className={`px-2 py-1 rounded ${canEdit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {canEdit ? '✓ تحرير' : '✗ تحرير'}
                      </span>
                      <span className={`px-2 py-1 rounded ${canExport ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {canExport ? '✓ تصدير' : '✗ تصدير'}
                      </span>
                      <span className={`px-2 py-1 rounded ${canDelete ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {canDelete ? '✓ حذف' : '✗ حذف'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Ticket Details Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                    تفاصيل التذكرة - {selectedTicket.id}
                  </h2>
                  <Button
                    onClick={() => setSelectedTicket(null)}
                    variant="secondary"
                  >
                    ✕
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        اسم المواطن
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedTicket.fullName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        رقم الهاتف
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedTicket.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        البريد الإلكتروني
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedTicket.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        نوع الطلب
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedTicket.requestType}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      تفاصيل الطلب
                    </label>
                    <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-3 rounded">
                      {selectedTicket.details}
                    </p>
                  </div>

                  {selectedTicket.response && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        الرد
                      </label>
                      <p className="text-gray-900 dark:text-white bg-green-50 dark:bg-green-900/20 p-3 rounded">
                        {selectedTicket.response}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        الحالة
                      </label>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedTicket.status === RequestStatus.New ? 'bg-blue-100 text-blue-800' :
                        selectedTicket.status === RequestStatus.InProgress ? 'bg-yellow-100 text-yellow-800' :
                        selectedTicket.status === RequestStatus.Answered ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedTicket.status}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        التصنيف الأمني
                      </label>
                      {getClassificationBadge(selectedTicket)}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecureRequestsPage;