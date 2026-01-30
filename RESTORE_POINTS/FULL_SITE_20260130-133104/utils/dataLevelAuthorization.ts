/**
 * نظام التفويض على مستوى البيانات (Data-Level Authorization)
 * يضمن أن المستخدمين يمكنهم الوصول فقط للبيانات التي لهم صلاحية عليها
 */

// تعداد مستويات التصنيف الأمني للبيانات
export enum DataClassificationLevel {
  PUBLIC = 'عام',
  INTERNAL = 'داخلي', 
  CONFIDENTIAL = 'سري',
  HIGHLY_CONFIDENTIAL = 'سري للغاية'
}

// تعداد أنواع العمليات على البيانات
export enum DataOperation {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  SHARE = 'share'
}

// تعداد شروط الوصول
export enum AccessCondition {
  OWNER = 'owner',              // المستخدم هو صاحب البيانات
  ASSIGNED = 'assigned',        // البيانات مخصصة للمستخدم
  DEPARTMENT = 'department',    // البيانات تابعة لقسم المستخدم
  PUBLIC = 'public',            // البيانات عامة
  MANAGER = 'manager',          // المستخدم مدير القسم المسؤول
  ADMIN = 'admin',              // المستخدم مدير نظام
  OWNER_DRAFT = 'owner_draft',  // المالك والبيانات مسودة
  SUPERVISOR = 'supervisor',    // المستخدم مشرف
  SAME_LEVEL = 'same_level',    // نفس مستوى المستخدم
  HIGHER_LEVEL = 'higher_level' // مستوى أعلى من المستخدم
}

// واجهة قاعدة الوصول
interface AccessRule {
  condition: AccessCondition;
  description: string;
  requiredLevel?: DataClassificationLevel;
  additionalChecks?: ((user: any, data: any, context?: any) => boolean)[];
}

// واجهة سياسة الوصول للموارد
interface ResourceAccessPolicy {
  read?: AccessRule[];
  create?: AccessRule[];
  update?: AccessRule[];
  delete?: AccessRule[];
  export?: AccessRule[];
  share?: AccessRule[];
}

