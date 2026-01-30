// =====================================================
// 🎯 Auto Assignment System
// نظام التوزيع الآلي للشكاوى
// =====================================================

export interface Employee {
    id: string;
    name: string;
    department: string;
    role: string;
    isActive: boolean;
    skills: string[];
    maxWorkload: number;
    currentWorkload: number;
    averageHandlingTime: number; // بالدقائق
    satisfaction: number; // 0-5
    availability: EmployeeAvailability;
}

export interface EmployeeAvailability {
    isOnline: boolean;
    isOnLeave: boolean;
    workingHours: { start: string; end: string };
    timezone: string;
}

export interface AssignmentRule {
    id: string;
    name: string;
    priority: number;
    conditions: AssignmentCondition[];
    action: AssignmentAction;
    isActive: boolean;
}

export interface AssignmentCondition {
    field: 'department' | 'priority' | 'category' | 'keyword' | 'time';
    operator: 'equals' | 'contains' | 'greater' | 'less' | 'between';
    value: string | number | string[];
}

export interface AssignmentAction {
    type: 'assign_to_employee' | 'assign_to_department' | 'round_robin' | 'least_loaded' | 'skill_based';
    employeeId?: string;
    department?: string;
    fallbackAction?: AssignmentAction;
}

export interface AssignmentResult {
    ticketId: string;
    assignedTo: string;
    assignedToName: string;
    reason: string;
    method: string;
    score?: number;
}

export interface AssignmentConfig {
    defaultMethod: 'round_robin' | 'least_loaded' | 'skill_based' | 'random';
    considerWorkload: boolean;
    considerSkills: boolean;
    considerAvailability: boolean;
    maxWorkloadThreshold: number; // نسبة مئوية
    rules: AssignmentRule[];
}

const CONFIG_KEY = 'assignment-config';
const EMPLOYEES_KEY = 'employee-workload';
const ASSIGNMENT_LOG_KEY = 'assignment-log';

// الإعدادات الافتراضية
const DEFAULT_CONFIG: AssignmentConfig = {
    defaultMethod: 'least_loaded',
    considerWorkload: true,
    considerSkills: true,
    considerAvailability: true,
    maxWorkloadThreshold: 80,
    rules: [
        {
            id: 'rule-urgent',
            name: 'الشكاوى العاجلة للمشرف',
            priority: 1,
            conditions: [
                { field: 'priority', operator: 'equals', value: 'urgent' }
            ],
            action: { type: 'assign_to_department', department: 'الديوان' },
            isActive: true
        },
        {
            id: 'rule-tax',
            name: 'الضرائب لقسم الإيرادات',
            priority: 2,
            conditions: [
                { field: 'keyword', operator: 'contains', value: ['ضريبة', 'ضرائب', 'رسوم'] }
            ],
            action: { type: 'assign_to_department', department: 'الإيرادات' },
            isActive: true
        }
    ]
};

/**
 * تحميل الإعدادات
 */
export function loadConfig(): AssignmentConfig {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
        return DEFAULT_CONFIG;
    }
}

/**
 * حفظ الإعدادات
 */
export function saveConfig(config: Partial<AssignmentConfig>): void {
    const current = loadConfig();
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...config }));
}

/**
 * تحميل بيانات الموظفين
 */
