// =====================================================
// 🔌 API Gateway
// بوابة API
// =====================================================

export interface APIConfig {
    baseUrl: string;
    apiKey: string;
    version: string;
    timeout: number;
    retryAttempts: number;
    rateLimitPerMinute: number;
    isEnabled: boolean;
}

export interface APIClient {
    id: string;
    name: string;
    apiKey: string;
    secretKey: string;
    permissions: string[];
    rateLimit: number;
    isActive: boolean;
    createdAt: number;
    lastUsedAt?: number;
    usageCount: number;
}

export interface APIRequest {
    id: string;
    clientId: string;
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers: Record<string, string>;
    body?: unknown;
    timestamp: number;
    responseTime?: number;
    statusCode?: number;
    error?: string;
}

export interface APIEndpoint {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    description: string;
    requiredPermissions: string[];
    rateLimit?: number;
    parameters?: APIParameter[];
    responseSchema?: Record<string, unknown>;
}

export interface APIParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    description: string;
    location: 'path' | 'query' | 'body';
    defaultValue?: unknown;
}

const CONFIG_KEY = 'api-gateway-config';
const CLIENTS_KEY = 'api-clients';
const REQUESTS_KEY = 'api-requests';

// نقاط النهاية المتاحة
const AVAILABLE_ENDPOINTS: APIEndpoint[] = [
    {
        path: '/tickets',
        method: 'GET',
        description: 'الحصول على قائمة الشكاوى',
        requiredPermissions: ['tickets:read'],
        parameters: [
            { name: 'page', type: 'number', required: false, description: 'رقم الصفحة', location: 'query', defaultValue: 1 },
            { name: 'limit', type: 'number', required: false, description: 'عدد النتائج', location: 'query', defaultValue: 20 },
            { name: 'status', type: 'string', required: false, description: 'تصفية حسب الحالة', location: 'query' },
            { name: 'department', type: 'string', required: false, description: 'تصفية حسب القسم', location: 'query' }
        ]
    },
    {
        path: '/tickets/:id',
        method: 'GET',
        description: 'الحصول على تفاصيل شكوى',
        requiredPermissions: ['tickets:read'],
        parameters: [
            { name: 'id', type: 'string', required: true, description: 'معرف الشكوى', location: 'path' }
        ]
    },
    {
        path: '/tickets',
        method: 'POST',
        description: 'إنشاء شكوى جديدة',
        requiredPermissions: ['tickets:create'],
        parameters: [
            { name: 'title', type: 'string', required: true, description: 'عنوان الشكوى', location: 'body' },
            { name: 'description', type: 'string', required: true, description: 'تفاصيل الشكوى', location: 'body' },
            { name: 'department', type: 'string', required: true, description: 'القسم المختص', location: 'body' },
            { name: 'citizenName', type: 'string', required: true, description: 'اسم المواطن', location: 'body' },
            { name: 'phone', type: 'string', required: false, description: 'رقم الهاتف', location: 'body' }
        ]
    },
    {
        path: '/tickets/:id',
        method: 'PUT',
        description: 'تحديث شكوى',
        requiredPermissions: ['tickets:update'],
        parameters: [
            { name: 'id', type: 'string', required: true, description: 'معرف الشكوى', location: 'path' },
            { name: 'status', type: 'string', required: false, description: 'الحالة الجديدة', location: 'body' },
            { name: 'response', type: 'string', required: false, description: 'الرد على الشكوى', location: 'body' }
        ]
    },
    {
        path: '/tickets/:id/responses',
        method: 'POST',
        description: 'إضافة رد على شكوى',
        requiredPermissions: ['tickets:respond'],
        parameters: [
            { name: 'id', type: 'string', required: true, description: 'معرف الشكوى', location: 'path' },
            { name: 'content', type: 'string', required: true, description: 'محتوى الرد', location: 'body' }
        ]
    },
    {
        path: '/departments',
        method: 'GET',
        description: 'الحصول على قائمة الأقسام',
        requiredPermissions: ['departments:read']
    },
    {
        path: '/statistics',
        method: 'GET',
        description: 'الحصول على الإحصائيات',
        requiredPermissions: ['statistics:read'],
        parameters: [
            { name: 'startDate', type: 'string', required: false, description: 'تاريخ البداية', location: 'query' },
            { name: 'endDate', type: 'string', required: false, description: 'تاريخ النهاية', location: 'query' }
        ]
    }
];

// الصلاحيات المتاحة
const AVAILABLE_PERMISSIONS = [
    'tickets:read',
    'tickets:create',
    'tickets:update',
    'tickets:respond',
    'tickets:delete',
    'departments:read',
    'statistics:read',
    'users:read',
    'admin:full'
];