// واجهة البيانات المصنفة أمنياً
export interface ClassifiedData {
  id: string;
  classificationLevel: DataClassificationLevel;
  owner: string;
  department: string;
  assignedTo?: string[];
  isPublic?: boolean;
  isDraft?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * قواعد الوصول القائمة على السمات (ABAC) للموارد المختلفة
 */
export const accessRules: Record<string, ResourceAccessPolicy> = {
  // قواعد التذاكر والطلبات
  ticket: {
    [DataOperation.READ]: [
      { condition: AccessCondition.OWNER, description: 'المستخدم هو صاحب التذكرة' },
      { condition: AccessCondition.ASSIGNED, description: 'التذكرة مخصصة للمستخدم' },
      { condition: AccessCondition.DEPARTMENT, description: 'التذكرة تابعة لقسم المستخدم' },
      { condition: AccessCondition.PUBLIC, description: 'التذكرة عامة' },
      { condition: AccessCondition.ADMIN, description: 'المستخدم مدير نظام' }
    ],
    [DataOperation.UPDATE]: [
      { condition: AccessCondition.ASSIGNED, description: 'التذكرة مخصصة للمستخدم' },
      { condition: AccessCondition.MANAGER, description: 'المستخدم مدير القسم المسؤول' },
      { condition: AccessCondition.ADMIN, description: 'المستخدم مدير نظام' }
    ],
    [DataOperation.DELETE]: [
      { condition: AccessCondition.ADMIN, description: 'المستخدم مدير نظام' },
      { condition: AccessCondition.OWNER_DRAFT, description: 'المالك والتذكرة مسودة' }
    ],
    [DataOperation.EXPORT]: [
      { condition: AccessCondition.MANAGER, description: 'المستخدم مدير القسم' },
      { condition: AccessCondition.ADMIN, description: 'المستخدم مدير نظام' }
    ]
  },

  // قواعد الوثائق والمرفقات
  document: {
    [DataOperation.READ]: [
      { condition: AccessCondition.OWNER, description: 'المستخدم هو صاحب الوثيقة' },
      { condition: AccessCondition.DEPARTMENT, description: 'الوثيقة تابعة لقسم المستخدم' },
      { 
        condition: AccessCondition.PUBLIC, 
        description: 'الوثيقة عامة',
        requiredLevel: DataClassificationLevel.PUBLIC
      },
      { 
        condition: AccessCondition.ADMIN, 
        description: 'المستخدم مدير نظام',
        requiredLevel: DataClassificationLevel.HIGHLY_CONFIDENTIAL
      }
    ],
    [DataOperation.UPDATE]: [
      { condition: AccessCondition.OWNER, description: 'المستخدم هو صاحب الوثيقة' },
      { condition: AccessCondition.ASSIGNED, description: 'الوثيقة مخصصة للمستخدم للتحرير' }
    ],
    [DataOperation.SHARE]: [
      { 
        condition: AccessCondition.OWNER, 
        description: 'المستخدم هو صاحب الوثيقة',
        requiredLevel: DataClassificationLevel.INTERNAL
      },
      { 
        condition: AccessCondition.MANAGER, 
        description: 'المستخدم مدير القسم',
        requiredLevel: DataClassificationLevel.CONFIDENTIAL
      }
    ]
  },

  // قواعد الرسائل الداخلية
  message: {
    [DataOperation.READ]: [
      { condition: AccessCondition.OWNER, description: 'المستخدم هو مرسل الرسالة' },
      { condition: AccessCondition.ASSIGNED, description: 'المستخدم هو مستقبل الرسالة' },
      { condition: AccessCondition.DEPARTMENT, description: 'رسالة داخل القسم' }
    ],
    [DataOperation.CREATE]: [
      { condition: AccessCondition.SAME_LEVEL, description: 'إرسال لنفس المستوى' },
      { condition: AccessCondition.HIGHER_LEVEL, description: 'إرسال للمستوى الأعلى' }
    ],
    [DataOperation.DELETE]: [
      { condition: AccessCondition.OWNER, description: 'المستخدم هو مرسل الرسالة' },
      { condition: AccessCondition.ADMIN, description: 'المستخدم مدير نظام' }
    ]
  },

  // قواعد بيانات الموظفين
  employee: {
    [DataOperation.READ]: [
      { condition: AccessCondition.OWNER, description: 'المستخدم يستعرض بياناته الشخصية' },
      { condition: AccessCondition.MANAGER, description: 'المستخدم مدير القسم' },
      { condition: AccessCondition.ADMIN, description: 'المستخدم مدير نظام' }
    ],
    [DataOperation.UPDATE]: [
      { 
        condition: AccessCondition.OWNER, 
        description: 'المستخدم يحدث بياناته الشخصية الأساسية',
        requiredLevel: DataClassificationLevel.INTERNAL
      },
      { 
        condition: AccessCondition.ADMIN, 
        description: 'المستخدم مدير نظام - تحديث شامل',
        requiredLevel: DataClassificationLevel.HIGHLY_CONFIDENTIAL
      }
    ],
    [DataOperation.DELETE]: [
      { condition: AccessCondition.ADMIN, description: 'المستخدم مدير نظام فقط' }
    ]
  },

  // قواعد التقارير والإحصائيات
  report: {
    [DataOperation.READ]: [
      { 
        condition: AccessCondition.DEPARTMENT, 
        description: 'تقارير القسم',
        requiredLevel: DataClassificationLevel.INTERNAL
      },
      { 
        condition: AccessCondition.MANAGER, 
        description: 'تقارير إدارية',
        requiredLevel: DataClassificationLevel.CONFIDENTIAL
      },
      { 
        condition: AccessCondition.ADMIN, 
        description: 'جميع التقارير',
        requiredLevel: DataClassificationLevel.HIGHLY_CONFIDENTIAL
      }
    ],
    [DataOperation.EXPORT]: [
      { condition: AccessCondition.MANAGER, description: 'المستخدم مدير أو أعلى' },
      { condition: AccessCondition.ADMIN, description: 'المستخدم مدير نظام' }
    ]
  }
};

/**
 * فئة محرك التفويض على مستوى البيانات
 */
export class DataLevelAuthorizationEngine {
  /**
   * فحص صلاحية الوصول لمورد معين
   */
  static checkAccess(
    resourceType: string,
    operation: DataOperation,
    user: any,
    data: ClassifiedData,
    context?: any
  ): { allowed: boolean; reason: string; appliedRule?: AccessRule } {
    const resourceRules = accessRules[resourceType];
    if (!resourceRules) {
      return { allowed: false, reason: `نوع المورد غير مدعوم: ${resourceType}` };
    }

    const operationRules = resourceRules[operation];
    if (!operationRules) {
      return { allowed: false, reason: `العملية غير مدعومة: ${operation}` };
    }

    // فحص كل قاعدة وصول
    for (const rule of operationRules) {
      const ruleCheck = this.evaluateRule(rule, user, data, context);
      if (ruleCheck.allowed) {
        return {
          allowed: true,
          reason: ruleCheck.reason,
          appliedRule: rule
        };
      }
    }

    return { 
      allowed: false, 
      reason: 'لا توجد صلاحية للوصول لهذا المورد' 
    };
  }

