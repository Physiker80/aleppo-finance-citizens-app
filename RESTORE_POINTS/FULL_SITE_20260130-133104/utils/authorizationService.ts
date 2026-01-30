import {
  Role,
  Permission,
  RbacEmployee,
  AuthorizationContext,
  AccessAttempt,
  PermissionCheckResult,
  ResourceType,
  ActionType,
  SystemRoleType,
  PermissionCondition,
  UserRole,
  RolePermission,
  RbacSystemStats
} from '../types';
import { auditLogger } from './auditLogger';

// Default system permissions for each role type
const SYSTEM_ROLE_PERMISSIONS = {
  [SystemRoleType.SYSTEM_ADMIN]: [
    { resource: ResourceType.USERS, actions: ['create', 'read', 'update', 'delete'] },
    { resource: ResourceType.EMPLOYEES, actions: ['create', 'read', 'update', 'delete'] },
    { resource: ResourceType.ROLES, actions: ['create', 'read', 'update', 'delete'] },
    { resource: ResourceType.PERMISSIONS, actions: ['create', 'read', 'update', 'delete'] },
    { resource: ResourceType.AUDIT_LOGS, actions: ['read', 'export'] },
    { resource: ResourceType.SETTINGS, actions: ['read', 'update'] },
    { resource: ResourceType.REPORTS, actions: ['create', 'read', 'export'] },
    { resource: ResourceType.TICKETS, actions: ['create', 'read', 'update', 'delete', 'assign', 'forward'] },
    { resource: ResourceType.DEPARTMENTS, actions: ['create', 'read', 'update', 'delete'] },
    { resource: ResourceType.NOTIFICATIONS, actions: ['create', 'read', 'update', 'delete'] },
    { resource: ResourceType.ANALYTICS, actions: ['read', 'export'] }
  ],
  [SystemRoleType.DEPARTMENT_MANAGER]: [
    { resource: ResourceType.EMPLOYEES, actions: ['read', 'update'], conditions: [{ field: 'department', operator: 'eq', value: '@user.department' }] },
    { resource: ResourceType.TICKETS, actions: ['read', 'update', 'approve', 'escalate', 'forward'], conditions: [{ field: 'department', operator: 'eq', value: '@user.department' }] },
    { resource: ResourceType.REPORTS, actions: ['create', 'read', 'export'], conditions: [{ field: 'department', operator: 'eq', value: '@user.department' }] },
    { resource: ResourceType.NOTIFICATIONS, actions: ['create', 'read'] },
    { resource: ResourceType.ANALYTICS, actions: ['read'], conditions: [{ field: 'department', operator: 'eq', value: '@user.department' }] }
  ],
  [SystemRoleType.PROCESSOR]: [
    { resource: ResourceType.TICKETS, actions: ['read', 'update', 'reply', 'comment'], conditions: [{ field: 'assignedTo', operator: 'eq', value: '@user.id' }] },
    { resource: ResourceType.NOTIFICATIONS, actions: ['read', 'update'] },
    { resource: ResourceType.REPORTS, actions: ['read'], conditions: [{ field: 'createdBy', operator: 'eq', value: '@user.id' }] }
  ],
  [SystemRoleType.INQUIRY_OFFICER]: [
    { resource: ResourceType.TICKETS, actions: ['read'], conditions: [{ field: 'type', operator: 'eq', value: 'استعلام' }] },
    { resource: ResourceType.FAQ, actions: ['read'] },
    { resource: ResourceType.REPORTS, actions: ['create', 'read'] }
  ],
  [SystemRoleType.AUDITOR]: [
    { resource: ResourceType.AUDIT_LOGS, actions: ['read', 'export'] },
    { resource: ResourceType.TICKETS, actions: ['read'] },
    { resource: ResourceType.EMPLOYEES, actions: ['read'] },
    { resource: ResourceType.REPORTS, actions: ['create', 'read', 'export'] },
    { resource: ResourceType.ANALYTICS, actions: ['read', 'export'] }
  ],
  [SystemRoleType.EMPLOYEE]: [
    { resource: ResourceType.TICKETS, actions: ['read'], conditions: [{ field: 'department', operator: 'eq', value: '@user.department' }] },
    { resource: ResourceType.NOTIFICATIONS, actions: ['read'] }
  ]
};