// الإعدادات الافتراضية
const DEFAULT_CONFIG: APIConfig = {
    baseUrl: '/api/v1',
    apiKey: '',
    version: '1.0.0',
    timeout: 30000,
    retryAttempts: 3,
    rateLimitPerMinute: 60,
    isEnabled: false
};

/**
 * تحميل الإعدادات
 */
export function loadConfig(): APIConfig {
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
export function saveConfig(config: Partial<APIConfig>): void {
    const current = loadConfig();
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...config }));
}

/**
 * تحميل العملاء
 */
export function loadClients(): APIClient[] {
    try {
        const saved = localStorage.getItem(CLIENTS_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * حفظ العملاء
 */
function saveClients(clients: APIClient[]): void {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
}

/**
 * توليد مفتاح API
 */
function generateAPIKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'ak_';
    for (let i = 0; i < 32; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

/**
 * توليد مفتاح سري
 */
function generateSecretKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'sk_';
    for (let i = 0; i < 48; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

/**
 * إنشاء عميل API
 */
export function createClient(
    name: string,
    permissions: string[]
): APIClient {
    const clients = loadClients();

    const client: APIClient = {
        id: `client-${Date.now()}`,
        name,
        apiKey: generateAPIKey(),
        secretKey: generateSecretKey(),
        permissions,
        rateLimit: 60,
        isActive: true,
        createdAt: Date.now(),
        usageCount: 0
    };

    clients.push(client);
    saveClients(clients);

    return client;
}

/**
 * تحديث عميل
 */
export function updateClient(
    id: string,
    updates: Partial<Pick<APIClient, 'name' | 'permissions' | 'rateLimit' | 'isActive'>>
): APIClient | null {
    const clients = loadClients();
    const index = clients.findIndex(c => c.id === id);

    if (index === -1) return null;

    clients[index] = { ...clients[index], ...updates };
    saveClients(clients);

    return clients[index];
}

/**
 * تجديد مفاتيح العميل
 */
export function regenerateClientKeys(id: string): APIClient | null {
    const clients = loadClients();
    const client = clients.find(c => c.id === id);

    if (!client) return null;

    client.apiKey = generateAPIKey();
    client.secretKey = generateSecretKey();

    saveClients(clients);
    return client;
}

/**
 * حذف عميل
 */
export function deleteClient(id: string): boolean {
    const clients = loadClients();
    const filtered = clients.filter(c => c.id !== id);

    if (filtered.length === clients.length) return false;

    saveClients(filtered);
    return true;
}

/**
 * التحقق من المفتاح
 */
export function validateAPIKey(apiKey: string): APIClient | null {
    const clients = loadClients();
    return clients.find(c => c.apiKey === apiKey && c.isActive) || null;
}

/**
 * التحقق من الصلاحيات
 */
export function checkPermission(
    client: APIClient,
    requiredPermission: string
): boolean {
    if (client.permissions.includes('admin:full')) return true;
    return client.permissions.includes(requiredPermission);
}

/**
 * تحميل الطلبات
 */
function loadRequests(): APIRequest[] {
    try {
        const saved = localStorage.getItem(REQUESTS_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * حفظ الطلبات
 */
function saveRequests(requests: APIRequest[]): void {
    // الحد من حجم السجل
    const trimmed = requests.slice(-1000);
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(trimmed));
}

/**
 * تسجيل طلب API
 */
export function logRequest(request: APIRequest): void {
    const requests = loadRequests();
    requests.push(request);
    saveRequests(requests);

    // تحديث استخدام العميل
    const clients = loadClients();
    const client = clients.find(c => c.id === request.clientId);
    if (client) {
        client.usageCount++;
        client.lastUsedAt = Date.now();
        saveClients(clients);
    }
}

/**
 * فحص معدل الطلبات
 */
export function checkRateLimit(clientId: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
} {
    const clients = loadClients();
    const client = clients.find(c => c.id === clientId);

    if (!client) {
        return { allowed: false, remaining: 0, resetAt: Date.now() };
    }

    const requests = loadRequests();
    const oneMinuteAgo = Date.now() - 60000;

    const recentRequests = requests.filter(
        r => r.clientId === clientId && r.timestamp > oneMinuteAgo
    );

    const remaining = Math.max(0, client.rateLimit - recentRequests.length);

    return {
        allowed: remaining > 0,
        remaining,
        resetAt: oneMinuteAgo + 60000
    };
}

/**
 * الحصول على نقاط النهاية
 */
export function getEndpoints(): APIEndpoint[] {
    return AVAILABLE_ENDPOINTS;
}

/**
 * الحصول على الصلاحيات
 */
export function getPermissions(): string[] {
    return AVAILABLE_PERMISSIONS;
}

/**
 * معالجة طلب API (محاكاة)
 */
export async function handleAPIRequest(
    apiKey: string,
    endpoint: string,
    method: string,
    body?: unknown
): Promise<{ statusCode: number; data?: unknown; error?: string }> {
    const startTime = Date.now();

    // التحقق من المفتاح
    const client = validateAPIKey(apiKey);
    if (!client) {
        return { statusCode: 401, error: 'مفتاح API غير صالح' };
    }

    // فحص معدل الطلبات
    const rateLimit = checkRateLimit(client.id);
    if (!rateLimit.allowed) {
        return { statusCode: 429, error: 'تجاوز معدل الطلبات المسموح' };
    }

    // البحث عن نقطة النهاية
    const endpointDef = AVAILABLE_ENDPOINTS.find(
        e => matchEndpoint(endpoint, e.path) && e.method === method
    );

    if (!endpointDef) {
        return { statusCode: 404, error: 'نقطة النهاية غير موجودة' };
    }

    // التحقق من الصلاحيات
    const hasPermission = endpointDef.requiredPermissions.every(
        p => checkPermission(client, p)
    );

    if (!hasPermission) {
        return { statusCode: 403, error: 'صلاحيات غير كافية' };
    }

    // تسجيل الطلب
    logRequest({
        id: `req-${Date.now()}`,
        clientId: client.id,
        endpoint,
        method: method as APIRequest['method'],
        headers: {},
        body,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        statusCode: 200
    });

    // إرجاع استجابة محاكاة
    return {
        statusCode: 200,
        data: { success: true, message: 'تم تنفيذ الطلب بنجاح' }
    };
}

/**
 * مطابقة نقطة النهاية
 */
function matchEndpoint(actual: string, pattern: string): boolean {
    const actualParts = actual.split('/');
    const patternParts = pattern.split('/');

    if (actualParts.length !== patternParts.length) return false;

    return patternParts.every((part, i) => {
        if (part.startsWith(':')) return true;
        return part === actualParts[i];
    });
}

/**
 * إحصائيات API
 */
export function getAPIStats(): {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    byEndpoint: Record<string, number>;
    byClient: Array<{ id: string; name: string; count: number }>;
    byDay: Array<{ date: string; count: number }>;
} {
    const requests = loadRequests();
    const clients = loadClients();

    const successful = requests.filter(r => r.statusCode && r.statusCode < 400);
    const totalResponseTime = requests.reduce((sum, r) => sum + (r.responseTime || 0), 0);

    const byEndpoint: Record<string, number> = {};
    const byClientId: Record<string, number> = {};
    const byDay = new Map<string, number>();

    requests.forEach(r => {
        byEndpoint[r.endpoint] = (byEndpoint[r.endpoint] || 0) + 1;
        byClientId[r.clientId] = (byClientId[r.clientId] || 0) + 1;

        const date = new Date(r.timestamp).toISOString().split('T')[0];
        byDay.set(date, (byDay.get(date) || 0) + 1);
    });

    return {
        totalRequests: requests.length,
        successRate: requests.length > 0 ? successful.length / requests.length : 0,
        averageResponseTime: requests.length > 0 ? totalResponseTime / requests.length : 0,
        byEndpoint,
        byClient: Object.entries(byClientId)
            .map(([id, count]) => {
                const client = clients.find(c => c.id === id);
                return { id, name: client?.name || 'غير معروف', count };
            })
            .sort((a, b) => b.count - a.count),
        byDay: [...byDay.entries()]
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-30)
    };
}

/**
 * توليد وثائق API
 */
export function generateAPIDocumentation(): string {
    let doc = '# API Documentation\n\n';
    doc += `## Base URL: ${loadConfig().baseUrl}\n\n`;
    doc += '## Authentication\n';
    doc += 'Include your API key in the header: `X-API-Key: your_api_key`\n\n';
    doc += '## Endpoints\n\n';

    AVAILABLE_ENDPOINTS.forEach(endpoint => {
        doc += `### ${endpoint.method} ${endpoint.path}\n`;
        doc += `${endpoint.description}\n\n`;
        doc += `**Required Permissions:** ${endpoint.requiredPermissions.join(', ')}\n\n`;

        if (endpoint.parameters?.length) {
            doc += '**Parameters:**\n';
            endpoint.parameters.forEach(param => {
                doc += `- \`${param.name}\` (${param.type}, ${param.required ? 'required' : 'optional'}): ${param.description}\n`;
            });
            doc += '\n';
        }
    });

    return doc;
}

export default {
    loadConfig,
    saveConfig,
    loadClients,
    createClient,
    updateClient,
    regenerateClientKeys,
    deleteClient,
    validateAPIKey,
    checkPermission,
    checkRateLimit,
    getEndpoints,
    getPermissions,
    handleAPIRequest,
    getAPIStats,
    generateAPIDocumentation
};