function loadEmployeeWorkload(): Record<string, { current: number; assigned: string[] }> {
    try {
        const saved = localStorage.getItem(EMPLOYEES_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

/**
 * حفظ بيانات الموظفين
 */
function saveEmployeeWorkload(data: Record<string, { current: number; assigned: string[] }>): void {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(data));
}

/**
 * التحقق من الشروط
 */
function checkConditions(
    ticket: {
        department?: string;
        priority?: string;
        category?: string;
        title?: string;
        description?: string;
        createdAt?: Date;
    },
    conditions: AssignmentCondition[]
): boolean {
    return conditions.every(condition => {
        let fieldValue: unknown;

        switch (condition.field) {
            case 'department':
                fieldValue = ticket.department;
                break;
            case 'priority':
                fieldValue = ticket.priority;
                break;
            case 'category':
                fieldValue = ticket.category;
                break;
            case 'keyword':
                fieldValue = `${ticket.title || ''} ${ticket.description || ''}`.toLowerCase();
                break;
            case 'time':
                fieldValue = new Date().getHours();
                break;
        }

        switch (condition.operator) {
            case 'equals':
                return fieldValue === condition.value;

            case 'contains':
                if (Array.isArray(condition.value)) {
                    return condition.value.some(v =>
                        String(fieldValue).toLowerCase().includes(v.toLowerCase())
                    );
                }
                return String(fieldValue).toLowerCase().includes(
                    String(condition.value).toLowerCase()
                );

            case 'greater':
                return Number(fieldValue) > Number(condition.value);

            case 'less':
                return Number(fieldValue) < Number(condition.value);

            case 'between':
                if (Array.isArray(condition.value) && condition.value.length === 2) {
                    const num = Number(fieldValue);
                    return num >= Number(condition.value[0]) && num <= Number(condition.value[1]);
                }
                return false;
        }

        return false;
    });
}

/**
 * الحصول على موظفي القسم
 */
function getDepartmentEmployees(
    department: string,
    employees: Employee[]
): Employee[] {
    return employees.filter(e =>
        e.department === department &&
        e.isActive &&
        !e.availability?.isOnLeave
    );
}

/**
 * الحصول على الموظف الأقل حملاً
 */
function getLeastLoadedEmployee(employees: Employee[]): Employee | null {
    if (employees.length === 0) return null;

    const workload = loadEmployeeWorkload();

    let bestEmployee: Employee | null = null;
    let minLoad = Infinity;

    employees.forEach(emp => {
        const empWorkload = workload[emp.id]?.current || 0;
        const loadPercentage = (empWorkload / emp.maxWorkload) * 100;

        if (loadPercentage < minLoad) {
            minLoad = loadPercentage;
            bestEmployee = emp;
        }
    });

    return bestEmployee;
}

/**
 * الحصول على الموظف التالي (Round Robin)
 */
let roundRobinIndex = 0;
function getNextEmployee(employees: Employee[]): Employee | null {
    if (employees.length === 0) return null;

    const employee = employees[roundRobinIndex % employees.length];
    roundRobinIndex++;

    return employee;
}

/**
 * الحصول على الموظف حسب المهارات
 */
function getSkillMatchEmployee(
    employees: Employee[],
    requiredSkills: string[]
): Employee | null {
    if (employees.length === 0 || requiredSkills.length === 0) return null;

    let bestMatch: Employee | null = null;
    let bestScore = 0;

    employees.forEach(emp => {
        const matchedSkills = requiredSkills.filter(skill =>
            emp.skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
        );

        const score = matchedSkills.length / requiredSkills.length;

        if (score > bestScore) {
            bestScore = score;
            bestMatch = emp;
        }
    });

    return bestMatch;
}

/**
 * استخراج المهارات المطلوبة من الشكوى
 */
function extractRequiredSkills(ticket: {
    title?: string;
    description?: string;
    category?: string;
}): string[] {
    const text = `${ticket.title || ''} ${ticket.description || ''} ${ticket.category || ''}`;
    const skillKeywords = [
        'ضريبة', 'ضرائب', 'قانون', 'محاسبة', 'مالية', 'تقني',
        'عقارات', 'مركبات', 'تحصيل', 'تدقيق'
    ];

    return skillKeywords.filter(skill => text.includes(skill));
}

/**
 * تعيين شكوى تلقائياً
 */
export function autoAssignTicket(
    ticket: {
        id: string;
        department?: string;
        priority?: string;
        category?: string;
        title?: string;
        description?: string;
        createdAt?: Date;
    },
    employees: Employee[]
): AssignmentResult | null {
    const config = loadConfig();

    // فحص القواعد أولاً
    const sortedRules = [...config.rules]
        .filter(r => r.isActive)
        .sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
        if (checkConditions(ticket, rule.conditions)) {
            const result = executeAction(ticket.id, rule.action, employees, config);
            if (result) {
                result.reason = `تطبيق القاعدة: ${rule.name}`;
                logAssignment(result);
                return result;
            }
        }
    }

    // التعيين الافتراضي
    const deptEmployees = ticket.department
        ? getDepartmentEmployees(ticket.department, employees)
        : employees.filter(e => e.isActive);

    if (deptEmployees.length === 0) {
        return null;
    }

    let assignedEmployee: Employee | null = null;
    let method = config.defaultMethod;

    switch (config.defaultMethod) {
        case 'round_robin':
            assignedEmployee = getNextEmployee(deptEmployees);
            break;

        case 'least_loaded':
            assignedEmployee = getLeastLoadedEmployee(deptEmployees);
            break;

        case 'skill_based':
            const skills = extractRequiredSkills(ticket);
            assignedEmployee = getSkillMatchEmployee(deptEmployees, skills);
            if (!assignedEmployee) {
                assignedEmployee = getLeastLoadedEmployee(deptEmployees);
                method = 'least_loaded (fallback)';
            }
            break;

        case 'random':
            assignedEmployee = deptEmployees[Math.floor(Math.random() * deptEmployees.length)];
            break;
    }

    if (!assignedEmployee) return null;

    const result: AssignmentResult = {
        ticketId: ticket.id,
        assignedTo: assignedEmployee.id,
        assignedToName: assignedEmployee.name,
        reason: 'التعيين الافتراضي',
        method
    };

    // تحديث حمل العمل
    updateWorkload(assignedEmployee.id, ticket.id);
    logAssignment(result);

    return result;
}

/**
 * تنفيذ إجراء التعيين
 */
function executeAction(
    ticketId: string,
    action: AssignmentAction,
    employees: Employee[],
    config: AssignmentConfig
): AssignmentResult | null {
    let targetEmployees = employees.filter(e => e.isActive);

    if (action.department) {
        targetEmployees = getDepartmentEmployees(action.department, employees);
    }

    if (targetEmployees.length === 0) {
        if (action.fallbackAction) {
            return executeAction(ticketId, action.fallbackAction, employees, config);
        }
        return null;
    }

    let assignedEmployee: Employee | null = null;

    switch (action.type) {
        case 'assign_to_employee':
            assignedEmployee = employees.find(e => e.id === action.employeeId) || null;
            break;

        case 'assign_to_department':
        case 'round_robin':
            assignedEmployee = getNextEmployee(targetEmployees);
            break;

        case 'least_loaded':
            assignedEmployee = getLeastLoadedEmployee(targetEmployees);
            break;

        case 'skill_based':
            // يحتاج معلومات الشكوى - سيستخدم least_loaded كبديل
            assignedEmployee = getLeastLoadedEmployee(targetEmployees);
            break;
    }

    if (!assignedEmployee) return null;

    updateWorkload(assignedEmployee.id, ticketId);

    return {
        ticketId,
        assignedTo: assignedEmployee.id,
        assignedToName: assignedEmployee.name,
        reason: '',
        method: action.type
    };
}

/**
 * تحديث حمل العمل
 */
function updateWorkload(employeeId: string, ticketId: string): void {
    const workload = loadEmployeeWorkload();

    if (!workload[employeeId]) {
        workload[employeeId] = { current: 0, assigned: [] };
    }

    workload[employeeId].current++;
    workload[employeeId].assigned.push(ticketId);

    saveEmployeeWorkload(workload);
}

/**
 * إزالة شكوى من حمل العمل
 */
export function releaseWorkload(employeeId: string, ticketId: string): void {
    const workload = loadEmployeeWorkload();

    if (workload[employeeId]) {
        workload[employeeId].current = Math.max(0, workload[employeeId].current - 1);
        workload[employeeId].assigned = workload[employeeId].assigned.filter(
            id => id !== ticketId
        );

        saveEmployeeWorkload(workload);
    }
}

/**
 * تسجيل التعيين
 */
function logAssignment(result: AssignmentResult): void {
    try {
        const saved = localStorage.getItem(ASSIGNMENT_LOG_KEY);
        const log = saved ? JSON.parse(saved) : [];

        log.push({
            ...result,
            timestamp: Date.now()
        });

        // الحد من حجم السجل
        const trimmed = log.slice(-500);
        localStorage.setItem(ASSIGNMENT_LOG_KEY, JSON.stringify(trimmed));
    } catch {
        // تجاهل
    }
}

/**
 * الحصول على سجل التعيينات
 */
export function getAssignmentLog(): Array<AssignmentResult & { timestamp: number }> {
    try {
        const saved = localStorage.getItem(ASSIGNMENT_LOG_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * إحصائيات التعيين
 */
export function getAssignmentStats(): {
    totalAssigned: number;
    byMethod: Record<string, number>;
    byEmployee: Array<{ id: string; name: string; count: number }>;
    averagePerDay: number;
} {
    const log = getAssignmentLog();
    const workload = loadEmployeeWorkload();

    const byMethod: Record<string, number> = {};
    const byEmployee: Record<string, { name: string; count: number }> = {};

    log.forEach(entry => {
        byMethod[entry.method] = (byMethod[entry.method] || 0) + 1;

        if (!byEmployee[entry.assignedTo]) {
            byEmployee[entry.assignedTo] = { name: entry.assignedToName, count: 0 };
        }
        byEmployee[entry.assignedTo].count++;
    });

    // حساب المتوسط اليومي
    const firstEntry = log[0]?.timestamp;
    const lastEntry = log[log.length - 1]?.timestamp;
    const days = firstEntry && lastEntry
        ? Math.max(1, (lastEntry - firstEntry) / (1000 * 60 * 60 * 24))
        : 1;

    return {
        totalAssigned: log.length,
        byMethod,
        byEmployee: Object.entries(byEmployee)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.count - a.count),
        averagePerDay: log.length / days
    };
}

export default {
    loadConfig,
    saveConfig,
    autoAssignTicket,
    releaseWorkload,
    getAssignmentLog,
    getAssignmentStats
};
