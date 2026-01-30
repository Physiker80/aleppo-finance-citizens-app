/**
 * تكامل نظام التفويض على مستوى البيانات مع النظام الحالي
 * Integration of Data-Level Authorization with existing system
 */

import { 
  DataLevelAuthorizationEngine, 
  DataClassificationLevel, 
  DataOperation, 
  ClassifiedData,
  canRead,
  canUpdate,
  canDelete,
  canExport,
  filterReadableData
} from './dataLevelAuthorization';
import { Ticket, Employee, ContactMessage, RequestStatus, ContactMessageStatus } from '../types';

/**
 * تحويل التذكرة إلى بيانات مصنفة أمنياً
 */
export function ticketToClassifiedData(ticket: Ticket): ClassifiedData {
  return {
    id: ticket.id,
    classificationLevel: determineTicketClassificationLevel(ticket),
    owner: ticket.fullName || 'مجهول',
    department: ticket.department || '',
    assignedTo: ticket.forwardedTo || [],
    isPublic: false, // التذاكر عادة ليست عامة
    isDraft: ticket.status === RequestStatus.New,
    createdAt: new Date(ticket.submissionDate),
    updatedAt: ticket.answeredAt ? new Date(ticket.answeredAt) : new Date(ticket.submissionDate)
  };
}

/**
 * تحديد مستوى التصنيف الأمني للتذكرة
 */
function determineTicketClassificationLevel(ticket: Ticket): DataClassificationLevel {
  // تحديد المستوى حسب نوع التذكرة والمحتوى
  const sensitiveKeywords = ['راتب', 'معاش', 'ضريبة', 'جمرك', 'مالية'];
  const highlyConfidentialKeywords = ['تحقيق', 'فساد', 'مخالفة', 'قانوني'];
  
  const content = `${ticket.requestType} ${ticket.details}`.toLowerCase();
  
  if (highlyConfidentialKeywords.some(keyword => content.includes(keyword))) {
    return DataClassificationLevel.HIGHLY_CONFIDENTIAL;
  }
  
  if (sensitiveKeywords.some(keyword => content.includes(keyword))) {
    return DataClassificationLevel.CONFIDENTIAL;
  }
  
  // معظم التذاكر تعتبر للاستخدام الداخلي
  return DataClassificationLevel.INTERNAL;
}

/**
 * تحويل رسالة التواصل إلى بيانات مصنفة أمنياً
 */
export function contactMessageToClassifiedData(message: ContactMessage): ClassifiedData {
  return {
    id: message.id.toString(),
    classificationLevel: DataClassificationLevel.INTERNAL,
    owner: message.name || 'مجهول',
    department: 'التواصل',
    assignedTo: [],
    isPublic: false,
    isDraft: message.status === ContactMessageStatus.New,
    createdAt: new Date(message.submissionDate),
    updatedAt: new Date(message.submissionDate)
  };
}

/**
 * فحص صلاحية الوصول للتذكرة
 */
export function canAccessTicket(ticket: Ticket, employee: Employee, operation: DataOperation = DataOperation.READ): boolean {
  const classifiedTicket = ticketToClassifiedData(ticket);
  const enhancedEmployee = enhanceEmployeeWithSecurityInfo(employee);
  
  const result = DataLevelAuthorizationEngine.checkAccess('ticket', operation, enhancedEmployee, classifiedTicket);
  return result.allowed;
}

/**
 * فحص صلاحية تحرير التذكرة
 */
export function canEditTicket(ticket: Ticket, employee: Employee): boolean {
  return canAccessTicket(ticket, employee, DataOperation.UPDATE);
}

/**
 * فحص صلاحية حذف التذكرة
 */
export function canDeleteTicket(ticket: Ticket, employee: Employee): boolean {
  return canAccessTicket(ticket, employee, DataOperation.DELETE);
}

/**
 * فحص صلاحية تصدير التذكرة
 */
export function canExportTicket(ticket: Ticket, employee: Employee): boolean {
  return canAccessTicket(ticket, employee, DataOperation.EXPORT);
}

/**
 * تصفية التذاكر حسب صلاحيات الموظف
 */
export function filterAccessibleTickets(tickets: Ticket[], employee: Employee): Ticket[] {
  const enhancedEmployee = enhanceEmployeeWithSecurityInfo(employee);
  
  return tickets.filter(ticket => {
    const classifiedTicket = ticketToClassifiedData(ticket);
    return canRead('ticket', enhancedEmployee, classifiedTicket);
  });
}

/**
 * تحسين معلومات الموظف بالبيانات الأمنية
 */
function enhanceEmployeeWithSecurityInfo(employee: Employee): any {
  return {
    id: employee.username,
    username: employee.username,
    name: employee.name,
    department: employee.department,
    role: employee.role,
    // تحديد مستوى التصنيف الأمني حسب الدور
    securityClearance: determineSecurityClearance(employee),
    // تحديد ما إذا كان مديراً لأقسام معينة
    managerOf: employee.role === 'مدير' ? [employee.department] : [],
    level: employee.role === 'مدير' ? 'manager' : 'employee'
  };
}

