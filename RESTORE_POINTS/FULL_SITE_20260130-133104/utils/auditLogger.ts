import { 
  RbacAuditLog, 
  AccessAttempt, 
  SystemRoleType, 
  ResourceType, 
  ActionType 
} from '../types';

export class AuditLogger {
  private static instance: AuditLogger;
  private auditLogs: RbacAuditLog[] = [];

  private constructor() {
    this.loadLogsFromStorage();
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  // ===== Role Management Logging =====
  logRoleCreation(
    roleId: string,
    roleName: string,
    roleType: SystemRoleType,
    performedBy: string,
    metadata?: Record<string, any>
  ): string {
    return this.addLog({
      entityType: 'role',
      entityId: roleId,
      action: 'create',
      performedBy,
      newValues: {
        name: roleName,
        type: roleType,
        ...metadata
      },
      reason: `إنشاء دور جديد: ${roleName}`,
      timestamp: new Date()
    });
  }

  logRoleUpdate(
    roleId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    performedBy: string,
    reason?: string
  ): string {
    return this.addLog({
      entityType: 'role',
      entityId: roleId,
      action: 'update',
      performedBy,
      oldValues,
      newValues,
      reason: reason || `تحديث دور: ${oldValues.name || roleId}`,
      timestamp: new Date()
    });
  }

  logRoleAssignment(
    userId: string,
    roleId: string,
    roleName: string,
    performedBy: string,
    expiresAt?: Date
  ): string {
    return this.addLog({
      entityType: 'user_role',
      entityId: `${userId}-${roleId}`,
      action: 'assign',
      performedBy,
      newValues: {
        userId,
        roleId,
        roleName,
        expiresAt: expiresAt?.toISOString()
      },
      reason: `تعيين دور "${roleName}" للمستخدم ${userId}`,
      timestamp: new Date()
    });
  }

  logRoleRevocation(
    userId: string,
    roleId: string,
    roleName: string,
    performedBy: string,
    reason?: string
  ): string {
    return this.addLog({
      entityType: 'user_role',
      entityId: `${userId}-${roleId}`,
      action: 'revoke',
      performedBy,
      oldValues: {
        userId,
        roleId,
        roleName
      },
      reason: reason || `إلغاء دور "${roleName}" من المستخدم ${userId}`,
      timestamp: new Date()
    });
  }

  // ===== Permission Management Logging =====
  logPermissionGrant(
    roleId: string,
    permissionId: string,
    resource: ResourceType,
    action: ActionType,
    performedBy: string
  ): string {
    return this.addLog({
      entityType: 'role_permission',
      entityId: `${roleId}-${permissionId}`,
      action: 'assign',
      performedBy,
      newValues: {
        roleId,
        permissionId,
        resource,
        action
      },
      reason: `منح صلاحية ${action} على ${resource} للدور ${roleId}`,
      timestamp: new Date()
    });
  }

  logPermissionRevoke(
    roleId: string,
    permissionId: string,
    resource: ResourceType,
    action: ActionType,
    performedBy: string
  ): string {
    return this.addLog({
      entityType: 'role_permission',
      entityId: `${roleId}-${permissionId}`,
      action: 'revoke',
      performedBy,
      oldValues: {
        roleId,
        permissionId,
        resource,
        action
      },
      reason: `إلغاء صلاحية ${action} على ${resource} من الدور ${roleId}`,
      timestamp: new Date()
    });
  }

  // ===== User Account Logging =====
  logUserActivation(
    userId: string,
    performedBy: string
  ): string {
    return this.addLog({
      entityType: 'role',
      entityId: userId,
      action: 'update',
      performedBy,
      newValues: { isActive: true },
      oldValues: { isActive: false },
      reason: `تفعيل حساب المستخدم ${userId}`,
      timestamp: new Date()
    });
  }

  logUserDeactivation(
    userId: string,
    performedBy: string,
    reason?: string
  ): void {
    this.addLog({
      entityType: 'role',
      entityId: userId,
      action: 'update',
      performedBy,
      newValues: { isActive: false },
      oldValues: { isActive: true },
      reason: reason || `إلغاء تفعيل حساب المستخدم ${userId}`,
      timestamp: new Date()
    });
  }

  logUserLock(
    userId: string,
    performedBy: string,
    reason: string
  ): void {
    this.addLog({
      entityType: 'role',
      entityId: userId,
      action: 'update',
      performedBy,
      newValues: { 
        isLocked: true,
        lockedAt: new Date().toISOString(),
        lockedReason: reason
      },
      oldValues: { isLocked: false },
      reason: `قفل حساب المستخدم ${userId}: ${reason}`,
      timestamp: new Date()
    });
  }

  // ===== System Configuration Logging =====
  logSystemConfigurationChange(
    configKey: string,
    oldValue: any,
    newValue: any,
    performedBy: string,
    reason?: string
  ): void {
    this.addLog({
      entityType: 'permission',
      entityId: `config-${configKey}`,
      action: 'update',
      performedBy,
      oldValues: { [configKey]: oldValue },
      newValues: { [configKey]: newValue },
      reason: reason || `تغيير إعدادات النظام: ${configKey}`,
      timestamp: new Date()
    });
  }

  // ===== Access Attempt Integration =====
  logSecurityViolation(
    userId: string,
    violationType: string,
    details: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
  ): string {
    return this.addLog({
      entityType: 'permission',
      entityId: `security-${Date.now()}`,
      action: 'update',
      performedBy: 'SYSTEM',
      newValues: {
        violationType,
        severity,
        details,
        userId
      },
      reason: `مخالفة أمنية: ${violationType} - ${details}`,
      timestamp: new Date()
    });
  }

  // ===== Query Methods =====
  getAllLogs(limit: number = 100): RbacAuditLog[] {
    return this.auditLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  getLogsByUser(userId: string, limit: number = 50): RbacAuditLog[] {
    return this.auditLogs
      .filter(log => log.performedBy === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  getLogsByEntity(entityType: string, entityId?: string, limit: number = 50): RbacAuditLog[] {
    return this.auditLogs
      .filter(log => {
        if (entityId) {
          return log.entityType === entityType && log.entityId === entityId;
        }
        return log.entityType === entityType;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  getLogsByDateRange(startDate: Date, endDate: Date): RbacAuditLog[] {
    return this.auditLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  getSecurityLogs(limit: number = 50): RbacAuditLog[] {
    return this.auditLogs
      .filter(log => log.reason?.includes('مخالفة أمنية') || log.reason?.includes('security'))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // ===== Statistics =====
  getAuditStatistics(): {
    totalLogs: number;
    recentLogs: number;
    topUsers: { userId: string; count: number }[];
    topActions: { action: string; count: number }[];
    securityViolations: number;
  } {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentLogs = this.auditLogs.filter(log => 
      new Date(log.timestamp) >= oneDayAgo
    );

    const userCounts = new Map<string, number>();
    const actionCounts = new Map<string, number>();
    let securityViolations = 0;

    this.auditLogs.forEach(log => {
      // Count users
      const userCount = userCounts.get(log.performedBy) || 0;
      userCounts.set(log.performedBy, userCount + 1);

      // Count actions
      const actionCount = actionCounts.get(log.action) || 0;
      actionCounts.set(log.action, actionCount + 1);

      // Count security violations
      if (log.reason?.includes('مخالفة أمنية')) {
        securityViolations++;
      }
    });

    return {
      totalLogs: this.auditLogs.length,
      recentLogs: recentLogs.length,
      topUsers: Array.from(userCounts.entries())
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topActions: Array.from(actionCounts.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      securityViolations
    };
  }

  // ===== Export & Import =====
  exportLogs(startDate?: Date, endDate?: Date): string {
    let logs = this.auditLogs;
    
    if (startDate && endDate) {
      logs = this.getLogsByDateRange(startDate, endDate);
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      totalLogs: logs.length,
      logs: logs
    };

    return JSON.stringify(exportData, null, 2);
  }

  // ===== Private Methods =====
  private addLog(log: Omit<RbacAuditLog, 'id' | 'ipAddress' | 'userAgent'>): string {
    const newLog: RbacAuditLog = {
      ...log,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ipAddress: this.getCurrentIP(),
      userAgent: navigator.userAgent
    };

    this.auditLogs.push(newLog);

    // Keep only last 1000 logs in memory to prevent memory issues
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }

    this.saveLogsToStorage();
    return newLog.id;
  }

  private getCurrentIP(): string | undefined {
    // In a browser environment, we can't directly get IP
    // This would be handled by the backend in a real implementation
    return undefined;
  }

  private loadLogsFromStorage(): void {
    try {
      const stored = localStorage.getItem('rbacAuditLogs');
      if (stored) {
        this.auditLogs = JSON.parse(stored).map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load audit logs from storage:', error);
      this.auditLogs = [];
    }
  }

  private saveLogsToStorage(): void {
    try {
      localStorage.setItem('rbacAuditLogs', JSON.stringify(this.auditLogs));
    } catch (error) {
      console.warn('Failed to save audit logs to storage:', error);
    }
  }

  // ===== Cleanup =====
  clearOldLogs(olderThanDays: number = 90): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const initialCount = this.auditLogs.length;
    this.auditLogs = this.auditLogs.filter(log => 
      new Date(log.timestamp) >= cutoffDate
    );

    this.saveLogsToStorage();
    return initialCount - this.auditLogs.length;
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();