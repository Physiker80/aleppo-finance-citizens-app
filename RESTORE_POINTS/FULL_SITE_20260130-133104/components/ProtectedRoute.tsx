import React, { useContext, useEffect, useState, ReactNode } from 'react';
import { AppContext } from '../App';
import { ResourceType, ActionType } from '../types';
import Card from './ui/Card';
import { FiLock, FiShield, FiAlertTriangle } from 'react-icons/fi';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredResource?: ResourceType;
  requiredAction?: ActionType;
  context?: any;
  fallback?: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  customCheck?: () => Promise<boolean>;
  loadingText?: string;
  deniedTitle?: string;
  deniedMessage?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredResource,
  requiredAction,
  context,
  fallback,
  requireAuth = false,
  requireAdmin = false,
  customCheck,
  loadingText = 'جاري التحقق من الصلاحيات...',
  deniedTitle = 'ليس لديك صلاحية',
  deniedMessage = 'ليس لديك الصلاحية اللازمة للوصول إلى هذا المحتوى'
}) => {
  const appContext = useContext(AppContext);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPermissions();
  }, [appContext?.currentEmployee, requiredResource, requiredAction, requireAuth, requireAdmin]);

  const checkPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if authentication is required
      if (requireAuth && !appContext?.isEmployeeLoggedIn) {
        setIsAuthorized(false);
        setError('مطلوب تسجيل الدخول');
        setLoading(false);
        return;
      }

      // Check admin requirement
      if (requireAdmin && !appContext?.isSystemAdmin?.()) {
        setIsAuthorized(false);
        setError('مطلوب صلاحيات المدير');
        setLoading(false);
        return;
      }

      // Custom permission check
      if (customCheck) {
        const customResult = await customCheck();
        setIsAuthorized(customResult);
        if (!customResult) {
          setError('فشل في التحقق المخصص من الصلاحيات');
        }
        setLoading(false);
        return;
      }

      // RBAC permission check
      if (requiredResource && requiredAction) {
        if (!appContext?.hasPermission) {
          // Fallback to basic checks if RBAC not fully implemented
          setIsAuthorized(!!appContext?.isEmployeeLoggedIn);
          setLoading(false);
          return;
        }

        const hasPermission = await appContext.hasPermission(
          requiredResource,
          requiredAction,
          context
        );

        setIsAuthorized(hasPermission);
        if (!hasPermission) {
          setError(`ليس لديك صلاحية ${requiredAction} على ${requiredResource}`);
        }
        setLoading(false);
        return;
      }

      // Default: allow access if no specific requirements
      setIsAuthorized(true);
      setLoading(false);

    } catch (err) {
      console.error('Permission check error:', err);
      setError('خطأ في فحص الصلاحيات');
      setIsAuthorized(false);
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{loadingText}</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!isAuthorized) {
    // Use custom fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default access denied UI
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 text-center max-w-md">
          <div className="mb-4">
            {error?.includes('تسجيل الدخول') ? (
              <FiLock className="mx-auto text-4xl text-gray-400" />
            ) : error?.includes('مدير') ? (
              <FiShield className="mx-auto text-4xl text-red-500" />
            ) : (
              <FiAlertTriangle className="mx-auto text-4xl text-orange-500" />
            )}
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {deniedTitle}
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || deniedMessage}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {error?.includes('تسجيل الدخول') ? (
              <button
                onClick={() => window.location.hash = '#/login'}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                تسجيل الدخول
              </button>
            ) : (
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                العودة
              </button>
            )}
            
            <button
              onClick={() => window.location.hash = '#/'}
              className="px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              الصفحة الرئيسية
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Access granted
  return <>{children}</>;
};

export default ProtectedRoute;