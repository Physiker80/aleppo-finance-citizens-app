// =====================================================
// 🔐 Single Sign-On (SSO) Integration
// تكامل تسجيل الدخول الموحد
// =====================================================

export interface SSOConfig {
    provider: SSOProvider;
    clientId: string;
    clientSecret?: string;
    authority: string;
    redirectUri: string;
    scopes: string[];
    isEnabled: boolean;
    allowedDomains?: string[];
    autoProvision: boolean;
    defaultRole: string;
}

export type SSOProvider = 'azure-ad' | 'google' | 'okta' | 'saml' | 'ldap' | 'custom';

export interface SSOUser {
    id: string;
    email: string;
    name: string;
    givenName?: string;
    familyName?: string;
    picture?: string;
    provider: SSOProvider;
    providerUserId: string;
    roles: string[];
    department?: string;
    lastLogin: number;
    createdAt: number;
}

export interface SSOSession {
    id: string;
    userId: string;
    accessToken: string;
    refreshToken?: string;
    idToken?: string;
    expiresAt: number;
    createdAt: number;
}

export interface SAMLConfig {
    entryPoint: string;
    issuer: string;
    cert: string;
    privateKey?: string;
    signatureAlgorithm: 'sha256' | 'sha512';
    identifierFormat: string;
}

export interface LDAPConfig {
    url: string;
    baseDN: string;
    bindDN: string;
    bindCredentials: string;
    searchFilter: string;
    attributes: string[];
}

const CONFIG_KEY = 'sso-config';
const USERS_KEY = 'sso-users';
const SESSIONS_KEY = 'sso-sessions';

// الإعدادات الافتراضية
const DEFAULT_CONFIG: SSOConfig = {
    provider: 'azure-ad',
    clientId: '',
    authority: '',
    redirectUri: window.location.origin + '/auth/callback',
    scopes: ['openid', 'profile', 'email'],
    isEnabled: false,
    autoProvision: true,
    defaultRole: 'موظف'
};

// إعدادات مزودي SSO المعروفين
const PROVIDER_CONFIGS: Record<SSOProvider, Partial<SSOConfig>> = {
    'azure-ad': {
        authority: 'https://login.microsoftonline.com/{tenantId}',
        scopes: ['openid', 'profile', 'email', 'User.Read']
    },
    'google': {
        authority: 'https://accounts.google.com',
        scopes: ['openid', 'profile', 'email']
    },
    'okta': {
        authority: 'https://{domain}.okta.com',
        scopes: ['openid', 'profile', 'email']
    },
    'saml': {},
    'ldap': {},
    'custom': {}
};

/**
 * تحميل الإعدادات
 */
export function loadConfig(): SSOConfig {
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
export function saveConfig(config: Partial<SSOConfig>): void {
    const current = loadConfig();
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...config }));
}

/**
 * الحصول على إعدادات المزود
 */
export function getProviderConfig(provider: SSOProvider): Partial<SSOConfig> {
    return PROVIDER_CONFIGS[provider] || {};
}

/**
 * تحميل المستخدمين
 */
