import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaExclamationTriangle as AlertTriangle, 
  FaShieldAlt as Shield, 
  FaChartLine as Activity, 
  FaClock as Clock, 
  FaUser as User, 
  FaGlobe as Globe, 
  FaMobileAlt as Smartphone, 
  FaDesktop as Monitor 
} from 'react-icons/fa';
import { sessionManager } from '../utils/sessionManager';
import { ActiveSession, SuspiciousActivity, SecurityLog } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';

interface SessionMonitorProps {
  currentUserId: string;
  onSessionAlert?: (activity: SuspiciousActivity) => void;
  onForceLogout?: () => void;
}

/**
 * مراقب الجلسات الآمنة
 * Real-time Session Security Monitor
 * 
 * مكون شامل لمراقبة أمان الجلسات يتضمن:
 * - عرض الجلسات النشطة
 * - تنبيهات الأنشطة المشبوهة
 * - إحصائيات الأمان المباشرة
 * - إدارة الجلسات النشطة
 */
const SessionMonitor: React.FC<SessionMonitorProps> = ({
  currentUserId,
  onSessionAlert,
  onForceLogout
}) => {
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [sessionStats, setSessionStats] = useState({
    totalActiveSessions: 0,
    totalSuspiciousActivities: 0,
    recentLogins: 0,
    securityViolations: 0
  });
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(true);

  /**
   * تحديث بيانات الجلسات
   */
  const updateSessionData = useCallback(() => {
    try {
      // الحصول على الجلسات النشطة
      const sessions = sessionManager.getUserActiveSessions(currentUserId);
      setActiveSessions(sessions);

      // الحصول على الإحصائيات
      const stats = sessionManager.getSessionStats();
      setSessionStats(stats);

      // الحصول على سجلات الأمان
      const logs = sessionManager.getSecurityLogs(currentUserId, 20);
      setSecurityLogs(logs);

      // فحص الأنشطة المشبوهة الجديدة
      const recentSuspicious = logs.filter(log => 
        log.event === 'SUSPICIOUS_ACTIVITY' && 
        Date.now() - log.timestamp.getTime() < 60000 // آخر دقيقة
      );
      
      if (recentSuspicious.length > 0 && onSessionAlert) {
        // إنشاء تنبيه للأنشطة المشبوهة
        // ملاحظة: هذا مبسط، في التطبيق الحقيقي ستحتاج API مخصص
      }

    } catch (error) {
      console.error('خطأ في تحديث بيانات الجلسات:', error);
    }
  }, [currentUserId, onSessionAlert]);

  /**
   * تشغيل المراقبة المباشرة
   */
  useEffect(() => {
    if (!isMonitoring) return;

    updateSessionData();
    
    const interval = setInterval(updateSessionData, 30000); // كل 30 ثانية
    
    return () => clearInterval(interval);
  }, [isMonitoring, updateSessionData]);

  /**
   * إنهاء جلسة معينة
   */
  const terminateSession = async (sessionId: string) => {
    try {
      sessionManager.terminateSession(sessionId, 'إنهاء يدوي من المراقب');
      updateSessionData();
      
      // إذا كانت الجلسة الحالية، فرض تسجيل الخروج
      const currentSession = activeSessions.find(s => s.isCurrentSession);
      if (currentSession?.sessionId === sessionId && onForceLogout) {
        onForceLogout();
      }
    } catch (error) {
      console.error('خطأ في إنهاء الجلسة:', error);
    }
  };

  /**
   * الحصول على أيقونة الجهاز
   */
  const getDeviceIcon = (device: string) => {
    if (device.includes('محمول')) return <Smartphone className="w-4 h-4" />;
    if (device.includes('لوحي')) return <Monitor className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  /**
   * تحديد لون شدة التهديد
   */
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-600 dark:text-red-400';
      case 'high': return 'text-orange-600 dark:text-orange-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  /**
   * تنسيق الوقت النسبي
   */
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
  };

  return (
    <div className="space-y-6">
      {/* شريط التحكم */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              مراقب الجلسات الآمنة
            </h3>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Button
              variant={isMonitoring ? "secondary" : "primary"}
              onClick={() => setIsMonitoring(!isMonitoring)}
              className="text-sm"
            >
              {isMonitoring ? 'إيقاف المراقبة' : 'بدء المراقبة'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowDetailedView(!showDetailedView)}
              className="text-sm"
            >
              {showDetailedView ? 'العرض المبسط' : 'العرض المفصل'}
            </Button>
          </div>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="flex items-center">
              <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">الجلسات النشطة</p>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {sessionStats.totalActiveSessions}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mr-2" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">أنشطة مشبوهة</p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                  {sessionStats.totalSuspiciousActivities}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <div className="flex items-center">
              <User className="w-4 h-4 text-green-600 dark:text-green-400 mr-2" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">دخول حديث</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {sessionStats.recentLogins}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 mr-2" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">انتهاكات أمنية</p>
                <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                  {sessionStats.securityViolations}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* مؤشر الحالة */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-gray-600 dark:text-gray-400">
              {isMonitoring ? 'المراقبة نشطة' : 'المراقبة متوقفة'}
            </span>
          </div>
          <div className="text-gray-500">
            آخر تحديث: {formatRelativeTime(new Date())}
          </div>
        </div>
      </Card>

      {/* الجلسات النشطة */}
      <Card>
        <div className="flex items-center space-x-2 rtl:space-x-reverse mb-4">
          <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            الجلسات النشطة ({activeSessions.length})
          </h4>
        </div>

        <div className="space-y-3">
          {activeSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              لا توجد جلسات نشطة
            </div>
          ) : (
            activeSessions.map((session) => (
              <div
                key={session.sessionId}
                className={`p-4 rounded-lg border ${
                  session.isCurrentSession
                    ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800'
                    : session.isSuspicious
                    ? 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                    : 'border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    {getDeviceIcon(session.device)}
                    <div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {session.device}
                        </span>
                        {session.isCurrentSession && (
                          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                            الجلسة الحالية
                          </span>
                        )}
                        {session.isSuspicious && (
                          <span className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded">
                            مشبوهة
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 rtl:space-x-reverse text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          <Globe className="w-4 h-4" />
                          <span>{session.location}</span>
                        </div>
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          <Clock className="w-4 h-4" />
                          <span>{formatRelativeTime(session.lastActivity)}</span>
                        </div>
                      </div>
                      {showDetailedView && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          IP: {session.ipAddress} | ID: {session.sessionId.substring(0, 8)}...
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!session.isCurrentSession && (
                    <Button
                      variant="secondary"
                      onClick={() => terminateSession(session.sessionId)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      إنهاء
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* سجلات الأمان الحديثة */}
      {showDetailedView && (
        <Card>
          <div className="flex items-center space-x-2 rtl:space-x-reverse mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              سجلات الأمان الحديثة
            </h4>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {securityLogs.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                لا توجد سجلات أمنية
              </div>
            ) : (
              securityLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className={`font-medium ${getSeverityColor(log.severity)}`}>
                        {log.event}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatRelativeTime(log.timestamp)}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(log.severity)} bg-opacity-10`}>
                      {log.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {log.details}
                  </p>
                  {showDetailedView && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      IP: {log.ipAddress} | User-Agent: {log.userAgent.substring(0, 50)}...
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* تنبيهات الأمان */}
      {sessionStats.totalSuspiciousActivities > 0 && (
        <Card>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h4 className="font-medium text-red-800 dark:text-red-200">
                تنبيه أمني
              </h4>
            </div>
            <p className="text-red-700 dark:text-red-300 mt-2">
              تم رصد {sessionStats.totalSuspiciousActivities} نشاط مشبوه. 
              يرجى مراجعة الجلسات النشطة والتأكد من أمان حسابك.
            </p>
            <div className="mt-3 flex space-x-2 rtl:space-x-reverse">
              <Button
                variant="primary"
                onClick={() => setShowDetailedView(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                عرض التفاصيل
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.location.hash = '#/mfa-management'}
                className="text-red-600 border-red-600"
              >
                تأمين الحساب
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SessionMonitor;