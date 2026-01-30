import { authService } from './authorizationService';
import { auditLogger } from './auditLogger';
import { SystemRoleType, ResourceType, ActionType } from '../types';

/**
 * وظيفة لاختبار نظام RBAC وإنشاء بيانات تجريبية
 */
export async function testRbacSystem() {
  console.log('🚀 بدء اختبار نظام RBAC...');

  try {
    // 1. إنشاء أدوار تجريبية
    console.log('📝 إنشاء أدوار تجريبية...');
    
    const systemAdminRole = await authService.createRole({
      name: 'مدير النظام',
      type: SystemRoleType.SYSTEM_ADMIN,
      description: 'مدير النظام الرئيسي مع جميع الصلاحيات',
      isActive: true
    }, 'SYSTEM_INIT');

    const departmentManagerRole = await authService.createRole({
      name: 'مدير قسم المالية',
      type: SystemRoleType.DEPARTMENT_MANAGER,
      description: 'مدير قسم المالية',
      isActive: true
    }, 'SYSTEM_INIT');

    const processorRole = await authService.createRole({
      name: 'موظف معالجة الطلبات',
      type: SystemRoleType.PROCESSOR,
      description: 'موظف متخصص في معالجة الطلبات والشكاوى',
      isActive: true
    }, 'SYSTEM_INIT');

    // 2. إنشاء صلاحيات مخصصة
    console.log('🔐 إنشاء صلاحيات مخصصة...');
    
    const ticketManagementPermission = await authService.createPermission({
      resource: ResourceType.TICKETS,
      action: ActionType.UPDATE,
      description: 'تحديث حالة الطلبات والشكاوى',
      isSystemPermission: false,
      conditions: [
        {
          field: 'department',
          operator: 'eq',
          value: 'المالية',
          description: 'يقتصر على قسم المالية فقط'
        }
      ]
    });

    const reportGenerationPermission = await authService.createPermission({
      resource: ResourceType.REPORTS,
      action: ActionType.EXPORT,
      description: 'تصدير التقارير المالية',
      isSystemPermission: false,
      departmentScoped: true
    });

    // 3. تعيين الأدوار للمستخدمين
    console.log('👥 تعيين الأدوار للمستخدمين...');
    
    // تعيين دور مدير النظام للمدير العام
    await authService.assignRoleToUser(
      'admin',
      systemAdminRole.id,
      'SYSTEM_INIT'
    );

    // تعيين دور مدير القسم لموظف المالية
    await authService.assignRoleToUser(
      'finance1',
      departmentManagerRole.id,
      'admin'
    );

    // تعيين دور موظف المعالجة لموظف آخر
    await authService.assignRoleToUser(
      'finance1',
      processorRole.id,
      'admin',
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // ينتهي خلال 30 يوم
    );

    // 4. اختبار العمليات والتدقيق
    console.log('🔍 اختبار العمليات وسجل التدقيق...');

    // محاولة وصول مسموحة
    const adminPermCheck = await authService.checkPermission(
      'admin',
      ResourceType.USERS,
      ActionType.CREATE,
      {}
    );
    console.log('✅ صلاحية مدير النظام لإنشاء المستخدمين:', adminPermCheck.granted);

    // محاولة وصول مرفوضة (موظف عادي يحاول حذف مستخدم)
    const employeePermCheck = await authService.checkPermission(
      'finance1',
      ResourceType.USERS,
      ActionType.DELETE,
      {}
    );
    console.log('❌ صلاحية موظف المالية لحذف المستخدمين:', employeePermCheck.granted);

    // 5. إضافة بعض السجلات الأمنية التجريبية
    auditLogger.logSecurityViolation(
      'finance1',
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      'محاولة غير مصرح بها للوصول إلى إعدادات النظام',
      'HIGH'
    );

    auditLogger.logSecurityViolation(
      'guest_user',
      'MULTIPLE_FAILED_LOGINS',
      'عدة محاولات تسجيل دخول فاشلة متتالية',
      'MEDIUM'
    );

    // 6. إنشاء تغييرات في النظام
    auditLogger.logSystemConfigurationChange(
      'max_login_attempts',
      3,
      5,
      'admin',
      'زيادة عدد المحاولات المسموح بها لتسجيل الدخول'
    );

    // 7. عرض الإحصائيات
    console.log('📊 إحصائيات النظام:');
    const stats = auditLogger.getAuditStatistics();
    console.log('- إجمالي السجلات:', stats.totalLogs);
    console.log('- السجلات الحديثة:', stats.recentLogs);
    console.log('- المخالفات الأمنية:', stats.securityViolations);
    console.log('- أكثر المستخدمين نشاطاً:', stats.topUsers.slice(0, 3));

    // 8. عرض أحدث سجلات التدقيق
    console.log('📋 آخر 10 سجلات تدقيق:');
    const recentLogs = auditLogger.getAllLogs(10);
    recentLogs.forEach(log => {
      console.log(`- ${log.timestamp.toLocaleString('ar-SY-u-nu-latn')}: ${log.reason}`);
    });

    console.log('✅ تم اختبار نظام RBAC بنجاح!');
    
    return {
      success: true,
      roles: [systemAdminRole, departmentManagerRole, processorRole],
      permissions: [ticketManagementPermission, reportGenerationPermission],
      stats: stats,
      recentLogs: recentLogs
    };

  } catch (error) {
    console.error('❌ خطأ في اختبار نظام RBAC:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}

/**
 * وظيفة لمسح البيانات التجريبية
 */
export function clearTestData() {
  console.log('🧹 مسح البيانات التجريبية...');
  
  // مسح الأدوار التجريبية
  localStorage.removeItem('roles');
  localStorage.removeItem('permissions');
  localStorage.removeItem('userRoles');
  localStorage.removeItem('rolePermissions');
  
  // مسح سجلات التدقيق
  localStorage.removeItem('rbacAuditLogs');
  
  console.log('✅ تم مسح البيانات التجريبية');
}

/**
 * وظيفة للحصول على تقرير شامل عن حالة النظام
 */
export function getSystemReport() {
  const report = {
    timestamp: new Date().toISOString(),
    auditStatistics: auditLogger.getAuditStatistics(),
    systemStats: authService.getSystemStats(),
    recentSecurityLogs: auditLogger.getSecurityLogs(10),
    recentAuditLogs: auditLogger.getAllLogs(20),
    storageInfo: {
      roles: JSON.parse(localStorage.getItem('roles') || '[]').length,
      permissions: JSON.parse(localStorage.getItem('permissions') || '[]').length,
      userRoles: JSON.parse(localStorage.getItem('userRoles') || '[]').length,
      auditLogs: JSON.parse(localStorage.getItem('rbacAuditLogs') || '[]').length,
    }
  };

  console.log('📊 تقرير حالة نظام RBAC:', report);
  return report;
}

// تصدير الدوال للاستخدام في وحدة التحكم
if (typeof window !== 'undefined') {
  (window as any).testRbac = {
    test: testRbacSystem,
    clear: clearTestData,
    report: getSystemReport,
    auditLogger,
    authService
  };
}