function loadUsers(): SSOUser[] {
    try {
        const saved = localStorage.getItem(USERS_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * حفظ المستخدمين
 */
function saveUsers(users: SSOUser[]): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/**
 * تحميل الجلسات
 */
function loadSessions(): SSOSession[] {
    try {
        const saved = localStorage.getItem(SESSIONS_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * حفظ الجلسات
 */
function saveSessions(sessions: SSOSession[]): void {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

/**
 * إنشاء رابط تسجيل الدخول
 */
export function getLoginUrl(state?: string): string {
    const config = loadConfig();

    if (!config.isEnabled) {
        throw new Error('SSO غير مفعل');
    }

    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: config.scopes.join(' '),
        state: state || generateState()
    });

    // حسب المزود
    switch (config.provider) {
        case 'azure-ad':
            params.set('response_mode', 'fragment');
            return `${config.authority}/oauth2/v2.0/authorize?${params}`;

        case 'google':
            return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

        case 'okta':
            return `${config.authority}/oauth2/v1/authorize?${params}`;

        default:
            return `${config.authority}/authorize?${params}`;
    }
}

/**
 * توليد state
 */
function generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * معالجة رد التوثيق
 */
export async function handleCallback(
    code: string,
    state?: string
): Promise<{ success: boolean; user?: SSOUser; error?: string }> {
    const config = loadConfig();

    try {
        // تبادل الكود بالتوكن (محاكاة)
        const tokens = await exchangeCodeForTokens(code);

        if (!tokens.accessToken) {
            return { success: false, error: 'فشل في الحصول على التوكن' };
        }

        // استخراج معلومات المستخدم
        const userInfo = await getUserInfo(tokens.accessToken);

        // التحقق من النطاق المسموح
        if (config.allowedDomains?.length) {
            const domain = userInfo.email.split('@')[1];
            if (!config.allowedDomains.includes(domain)) {
                return { success: false, error: 'نطاق البريد غير مسموح' };
            }
        }

        // إنشاء أو تحديث المستخدم
        const user = await provisionUser(userInfo, config);

        // إنشاء جلسة
        createSession(user.id, tokens);

        return { success: true, user };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

/**
 * تبادل الكود بالتوكن (محاكاة)
 */
async function exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    idToken?: string;
    expiresIn: number;
}> {
    // في الإنتاج، سيتم الاتصال بخادم المصادقة
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
        accessToken: `at_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        refreshToken: `rt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        idToken: `it_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        expiresIn: 3600
    };
}

/**
 * الحصول على معلومات المستخدم (محاكاة)
 */
async function getUserInfo(accessToken: string): Promise<{
    sub: string;
    email: string;
    name: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
}> {
    // في الإنتاج، سيتم الاتصال بـ userinfo endpoint
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
        sub: `user_${Date.now()}`,
        email: 'user@example.com',
        name: 'مستخدم النظام',
        given_name: 'مستخدم',
        family_name: 'النظام'
    };
}

/**
 * إنشاء أو تحديث المستخدم
 */
async function provisionUser(
    userInfo: { sub: string; email: string; name: string; given_name?: string; family_name?: string; picture?: string },
    config: SSOConfig
): Promise<SSOUser> {
    const users = loadUsers();
    let user = users.find(u => u.providerUserId === userInfo.sub);

    if (user) {
        // تحديث المستخدم
        user.name = userInfo.name;
        user.givenName = userInfo.given_name;
        user.familyName = userInfo.family_name;
        user.picture = userInfo.picture;
        user.lastLogin = Date.now();
    } else if (config.autoProvision) {
        // إنشاء مستخدم جديد
        user = {
            id: `sso-${Date.now()}`,
            email: userInfo.email,
            name: userInfo.name,
            givenName: userInfo.given_name,
            familyName: userInfo.family_name,
            picture: userInfo.picture,
            provider: config.provider,
            providerUserId: userInfo.sub,
            roles: [config.defaultRole],
            lastLogin: Date.now(),
            createdAt: Date.now()
        };
        users.push(user);
    } else {
        throw new Error('المستخدم غير مسجل والتسجيل التلقائي معطل');
    }

    saveUsers(users);
    return user;
}

/**
 * إنشاء جلسة
 */
function createSession(
    userId: string,
    tokens: { accessToken: string; refreshToken?: string; idToken?: string; expiresIn: number }
): SSOSession {
    const sessions = loadSessions();

    // إلغاء الجلسات السابقة للمستخدم
    const activeSessions = sessions.filter(s => s.userId !== userId);

    const session: SSOSession = {
        id: `session-${Date.now()}`,
        userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        idToken: tokens.idToken,
        expiresAt: Date.now() + tokens.expiresIn * 1000,
        createdAt: Date.now()
    };

    activeSessions.push(session);
    saveSessions(activeSessions);

    return session;
}

/**
 * الحصول على الجلسة الحالية
 */
export function getCurrentSession(): SSOSession | null {
    const sessions = loadSessions();
    const valid = sessions.find(s => s.expiresAt > Date.now());

    return valid || null;
}

/**
 * الحصول على المستخدم الحالي
 */
export function getCurrentUser(): SSOUser | null {
    const session = getCurrentSession();
    if (!session) return null;

    const users = loadUsers();
    return users.find(u => u.id === session.userId) || null;
}

/**
 * تسجيل الخروج
 */
export function logout(): void {
    const session = getCurrentSession();

    if (session) {
        const sessions = loadSessions();
        const filtered = sessions.filter(s => s.id !== session.id);
        saveSessions(filtered);
    }

    // مسح الجلسة من localStorage الرئيسي
    localStorage.removeItem('currentUser');
}

/**
 * تسجيل الخروج الموحد
 */
export function getSingleLogoutUrl(): string {
    const config = loadConfig();

    switch (config.provider) {
        case 'azure-ad':
            return `${config.authority}/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;

        case 'google':
            return 'https://accounts.google.com/Logout';

        case 'okta':
            return `${config.authority}/oauth2/v1/logout?id_token_hint=${getCurrentSession()?.idToken}`;

        default:
            return window.location.origin;
    }
}

/**
 * تجديد التوكن
 */
export async function refreshToken(): Promise<boolean> {
    const session = getCurrentSession();

    if (!session?.refreshToken) return false;

    try {
        // محاكاة تجديد التوكن
        const newTokens = await exchangeRefreshToken(session.refreshToken);

        const sessions = loadSessions();
        const index = sessions.findIndex(s => s.id === session.id);

        if (index !== -1) {
            sessions[index].accessToken = newTokens.accessToken;
            sessions[index].refreshToken = newTokens.refreshToken;
            sessions[index].expiresAt = Date.now() + newTokens.expiresIn * 1000;
            saveSessions(sessions);
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * تجديد التوكن (محاكاة)
 */
async function exchangeRefreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}> {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
        accessToken: `at_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        refreshToken: `rt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        expiresIn: 3600
    };
}

/**
 * مزامنة المستخدمين
 */
export async function syncUsers(): Promise<{
    added: number;
    updated: number;
    errors: string[];
}> {
    // في الإنتاج، سيتم مزامنة المستخدمين من مزود الهوية
    return {
        added: 0,
        updated: 0,
        errors: []
    };
}

/**
 * إحصائيات SSO
 */
export function getSSOStats(): {
    totalUsers: number;
    activeUsers: number;
    byProvider: Record<SSOProvider, number>;
    loginsByDay: Array<{ date: string; count: number }>;
} {
    const users = loadUsers();
    const sessions = loadSessions();

    const activeUserIds = new Set(
        sessions.filter(s => s.expiresAt > Date.now()).map(s => s.userId)
    );

    const byProvider: Record<SSOProvider, number> = {
        'azure-ad': 0,
        'google': 0,
        'okta': 0,
        'saml': 0,
        'ldap': 0,
        'custom': 0
    };

    users.forEach(u => {
        byProvider[u.provider] = (byProvider[u.provider] || 0) + 1;
    });

    // تجميع تسجيلات الدخول حسب اليوم
    const loginsByDay = new Map<string, number>();
    users.forEach(u => {
        const date = new Date(u.lastLogin).toISOString().split('T')[0];
        loginsByDay.set(date, (loginsByDay.get(date) || 0) + 1);
    });

    return {
        totalUsers: users.length,
        activeUsers: activeUserIds.size,
        byProvider,
        loginsByDay: [...loginsByDay.entries()]
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-30)
    };
}

export default {
    loadConfig,
    saveConfig,
    getProviderConfig,
    getLoginUrl,
    handleCallback,
    getCurrentSession,
    getCurrentUser,
    logout,
    getSingleLogoutUrl,
    refreshToken,
    syncUsers,
    getSSOStats
};
