import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../App';
import { 
  Role, 
  Permission, 
  SystemRoleType, 
  ResourceType, 
  ActionType, 
  RbacEmployee, 
  UserRole,
  RolePermission,
  RbacAuditLog,
  RbacSystemStats,
  AccessAttempt
} from '../types';
import { authService } from '../utils/authorizationService';
import { auditLogger } from '../utils/auditLogger';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
// Security guide is integrated as a floating modal in the header
import { 
  FiUsers, 
  FiShield, 
  FiKey, 
  FiActivity,
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiEye,
  FiSave,
  FiX,
  FiCheck,
  FiAlertTriangle,
  FiBarChart,
  FiClock,
  FiLock,
  FiUnlock,
  // FiArrowRight removed; using floating BackToDashboardFab
} from 'react-icons/fi';
import { FiInfo } from 'react-icons/fi';
import Mermaid from '../components/Mermaid';

interface RoleFormData {
  name: string;
  type: SystemRoleType;
  description: string;
  departmentRestrictions: string[];
}

interface PermissionFormData {
  resource: ResourceType;
  action: ActionType;
  description: string;
  requiresOwnership: boolean;
  departmentScoped: boolean;
}

const RoleManagementPage: React.FC = () => {
  const context = useContext(AppContext);
  const [showGuide, setShowGuide] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowGuide(false); };
    if (showGuide) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showGuide]);
  
  if (!context?.isEmployeeLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <FiLock className="mx-auto mb-4 text-4xl text-gray-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            مطلوب تسجيل الدخول
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            يجب تسجيل الدخول للوصول إلى إدارة الصلاحيات
          </p>
        </Card>
      </div>
    );
  }

  const [currentTab, setCurrentTab] = useState<'overview' | 'roles' | 'permissions' | 'audit'>('overview');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [employees, setEmployees] = useState<RbacEmployee[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [systemStats, setSystemStats] = useState<RbacSystemStats | null>(null);
  const [accessAttempts, setAccessAttempts] = useState<AccessAttempt[]>([]);
  const [auditLogs, setAuditLogs] = useState<RbacAuditLog[]>([]);
  
  // Form states
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  
  const [roleFormData, setRoleFormData] = useState<RoleFormData>({
    name: '',
    type: SystemRoleType.EMPLOYEE,
    description: '',
    departmentRestrictions: []
  });

  const [permissionFormData, setPermissionFormData] = useState<PermissionFormData>({
    resource: ResourceType.TICKETS,
    action: ActionType.READ,
    description: '',
    requiresOwnership: false,
    departmentScoped: false
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is logged in
      if (!context.isEmployeeLoggedIn || !context.currentEmployee) {
        setError('يجب تسجيل الدخول أولاً للوصول إلى هذه الصفحة');
        setLoading(false);
        return;
      }

      // Check permissions - allow admin user and system admins
      const isAdminUser = context.currentEmployee.username === 'admin';
      const canManage = await context.canManageRoles();
      
      // Temporarily allow all logged in users for debugging
      console.log('🔍 Debug info:', {
        isAdminUser,
        canManage,
        currentEmployee: context.currentEmployee,
        isEmployeeLoggedIn: context.isEmployeeLoggedIn
      });
      
      if (!isAdminUser && !canManage) {
        console.log('⚠️ Access denied - user does not have permissions');
        setError('ليس لديك صلاحية لإدارة الصلاحيات');
        setLoading(false);
        return;
      }

      // Load roles from localStorage (fallback)
      const storedRoles = JSON.parse(localStorage.getItem('roles') || '[]') as Role[];
      setRoles(storedRoles);

      // Load permissions from localStorage (fallback)
      const storedPermissions = JSON.parse(localStorage.getItem('permissions') || '[]') as Permission[];
      setPermissions(storedPermissions);

      // Load employees
      const storedEmployees = JSON.parse(localStorage.getItem('employees') || '[]');
      setEmployees(storedEmployees.map((emp: any) => ({
        ...emp,
        id: emp.username,
        roles: [],
        isActive: emp.isActive !== false
      })));

      // Load user roles
      const storedUserRoles = JSON.parse(localStorage.getItem('userRoles') || '[]') as UserRole[];
      setUserRoles(storedUserRoles);

      // Get system stats
      const stats = authService.getSystemStats();
      setSystemStats(stats);

      // Get recent access attempts
      const attempts = authService.getAccessAttempts(undefined, 50);
      setAccessAttempts(attempts);

      // Load audit logs
      const logs = auditLogger.getAllLogs(100);
      setAuditLogs(logs);

    } catch (err) {
      setError('حدث خطأ في تحميل البيانات');
      console.error('Error loading RBAC data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    try {
      const newRole = await authService.createRole({
        name: roleFormData.name,
        type: roleFormData.type,
        description: roleFormData.description,
        isActive: true,
        departmentRestrictions: roleFormData.departmentRestrictions
      });

      setRoles(prev => [...prev, newRole]);
      setShowRoleForm(false);
      setRoleFormData({
        name: '',
        type: SystemRoleType.EMPLOYEE,
        description: '',
        departmentRestrictions: []
      });

      context.addToast?.({ message: 'تم إنشاء الدور بنجاح', type: 'success' });
    } catch (err) {
      context.addToast?.({ message: 'حدث خطأ في إنشاء الدور', type: 'error' });
    }
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      await authService.assignRoleToUser(userId, roleId, context.currentEmployee?.username || '');
      
      // Update local state
      const newAssignment: UserRole = {
        userId,
        roleId,
        assignedBy: context.currentEmployee?.username || '',
        assignedAt: new Date(),
        isActive: true
      };
      
      setUserRoles(prev => [...prev, newAssignment]);
      context.addToast?.({ message: 'تم تعيين الدور بنجاح', type: 'success' });
    } catch (err) {
      context.addToast?.({ message: 'حدث خطأ في تعيين الدور', type: 'error' });
    }
  };

  const tabs = [
    { id: 'overview', label: 'نظرة عامة', icon: FiBarChart },
    { id: 'roles', label: 'الأدوار', icon: FiUsers },
    { id: 'permissions', label: 'الصلاحيات', icon: FiShield },
    { id: 'audit', label: 'سجل التدقيق', icon: FiActivity }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل بيانات الأدوار والصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center">
          <FiAlertTriangle className="mx-auto mb-4 text-4xl text-red-500" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            خطأ في التحميل
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={loadData}>إعادة المحاولة</Button>
        </Card>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
              <FiUsers className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي المستخدمين</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {systemStats?.totalUsers || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
              <FiShield className="text-2xl text-green-600 dark:text-green-400" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي الأدوار</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {systemStats?.totalRoles || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/20">
              <FiKey className="text-2xl text-purple-600 dark:text-purple-400" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">إجمالي الصلاحيات</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {systemStats?.totalPermissions || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/20">
              <FiActivity className="text-2xl text-orange-600 dark:text-orange-400" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">محاولات الوصول اليوم</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {systemStats?.recentAccessAttempts || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Access Attempts */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <FiClock className="ml-2" />
            محاولات الوصول الأخيرة
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">المستخدم</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">المورد</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">العملية</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">الحالة</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {accessAttempts.slice(0, 10).map((attempt) => (
                <tr key={attempt.id} className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-3 px-6 text-gray-900 dark:text-gray-100">{attempt.username}</td>
                  <td className="py-3 px-6 text-gray-600 dark:text-gray-400">{attempt.resource}</td>
                  <td className="py-3 px-6 text-gray-600 dark:text-gray-400">{attempt.action}</td>
                  <td className="py-3 px-6">
                    {attempt.granted ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <FiCheck className="ml-1" />
                        مسموح
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        <FiX className="ml-1" />
                        مرفوض
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-gray-600 dark:text-gray-400">
                    {new Date(attempt.timestamp).toLocaleString('ar-SY-u-nu-latn')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderRoles = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">إدارة الصلاحيات</h2>
        <Button onClick={() => setShowRoleForm(true)} className="flex items-center">
          <FiPlus className="ml-2" />
          إضافة دور جديد
        </Button>
      </div>

      {/* Roles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {role.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{role.type}</p>
              </div>
              <div className="flex space-x-2 rtl:space-x-reverse">
                <button
                  onClick={() => setEditingRole(role)}
                  className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg"
                >
                  <FiEdit3 className="text-sm" />
                </button>
                <button className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg">
                  <FiTrash2 className="text-sm" />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{role.description}</p>
            <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
              <span>الصلاحيات: {role.permissions?.length || 0}</span>
              <span className={role.isActive ? 'text-green-600' : 'text-red-600'}>
                {role.isActive ? 'نشط' : 'غير نشط'}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Role Form Modal */}
      {showRoleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              إضافة دور جديد
            </h3>
            <div className="space-y-4">
              <Input
                    id="role-name"
                label="اسم الدور"
                value={roleFormData.name}
                onChange={(e) => setRoleFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="أدخل اسم الدور"
              />
              <Select
                    id="role-type"
                label="نوع الدور"
                value={roleFormData.type}
                onChange={(e) => setRoleFormData(prev => ({ ...prev, type: e.target.value as SystemRoleType }))}
              >
                {Object.values(SystemRoleType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
              <Input
                    id="role-description"
                label="الوصف"
                value={roleFormData.description}
                onChange={(e) => setRoleFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="وصف الدور"
              />
            </div>
            <div className="flex justify-end space-x-4 rtl:space-x-reverse mt-6">
              <Button variant="secondary" onClick={() => setShowRoleForm(false)}>
                إلغاء
              </Button>
              <Button onClick={handleCreateRole}>
                <FiSave className="ml-2" />
                حفظ
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );

  const renderPermissions = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">إدارة الصلاحيات</h2>
        <Button onClick={() => setShowPermissionForm(true)} className="flex items-center">
          <FiPlus className="ml-2" />
          إضافة صلاحية جديدة
        </Button>
      </div>

      {/* Permissions List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">المورد</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">العملية</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">الوصف</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">نوع النظام</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((permission) => (
                <tr key={permission.id} className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-3 px-6 text-gray-900 dark:text-gray-100">{permission.resource}</td>
                  <td className="py-3 px-6 text-gray-600 dark:text-gray-400">{permission.action}</td>
                  <td className="py-3 px-6 text-gray-600 dark:text-gray-400">{permission.description}</td>
                  <td className="py-3 px-6">
                    {permission.isSystemPermission ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        نظام
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                        مخصص
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex space-x-2 rtl:space-x-reverse">
                      <button
                        onClick={() => setEditingPermission(permission)}
                        className="text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 p-1 rounded"
                      >
                        <FiEye className="text-sm" />
                      </button>
                      {!permission.isSystemPermission && (
                        <button className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 p-1 rounded">
                          <FiTrash2 className="text-sm" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderAudit = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">سجل التدقيق</h2>
      
      {/* Audit Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {(() => {
          const stats = auditLogger.getAuditStatistics();
          return (
            <>
              <Card>
                <div className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.totalLogs}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    إجمالي السجلات
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.recentLogs}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    سجلات آخر 24 ساعة
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.securityViolations}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    المخالفات الأمنية
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {stats.topUsers.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    المستخدمون النشطون
                  </div>
                </div>
              </Card>
            </>
          );
        })()}
      </div>

      {/* RBAC Audit Logs */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            سجل عمليات إدارة الصلاحيات
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            تسجيل جميع العمليات المتعلقة بإنشاء وتعديل وتعيين الأدوار والصلاحيات
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">الوقت</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">المستخدم</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">نوع العنصر</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">العملية</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">السبب</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-3 px-6 text-gray-600 dark:text-gray-400">
                    {new Date(log.timestamp).toLocaleString('ar-SY-u-nu-latn')}
                  </td>
                  <td className="py-3 px-6 text-gray-900 dark:text-gray-100">
                    {log.performedBy}
                  </td>
                  <td className="py-3 px-6">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      log.entityType === 'role' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                      log.entityType === 'permission' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      log.entityType === 'user_role' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                      {log.entityType === 'role' ? 'دور' :
                       log.entityType === 'permission' ? 'صلاحية' :
                       log.entityType === 'user_role' ? 'تعيين دور' :
                       log.entityType === 'role_permission' ? 'صلاحية دور' :
                       log.entityType}
                    </span>
                  </td>
                  <td className="py-3 px-6">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      log.action === 'create' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      log.action === 'update' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      log.action === 'delete' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                      log.action === 'assign' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                      log.action === 'revoke' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                      {log.action === 'create' ? 'إنشاء' :
                       log.action === 'update' ? 'تحديث' :
                       log.action === 'delete' ? 'حذف' :
                       log.action === 'assign' ? 'تعيين' :
                       log.action === 'revoke' ? 'إلغاء' :
                       log.action}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-gray-600 dark:text-gray-400">
                    {log.reason || '-'}
                  </td>
                  <td className="py-3 px-6">
                    <Button
                      variant="secondary"
                      className="py-1 px-3 text-sm"
                      onClick={() => {
                        // Show details modal or expand
                        alert(JSON.stringify({
                          oldValues: log.oldValues,
                          newValues: log.newValues,
                          entityId: log.entityId,
                          ipAddress: log.ipAddress,
                          userAgent: log.userAgent?.substring(0, 50) + '...'
                        }, null, 2));
                      }}
                    >
                      <FiEye className="w-3 h-3 ml-1" />
                      عرض
                    </Button>
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    لا توجد سجلات تدقيق متاحة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Access Attempts - Secondary table */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            سجل محاولات الوصول
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            تسجيل محاولات الوصول للموارد والعمليات المحمية
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">الوقت</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">المستخدم</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">المورد</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">العملية</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">الحالة</th>
                <th className="text-right py-3 px-6 text-gray-600 dark:text-gray-300">السبب</th>
              </tr>
            </thead>
            <tbody>
              {accessAttempts.map((attempt) => (
                <tr key={attempt.id} className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-3 px-6 text-gray-600 dark:text-gray-400">
                    {new Date(attempt.timestamp).toLocaleString('ar-SY-u-nu-latn')}
                  </td>
                  <td className="py-3 px-6 text-gray-900 dark:text-gray-100">{attempt.username}</td>
                  <td className="py-3 px-6 text-gray-600 dark:text-gray-400">{attempt.resource}</td>
                  <td className="py-3 px-6 text-gray-600 dark:text-gray-400">{attempt.action}</td>
                  <td className="py-3 px-6">
                    {attempt.granted ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        مسموح
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        مرفوض
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-gray-600 dark:text-gray-400">
                    {attempt.reason || '-'}
                  </td>
                </tr>
              ))}
              {accessAttempts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    لا توجد محاولات وصول مسجلة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  // التحقق من تسجيل الدخول
  if (!context.isEmployeeLoggedIn || !context.currentEmployee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <div className="p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
              يجب تسجيل الدخول
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              يجب تسجيل الدخول كموظف مخول للوصول إلى صفحة إدارة الصلاحيات
            </p>
            <div className="mt-6">
              <Button
                onClick={() => window.location.hash = '#/login'}
                variant="primary"
              >
                تسجيل الدخول
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // حالة الخطأ
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <div className="p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
              خطأ في التحميل
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {error}
            </p>
            <div className="mt-6 space-x-3 space-x-reverse">
              <Button
                onClick={() => {
                  setError(null);
                  loadData();
                }}
                variant="primary"
              >
                إعادة المحاولة
              </Button>
              <Button
                onClick={() => window.location.hash = '#/dashboard'}
                variant="secondary"
              >
                العودة للوحة التحكم
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // حالة التحميل
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <div className="p-8 text-center">
            <div className="mx-auto mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              جاري تحميل البيانات...
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              يتم تحميل بيانات الأدوار والصلاحيات
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            aria-controls="rbac-guide-dialog"
            aria-haspopup="dialog"
            className="text-right hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
            title="عرض دليل القسم الأمني"
          >
            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              إدارة الصلاحيات
            </span>
          </button>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            إدارة شاملة لأدوار وصلاحيات المستخدمين في النظام
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          aria-controls="rbac-guide-dialog"
          aria-haspopup="dialog"
          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-50 dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="عرض دليل القسم الأمني"
          title="عرض دليل القسم الأمني"
        >
          <FiInfo className="text-[18px]" />
        </button>
        {/* Back button removed per policy; floating BackToDashboardFab handles navigation */}
      </div>

      {showGuide && (
        <div
          id="rbac-guide-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rbac-guide-title"
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowGuide(false)}
            aria-hidden="true"
            title="انقر للإغلاق"
          />
          <div className="relative z-10 max-h:[90vh] w-[min(100%,900px)] overflow-auto rounded-xl bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-emerald-200 dark:ring-gray-700 p-5 rtl:text-right">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="rbac-guide-title" className="text-xl font-bold text-emerald-800 dark:text-emerald-300">دليل الأمان: إدارة الصلاحيات (RBAC)</h2>
                <p className="mt-2 text-gray-700 dark:text-gray-300 leading-7 max-w-[68ch]">
                  يساعد نظام إدارة الأدوار والصلاحيات (RBAC) على تطبيق مبدأ أقل الصلاحيات، من خلال تعريف أدوار محددة ومنح الصلاحيات حسب الحاجة فقط، مع تتبع العمليات وتدقيقها.
                </p>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="shrink-0 rounded-full border border-gray-300 dark:border-gray-700 p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="إغلاق"
                title="إغلاق"
              >
                ✖
              </button>
            </div>
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">المخطط التوضيحي (تفاعلي)</h3>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 overflow-x-auto">
                <Mermaid chart={`flowchart TD\n  U[مستخدم] --> R{دور}\n  R -->|صلاحيات| P[المورد/الإجراء]\n  U -. محاولة وصول .-> P\n  P -->|تدقيق| L[سجل التدقيق]\n  P -->|قرار| D{مسموح؟}\n  D -- نعم --> G[منح الوصول]\n  D -- لا --> X[رفض + تسجيل]`}/>
              </div>
            </div>
            <div className="mt-6 h-px bg-gray-200 dark:bg-gray-700" />
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">الخطوات العملية</h3>
              <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                <ol className="list-decimal pr-6 rtl:pr-0 rtl:pl-6 text-gray-800 dark:text-gray-300 space-y-2 leading-7 text-[0.95rem] max-w-[68ch]">
                  <li>تعريف الأدوار وفق الوظائف والمهام وليس الأشخاص.</li>
                  <li>تحديد صلاحيات دقيقة لكل دور وتفعيل مبدأ أقل الصلاحيات.</li>
                  <li>تدقيق دوري للسجلات ومراجعة التعيينات غير الضرورية.</li>
                  <li>استخدام آليات الموافقة والتوثيق للتغييرات الحساسة.</li>
                </ol>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Card>
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`flex items-center px-6 py-4 text-sm font-medium transition-colors ${
                  currentTab === tab.id
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Icon className="ml-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="p-6">
          {currentTab === 'overview' && renderOverview()}
          {currentTab === 'roles' && renderRoles()}
          {currentTab === 'permissions' && renderPermissions()}
          {currentTab === 'audit' && renderAudit()}
        </div>
      </Card>
    </div>
  );
};

export default RoleManagementPage;