  /**
   * تقييم قاعدة وصول معينة
   */
  private static evaluateRule(
    rule: AccessRule,
    user: any,
    data: ClassifiedData,
    context?: any
  ): { allowed: boolean; reason: string } {
    // فحص مستوى التصنيف الأمني المطلوب
    if (rule.requiredLevel && !this.hasRequiredClearance(user, rule.requiredLevel)) {
      return { 
        allowed: false, 
        reason: `مستوى التصنيف الأمني المطلوب: ${rule.requiredLevel}` 
      };
    }

    // تقييم شروط الوصول
    let conditionMet = false;
    let reason = '';

    switch (rule.condition) {
      case AccessCondition.OWNER:
        conditionMet = data.owner === user.id || data.owner === user.username;
        reason = conditionMet ? 'المستخدم هو صاحب البيانات' : 'المستخدم ليس صاحب البيانات';
        break;

      case AccessCondition.ASSIGNED:
        conditionMet = !!(data.assignedTo?.includes(user.id) || data.assignedTo?.includes(user.username));
        reason = conditionMet ? 'البيانات مخصصة للمستخدم' : 'البيانات غير مخصصة للمستخدم';
        break;

      case AccessCondition.DEPARTMENT:
        conditionMet = data.department === user.department;
        reason = conditionMet ? 'البيانات تابعة لقسم المستخدم' : 'البيانات ليست تابعة لقسم المستخدم';
        break;

      case AccessCondition.PUBLIC:
        conditionMet = data.isPublic === true;
        reason = conditionMet ? 'البيانات عامة' : 'البيانات ليست عامة';
        break;

      case AccessCondition.ADMIN:
        conditionMet = user.role === 'مدير' || user.role === 'admin';
        reason = conditionMet ? 'المستخدم مدير نظام' : 'المستخدم ليس مدير نظام';
        break;

      case AccessCondition.MANAGER:
        conditionMet = this.isManager(user, data.department);
        reason = conditionMet ? 'المستخدم مدير القسم' : 'المستخدم ليس مدير القسم';
        break;

      case AccessCondition.OWNER_DRAFT:
        conditionMet = (data.owner === user.id || data.owner === user.username) && data.isDraft === true;
        reason = conditionMet ? 'المستخدم مالك البيانات وهي مسودة' : 'البيانات ليست مسودة أو المستخدم ليس المالك';
        break;

      default:
        conditionMet = false;
        reason = 'شرط وصول غير معروف';
    }

    // فحص الشروط الإضافية إن وجدت
    if (conditionMet && rule.additionalChecks) {
      for (const additionalCheck of rule.additionalChecks) {
        if (!additionalCheck(user, data, context)) {
          conditionMet = false;
          reason = 'فشل في الشروط الإضافية';
          break;
        }
      }
    }

    return { allowed: conditionMet, reason };
  }

  /**
   * فحص مستوى التصنيف الأمني للمستخدم
   */
  private static hasRequiredClearance(user: any, requiredLevel: DataClassificationLevel): boolean {
    const userClearance = user.securityClearance || DataClassificationLevel.INTERNAL;
    
    const clearanceLevels = [
      DataClassificationLevel.PUBLIC,
      DataClassificationLevel.INTERNAL,
      DataClassificationLevel.CONFIDENTIAL,
      DataClassificationLevel.HIGHLY_CONFIDENTIAL
    ];

    const userLevelIndex = clearanceLevels.indexOf(userClearance);
    const requiredLevelIndex = clearanceLevels.indexOf(requiredLevel);

    return userLevelIndex >= requiredLevelIndex;
  }