/**
 * تحديد مستوى التصنيف الأمني للموظف
 */
function determineSecurityClearance(employee: Employee): DataClassificationLevel {
  switch (employee.role) {
    case 'مدير':
      return DataClassificationLevel.HIGHLY_CONFIDENTIAL;
    case 'مشرف':
      return DataClassificationLevel.CONFIDENTIAL;
    case 'موظف':
      return DataClassificationLevel.INTERNAL;
    default:
      return DataClassificationLevel.INTERNAL;
  }
}

/**
 * إنشاء Hook لاستخدام نظام التفويض في React Components
 */
export function useDataLevelAuthorization() {
  const checkTicketAccess = (ticket: Ticket, employee: Employee, operation: DataOperation = DataOperation.READ) => {
    return canAccessTicket(ticket, employee, operation);
  };

  const filterTicketsByAccess = (tickets: Ticket[], employee: Employee) => {
    return filterAccessibleTickets(tickets, employee);
  };

  const getAccessReason = (ticket: Ticket, employee: Employee, operation: DataOperation = DataOperation.READ) => {
    const classifiedTicket = ticketToClassifiedData(ticket);
    const enhancedEmployee = enhanceEmployeeWithSecurityInfo(employee);
    
    const result = DataLevelAuthorizationEngine.checkAccess('ticket', operation, enhancedEmployee, classifiedTicket);
    return result.reason;
  };

  return {
    checkTicketAccess,
    filterTicketsByAccess,
    getAccessReason,
    canEditTicket,
    canDeleteTicket,
    canExportTicket
  };
}

/**
 * تطبيق التفويض على مستوى البيانات للتذاكر الموجودة
 */
export function applyDataLevelAuthorizationToTickets(tickets: Ticket[], employee: Employee) {
  return tickets.map(ticket => ({
    ...ticket,
    // إضافة معلومات الصلاحيات للتذكرة
    permissions: {
      canRead: canAccessTicket(ticket, employee, DataOperation.READ),
      canEdit: canAccessTicket(ticket, employee, DataOperation.UPDATE),
      canDelete: canAccessTicket(ticket, employee, DataOperation.DELETE),
      canExport: canAccessTicket(ticket, employee, DataOperation.EXPORT)
    },
    // إضافة مستوى التصنيف الأمني
    classificationLevel: determineTicketClassificationLevel(ticket)
  }));
}

/**
 * دالة لتسجيل محاولات الوصول للبيانات
 */
export function logDataAccess(
  resourceType: string,
  resourceId: string,
  employee: Employee,
  operation: DataOperation,
  success: boolean,
  reason: string
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    employee: {
      username: employee.username,
      name: employee.name,
      department: employee.department,
      role: employee.role
    },
    resource: {
      type: resourceType,
      id: resourceId
    },
    operation,
    success,
    reason,
    userAgent: navigator.userAgent,
    ipAddress: 'N/A' // في التطبيق الحقيقي يتم الحصول عليه من الخادم
  };

  // حفظ السجل محلياً
  const accessLogs = JSON.parse(localStorage.getItem('dataAccessLogs') || '[]');
  accessLogs.push(logEntry);
  
  // الحفاظ على آخر 1000 سجل فقط
  if (accessLogs.length > 1000) {
    accessLogs.splice(0, accessLogs.length - 1000);
  }
  
  localStorage.setItem('dataAccessLogs', JSON.stringify(accessLogs));

  // في التطبيق الحقيقي، يجب إرسال السجل للخادم أيضاً
  console.log('Data Access Log:', logEntry);
}

/**
 * استرجاع سجلات الوصول للبيانات
 */
export function getDataAccessLogs(filters?: {
  employee?: string;
  resourceType?: string;
  operation?: DataOperation;
  from?: Date;
  to?: Date;
}) {
  const logs = JSON.parse(localStorage.getItem('dataAccessLogs') || '[]');
  
  if (!filters) return logs;
  
  return logs.filter((log: any) => {
    if (filters.employee && log.employee.username !== filters.employee) return false;
    if (filters.resourceType && log.resource.type !== filters.resourceType) return false;
    if (filters.operation && log.operation !== filters.operation) return false;
    if (filters.from && new Date(log.timestamp) < filters.from) return false;
    if (filters.to && new Date(log.timestamp) > filters.to) return false;
    return true;
  });
}

export default {
  canAccessTicket,
  canEditTicket,
  canDeleteTicket,
  canExportTicket,
  filterAccessibleTickets,
  applyDataLevelAuthorizationToTickets,
  useDataLevelAuthorization,
  logDataAccess,
  getDataAccessLogs
};