export class AuthorizationService {
  private static instance: AuthorizationService;
  private accessAttempts: AccessAttempt[] = [];
  private cacheEnabled: boolean = true;
  private permissionCache: Map<string, PermissionCheckResult> = new Map();

  private constructor() {
    this.loadAccessAttemptsFromStorage();
  }

  static getInstance(): AuthorizationService {
    if (!AuthorizationService.instance) {
      AuthorizationService.instance = new AuthorizationService();
    }
    return AuthorizationService.instance;
  }

  // ===== Main Permission Check Method =====
  async checkPermission(
    userId: string,
    resource: ResourceType,
    action: ActionType,
    context: Partial<AuthorizationContext> = {}
  ): Promise<PermissionCheckResult> {
    const startTime = Date.now();
    
    try {
      // Build full context
      const fullContext: AuthorizationContext = {
        requestTime: new Date(),
        ...context,
        userId
      };

      // Get user from storage
      const user = await this.getUserById(userId);
      if (!user || !user.isActive) {
        return this.createDeniedResult('المستخدم غير موجود أو غير مفعل', startTime);
      }

      // Get user roles and permissions
      const userRoles = await this.getUserRoles(userId);
      const permissions = await this.getUserPermissions(userRoles, fullContext);

      // Check if user has the required permission
      const matchingPermissions = permissions.filter(perm =>
        perm.resource === resource && perm.action === action
      );

      if (matchingPermissions.length === 0) {
        const result = this.createDeniedResult('لا توجد صلاحية للقيام بهذا الإجراء', startTime, [], permissions);
        await this.logAccessAttempt(userId, resource, action, false, result.reason, fullContext);
        return result;
      }

      // Evaluate conditions for matching permissions
      for (const permission of matchingPermissions) {
        const conditionResult = await this.evaluateConditions(permission.conditions || [], fullContext, user);
        if (conditionResult.passed) {
          const result = this.createGrantedResult(startTime, [permission], permissions);
          await this.logAccessAttempt(userId, resource, action, true, undefined, fullContext);
          return result;
        }
      }

      // All permissions had failing conditions
      const result = this.createDeniedResult('لا تستوفي الشروط المطلوبة للوصول', startTime, [], permissions);
      await this.logAccessAttempt(userId, resource, action, false, result.reason, fullContext);
      return result;

    } catch (error) {
      const errorMsg = `خطأ في فحص الصلاحيات: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`;
      const result = this.createDeniedResult(errorMsg, startTime);
      const errorContext: AuthorizationContext = { userId, requestTime: new Date(), ...context };
      await this.logAccessAttempt(userId, resource, action, false, errorMsg, errorContext);
      return result;
    }
  }

  // ===== User and Role Management =====
  private async getUserById(userId: string): Promise<RbacEmployee | null> {
    try {
      const employees = JSON.parse(localStorage.getItem('employees') || '[]');
      const employee = employees.find((emp: any) => emp.username === userId);
      
      if (!employee) return null;

      // Convert legacy employee to RBAC employee
      return this.convertToRbacEmployee(employee);
    } catch {
      return null;
    }
  }

  private convertToRbacEmployee(employee: any): RbacEmployee {
    // Get user roles
    const userRoles = this.getUserRolesSync(employee.username);
    
    return {
      ...employee,
      id: employee.username,
      roles: userRoles,
      isActive: true,
      effectivePermissions: [],
      lastPermissionUpdate: new Date()
    };
  }

  private async getUserRoles(userId: string): Promise<Role[]> {
    return this.getUserRolesSync(userId);
  }

  private getUserRolesSync(userId: string): Role[] {
    try {
      const userRoles = JSON.parse(localStorage.getItem('userRoles') || '[]') as UserRole[];
      const roles = JSON.parse(localStorage.getItem('roles') || '[]') as Role[];
      
      const userActiveRoles = userRoles.filter(ur => 
        ur.userId === userId && 
        ur.isActive && 
        (!ur.expiresAt || new Date(ur.expiresAt) > new Date())
      );

      return userActiveRoles
        .map(ur => roles.find(r => r.id === ur.roleId))
        .filter((role): role is Role => role !== undefined && role.isActive);
    } catch {
      // Fallback to legacy role system
      return this.getLegacyUserRoles(userId);
    }
  }