  /**
   * فحص ما إذا كان المستخدم مدير قسم معين
   */
  private static isManager(user: any, department: string): boolean {
    return (user.role === 'مدير' || user.managerOf?.includes(department) || 
            user.department === department && user.level === 'manager');
  }

  /**
   * تصفية قائمة البيانات حسب صلاحيات المستخدم
   */
  static filterDataByPermissions<T extends ClassifiedData>(
    resourceType: string,
    operation: DataOperation,
    data: T[],
    user: any,
    context?: any
  ): T[] {
    return data.filter(item => {
      const accessCheck = this.checkAccess(resourceType, operation, user, item, context);
      return accessCheck.allowed;
    });
  }

  /**
   * إنشاء سجل تدقيق للوصول
   */
  static logAccess(
    resourceType: string,
    operation: DataOperation,
    user: any,
    data: ClassifiedData,
    accessResult: { allowed: boolean; reason: string; appliedRule?: AccessRule },
    context?: any
  ): void {
    const auditLog = {
      timestamp: new Date(),
      userId: user.id || user.username,
      userName: user.name,
      resourceType,
      resourceId: data.id,
      operation,
      allowed: accessResult.allowed,
      reason: accessResult.reason,
      appliedRule: accessResult.appliedRule?.condition,
      dataClassification: data.classificationLevel,
      userDepartment: user.department,
      resourceDepartment: data.department,
      context
    };

    // حفظ سجل التدقيق (يمكن إرساله لخادم أو حفظه محلياً)
    console.log('Data Access Audit:', auditLog);
    
    // في التطبيق الفعلي، يجب حفظ هذا في قاعدة بيانات التدقيق
    const auditLogs = JSON.parse(localStorage.getItem('dataAccessAudit') || '[]');
    auditLogs.push(auditLog);
    localStorage.setItem('dataAccessAudit', JSON.stringify(auditLogs));
  }
}

/**
 * دوال مساعدة للاستخدام السهل
 */

// فحص صلاحية القراءة
export function canRead(resourceType: string, user: any, data: ClassifiedData, context?: any): boolean {
  const result = DataLevelAuthorizationEngine.checkAccess(resourceType, DataOperation.READ, user, data, context);
  DataLevelAuthorizationEngine.logAccess(resourceType, DataOperation.READ, user, data, result, context);
  return result.allowed;
}

// فحص صلاحية التحديث
export function canUpdate(resourceType: string, user: any, data: ClassifiedData, context?: any): boolean {
  const result = DataLevelAuthorizationEngine.checkAccess(resourceType, DataOperation.UPDATE, user, data, context);
  DataLevelAuthorizationEngine.logAccess(resourceType, DataOperation.UPDATE, user, data, result, context);
  return result.allowed;
}

// فحص صلاحية الحذف
export function canDelete(resourceType: string, user: any, data: ClassifiedData, context?: any): boolean {
  const result = DataLevelAuthorizationEngine.checkAccess(resourceType, DataOperation.DELETE, user, data, context);
  DataLevelAuthorizationEngine.logAccess(resourceType, DataOperation.DELETE, user, data, result, context);
  return result.allowed;
}

// فحص صلاحية التصدير
export function canExport(resourceType: string, user: any, data: ClassifiedData, context?: any): boolean {
  const result = DataLevelAuthorizationEngine.checkAccess(resourceType, DataOperation.EXPORT, user, data, context);
  DataLevelAuthorizationEngine.logAccess(resourceType, DataOperation.EXPORT, user, data, result, context);
  return result.allowed;
}

// تصفية البيانات حسب صلاحية القراءة
export function filterReadableData<T extends ClassifiedData>(
  resourceType: string,
  data: T[],
  user: any,
  context?: any
): T[] {
  return DataLevelAuthorizationEngine.filterDataByPermissions(resourceType, DataOperation.READ, data, user, context);
}

export default DataLevelAuthorizationEngine;