  private getLegacyUserRoles(userId: string): Role[] {
    try {
      const employees = JSON.parse(localStorage.getItem('employees') || '[]');
      const employee = employees.find((emp: any) => emp.username === userId);
      
      if (!employee) return [];

      // Map legacy roles to new RBAC roles
      const roleType = this.mapLegacyRole(employee.role);
      return [{
        id: `legacy-${roleType}`,
        name: employee.role,
        type: roleType,
        description: `Legacy role: ${employee.role}`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: this.getSystemRolePermissions(roleType)
      }];
    } catch {
      return [];
    }
  }

  private mapLegacyRole(role: string): SystemRoleType {
    switch (role) {
      case 'مدير':
        return SystemRoleType.SYSTEM_ADMIN;
      case 'مدير القسم':
        return SystemRoleType.DEPARTMENT_MANAGER;
      case 'موظف معالجة':
        return SystemRoleType.PROCESSOR;
      case 'موظف استعلامات':
        return SystemRoleType.INQUIRY_OFFICER;
      case 'مراجع':
        return SystemRoleType.AUDITOR;
      default:
        return SystemRoleType.EMPLOYEE;
    }
  }

  private getSystemRolePermissions(roleType: SystemRoleType): Permission[] {
    const rolePermissions = SYSTEM_ROLE_PERMISSIONS[roleType] || [];
    
    return rolePermissions.flatMap(rp =>
      rp.actions.map(action => ({
        id: `${rp.resource}-${action}-${roleType}`,
        resource: rp.resource,
        action: action as ActionType,
        conditions: (rp as any).conditions || [],
        description: `${roleType} can ${action} ${rp.resource}`,
        isSystemPermission: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    );
  }

  // ===== Permission Evaluation =====
  private async getUserPermissions(roles: Role[], context: AuthorizationContext): Promise<Permission[]> {
    const allPermissions: Permission[] = [];
    
    for (const role of roles) {
      // Add role's direct permissions
      if (role.permissions) {
        allPermissions.push(...role.permissions);
      }
      
      // Add inherited permissions from parent roles
      if (role.inheritedPermissions) {
        allPermissions.push(...role.inheritedPermissions);
      }
    }

    // Remove duplicates and denied permissions
    const uniquePermissions = allPermissions.reduce((acc, perm) => {
      const key = `${perm.resource}-${perm.action}`;
      if (!acc.has(key)) {
        acc.set(key, perm);
      }
      return acc;
    }, new Map<string, Permission>());

    return Array.from(uniquePermissions.values());
  }

  private async evaluateConditions(
    conditions: PermissionCondition[],
    context: AuthorizationContext,
    user: RbacEmployee
  ): Promise<{ passed: boolean; failedConditions: PermissionCondition[] }> {
    const failedConditions: PermissionCondition[] = [];

    for (const condition of conditions) {
      const conditionPassed = await this.evaluateCondition(condition, context, user);
      if (!conditionPassed) {
        failedConditions.push(condition);
      }
    }

    return {
      passed: failedConditions.length === 0,
      failedConditions
    };
  }

  private async evaluateCondition(
    condition: PermissionCondition,
    context: AuthorizationContext,
    user: RbacEmployee
  ): Promise<boolean> {
    let actualValue = this.getContextValue(condition.field, context, user);
    let expectedValue = this.resolveValue(condition.value, context, user);

    switch (condition.operator) {
      case 'eq':
        return actualValue === expectedValue;
      case 'ne':
        return actualValue !== expectedValue;
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
      case 'nin':
        return Array.isArray(expectedValue) && !expectedValue.includes(actualValue);
      case 'gt':
        return actualValue > expectedValue;
      case 'gte':
        return actualValue >= expectedValue;
      case 'lt':
        return actualValue < expectedValue;
      case 'lte':
        return actualValue <= expectedValue;
      case 'contains':
        return String(actualValue).includes(String(expectedValue));
      case 'not_contains':
        return !String(actualValue).includes(String(expectedValue));
      default:
        return false;
    }
  }

  private getContextValue(field: string, context: AuthorizationContext, user: RbacEmployee): any {
    switch (field) {
      case 'department':
        return context.departmentId || user.department;
      case 'ownerId':
        return context.ownerId;
      case 'assignedTo':
        return context.targetResource?.assignedTo;
      case 'type':
        return context.targetResource?.type || context.targetResource?.requestType;
      case 'userId':
        return context.userId;
      default:
        return context.targetResource?.[field] || context.additionalContext?.[field];
    }
  }

  private resolveValue(value: any, context: AuthorizationContext, user: RbacEmployee): any {
    if (typeof value === 'string' && value.startsWith('@user.')) {
      const field = value.substring(6); // Remove '@user.'
      switch (field) {
        case 'id':
          return user.id;
        case 'department':
          return user.department;
        case 'role':
          return user.roles[0]?.type;
        default:
          return (user as any)[field];
      }
    }
    return value;
  }

  // ===== Utility Methods =====
  private createGrantedResult(
    startTime: number,
    matchedPermissions: Permission[],
    allPermissions: Permission[]
  ): PermissionCheckResult {
    return {
      granted: true,
      matchedPermissions,
      checkDurationMs: Date.now() - startTime
    };
  }

  private createDeniedResult(
    reason: string,
    startTime: number,
    failedConditions: PermissionCondition[] = [],
    allPermissions: Permission[] = []
  ): PermissionCheckResult {
    return {
      granted: false,
      reason,
      failedConditions,
      checkDurationMs: Date.now() - startTime
    };
  }

  // ===== Access Logging =====
  private async logAccessAttempt(
    userId: string,
    resource: ResourceType,
    action: ActionType,
    granted: boolean,
    reason?: string,
    context?: AuthorizationContext
  ): Promise<void> {
    const attempt: AccessAttempt = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      username: userId,
      resource,
      action,
      granted,
      reason,
      timestamp: new Date(),
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      context
    };

    this.accessAttempts.push(attempt);
    
    // Keep only last 1000 attempts in memory
    if (this.accessAttempts.length > 1000) {
      this.accessAttempts = this.accessAttempts.slice(-1000);
    }

    this.saveAccessAttemptsToStorage();
  }

  private loadAccessAttemptsFromStorage(): void {
    try {
      const stored = localStorage.getItem('accessAttempts');
      if (stored) {
        this.accessAttempts = JSON.parse(stored);
      }
    } catch {
      this.accessAttempts = [];
    }
  }

  private saveAccessAttemptsToStorage(): void {
    try {
      localStorage.setItem('accessAttempts', JSON.stringify(this.accessAttempts));
    } catch (error) {
      console.warn('Failed to save access attempts to storage:', error);
    }
  }

  // ===== Public API Methods =====
  
  async hasPermission(userId: string, resource: ResourceType, action: ActionType, context?: Partial<AuthorizationContext>): Promise<boolean> {
    const result = await this.checkPermission(userId, resource, action, context);
    return result.granted;
  }

  async requirePermission(userId: string, resource: ResourceType, action: ActionType, context?: Partial<AuthorizationContext>): Promise<void> {
    const result = await this.checkPermission(userId, resource, action, context);
    if (!result.granted) {
      throw new Error(result.reason || 'Access denied');
    }
  }

  getAccessAttempts(userId?: string, limit: number = 100): AccessAttempt[] {
    let attempts = this.accessAttempts;
    
    if (userId) {
      attempts = attempts.filter(a => a.userId === userId);
    }
    
    return attempts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getSystemStats(): RbacSystemStats {
    const roles = JSON.parse(localStorage.getItem('roles') || '[]') as Role[];
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    const userRoles = JSON.parse(localStorage.getItem('userRoles') || '[]') as UserRole[];
    
    const recentAttempts = this.accessAttempts.filter(
      a => Date.now() - a.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    return {
      totalRoles: roles.length,
      totalPermissions: this.getAllPermissions().length,
      totalUsers: employees.length,
      activeUsers: employees.filter((emp: any) => emp.isActive !== false).length,
      lockedUsers: employees.filter((emp: any) => emp.isLocked === true).length,
      systemAdmins: employees.filter((emp: any) => emp.role === 'مدير').length,
      recentAccessAttempts: recentAttempts.length,
      deniedAttempts: recentAttempts.filter(a => !a.granted).length,
      mostAccessedResources: this.getMostAccessedResources(recentAttempts),
      topActiveUsers: this.getTopActiveUsers(recentAttempts)
    };
  }

  private getAllPermissions(): Permission[] {
    const systemPermissions: Permission[] = [];
    Object.values(SystemRoleType).forEach(roleType => {
      systemPermissions.push(...this.getSystemRolePermissions(roleType));
    });
    return systemPermissions;
  }

  private getMostAccessedResources(attempts: AccessAttempt[]): { resource: ResourceType; count: number }[] {
    const resourceCounts = new Map<ResourceType, number>();
    
    attempts.forEach(attempt => {
      const count = resourceCounts.get(attempt.resource) || 0;
      resourceCounts.set(attempt.resource, count + 1);
    });

    return Array.from(resourceCounts.entries())
      .map(([resource, count]) => ({ resource, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getTopActiveUsers(attempts: AccessAttempt[]): { userId: string; username: string; accessCount: number }[] {
    const userCounts = new Map<string, number>();
    
    attempts.forEach(attempt => {
      const count = userCounts.get(attempt.userId) || 0;
      userCounts.set(attempt.userId, count + 1);
    });

    return Array.from(userCounts.entries())
      .map(([userId, accessCount]) => ({ userId, username: userId, accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);
  }

  // ===== Role and Permission Management =====
  
  async createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>, createdBy: string = 'SYSTEM'): Promise<Role> {
    const newRole: Role = {
      ...role,
      id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const roles = JSON.parse(localStorage.getItem('roles') || '[]') as Role[];
    roles.push(newRole);
    localStorage.setItem('roles', JSON.stringify(roles));

    // Log role creation
    auditLogger.logRoleCreation(
      newRole.id,
      newRole.name,
      newRole.type,
      createdBy,
      { 
        description: newRole.description, 
        isActive: newRole.isActive,
        parentRoleId: newRole.parentRoleId 
      }
    );

    return newRole;
  }

  async assignRoleToUser(userId: string, roleId: string, assignedBy: string, expiresAt?: Date): Promise<void> {
    const userRole: UserRole = {
      userId,
      roleId,
      assignedBy,
      assignedAt: new Date(),
      expiresAt,
      isActive: true
    };

    const userRoles = JSON.parse(localStorage.getItem('userRoles') || '[]') as UserRole[];
    userRoles.push(userRole);
    localStorage.setItem('userRoles', JSON.stringify(userRoles));

    // Get role name for logging
    const roles = JSON.parse(localStorage.getItem('roles') || '[]') as Role[];
    const role = roles.find(r => r.id === roleId);
    const roleName = role?.name || roleId;

    // Log role assignment
    auditLogger.logRoleAssignment(
      userId,
      roleId,
      roleName,
      assignedBy,
      expiresAt
    );

    userRoles.push(userRole);
    localStorage.setItem('userRoles', JSON.stringify(userRoles));
  }

  async createPermission(permission: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>, createdBy: string = 'SYSTEM'): Promise<Permission> {
    const newPermission: Permission = {
      ...permission,
      id: `perm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const permissions = JSON.parse(localStorage.getItem('permissions') || '[]') as Permission[];
    permissions.push(newPermission);
    localStorage.setItem('permissions', JSON.stringify(permissions));

    // Log permission creation
    auditLogger.logPermissionGrant(
      'SYSTEM', // This would be a role ID in real implementation
      newPermission.id,
      newPermission.resource,
      newPermission.action,
      createdBy
    );

    return newPermission;
  }

  async revokeRoleFromUser(userId: string, roleId: string, revokedBy: string, reason?: string): Promise<void> {
    const userRoles = JSON.parse(localStorage.getItem('userRoles') || '[]') as UserRole[];
    const roleIndex = userRoles.findIndex(ur => ur.userId === userId && ur.roleId === roleId && ur.isActive);
    
    if (roleIndex !== -1) {
      userRoles[roleIndex].isActive = false;
      localStorage.setItem('userRoles', JSON.stringify(userRoles));

      // Get role name for logging
      const roles = JSON.parse(localStorage.getItem('roles') || '[]') as Role[];
      const role = roles.find(r => r.id === roleId);
      const roleName = role?.name || roleId;

      // Log role revocation
      auditLogger.logRoleRevocation(
        userId,
        roleId,
        roleName,
        revokedBy,
        reason
      );
    }
  }

  clearCache(): void {
    this.permissionCache.clear();
  }
}

// Export singleton instance
export const authService = AuthorizationService.getInstance();