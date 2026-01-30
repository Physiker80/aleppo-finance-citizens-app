// =====================================================
// 📦 Archive System
// نظام الأرشفة
// =====================================================

export interface ArchiveConfig {
    autoArchiveDays: number;
    retentionYears: number;
    compressArchives: boolean;
    encryptArchives: boolean;
    archiveLocation: 'local' | 'cloud' | 'both';
    notifyBeforeArchive: boolean;
    notifyDaysBefore: number;
}

export interface ArchivedTicket {
    id: string;
    originalId: string;
    data: TicketData;
    attachments: ArchiveAttachment[];
    responses: ArchiveResponse[];
    archivedAt: number;
    archivedBy: string;
    reason: ArchiveReason;
    expiresAt?: number;
    tags: string[];
    searchIndex: string;
}

export interface TicketData {
    title: string;
    description: string;
    department: string;
    status: string;
    priority: string;
    citizenName: string;
    phone?: string;
    nationalId?: string;
    createdAt: number;
    closedAt?: number;
    assignedTo?: string;
    category?: string;
}

export interface ArchiveAttachment {
    id: string;
    name: string;
    type: string;
    size: number;
    data?: string; // Base64 encoded
    url?: string;
}

export interface ArchiveResponse {
    id: string;
    content: string;
    createdBy: string;
    createdAt: number;
}

export type ArchiveReason =
    | 'auto'          // أرشفة تلقائية
    | 'manual'        // أرشفة يدوية
    | 'closed'        // شكوى مغلقة
    | 'duplicate'     // شكوى مكررة
    | 'expired'       // انتهت فترة الاحتفاظ
    | 'migration';    // نقل البيانات

export interface ArchiveStats {
    totalArchived: number;
    byDepartment: Record<string, number>;
    byReason: Record<ArchiveReason, number>;
    byYear: Record<string, number>;
    totalSize: number;
    oldestArchive: number;
    newestArchive: number;
}

const CONFIG_KEY = 'archive-config';
const ARCHIVE_KEY = 'archived-tickets';

// الإعدادات الافتراضية
const DEFAULT_CONFIG: ArchiveConfig = {
    autoArchiveDays: 90,
    retentionYears: 7,
    compressArchives: true,
    encryptArchives: false,
    archiveLocation: 'local',
    notifyBeforeArchive: true,
    notifyDaysBefore: 7
};

/**
 * تحميل الإعدادات
 */
export function loadConfig(): ArchiveConfig {
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
export function saveConfig(config: Partial<ArchiveConfig>): void {
    const current = loadConfig();
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...config }));
}

/**
 * تحميل الأرشيف
 */
function loadArchive(): ArchivedTicket[] {
    try {
        const saved = localStorage.getItem(ARCHIVE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * حفظ الأرشيف
 */
function saveArchive(archive: ArchivedTicket[]): void {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
}

/**
 * إنشاء فهرس البحث
 */
function createSearchIndex(ticket: TicketData): string {
    return [
        ticket.title,
        ticket.description,
        ticket.citizenName,
        ticket.department,
        ticket.category || ''
    ].join(' ').toLowerCase();
}

/**
 * أرشفة شكوى
 */
export function archiveTicket(
    ticket: TicketData & { id: string },
    attachments: ArchiveAttachment[] = [],
    responses: ArchiveResponse[] = [],
    archivedBy: string,
    reason: ArchiveReason = 'manual',
    tags: string[] = []
): ArchivedTicket {
    const config = loadConfig();
    const archive = loadArchive();

    // التحقق من عدم وجود أرشفة سابقة
    if (archive.some(a => a.originalId === ticket.id)) {
        throw new Error('الشكوى مؤرشفة مسبقاً');
    }

    const archived: ArchivedTicket = {
        id: `arc-${Date.now()}`,
        originalId: ticket.id,
        data: {
            title: ticket.title,
            description: ticket.description,
            department: ticket.department,
            status: ticket.status,
            priority: ticket.priority || 'medium',
            citizenName: ticket.citizenName,
            phone: ticket.phone,
            nationalId: ticket.nationalId,
            createdAt: ticket.createdAt,
            closedAt: ticket.closedAt,
            assignedTo: ticket.assignedTo,
            category: ticket.category
        },
        attachments,
        responses,
        archivedAt: Date.now(),
        archivedBy,
        reason,
        expiresAt: Date.now() + config.retentionYears * 365 * 24 * 60 * 60 * 1000,
        tags,
        searchIndex: createSearchIndex(ticket)
    };

    archive.push(archived);
    saveArchive(archive);

    return archived;
}

/**
 * أرشفة متعددة
 */
export function archiveMultiple(
    tickets: Array<TicketData & { id: string }>,
    archivedBy: string,
    reason: ArchiveReason = 'auto'
): { success: number; failed: number; errors: string[] } {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    tickets.forEach(ticket => {
        try {
            archiveTicket(ticket, [], [], archivedBy, reason);
            results.success++;
        } catch (error) {
            results.failed++;
            results.errors.push(`${ticket.id}: ${error}`);
        }
    });

    return results;
}

/**
 * استرجاع من الأرشيف
 */
export function restoreFromArchive(
    archiveId: string
): TicketData & { id: string } | null {
    const archive = loadArchive();
    const index = archive.findIndex(a => a.id === archiveId);

    if (index === -1) return null;

    const archived = archive[index];

    // حذف من الأرشيف
    archive.splice(index, 1);
    saveArchive(archive);

    return {
        id: archived.originalId,
        ...archived.data
    };
}

/**
 * البحث في الأرشيف
 */
export function searchArchive(
    query: string,
    filters?: {
        department?: string;
        dateFrom?: Date;
        dateTo?: Date;
        reason?: ArchiveReason;
        tags?: string[];
    }
): ArchivedTicket[] {
    let results = loadArchive();
    const lowerQuery = query.toLowerCase();

    // البحث النصي
    if (query) {
        results = results.filter(a =>
            a.searchIndex.includes(lowerQuery) ||
            a.originalId.includes(lowerQuery)
        );
    }

    // التصفية
    if (filters) {
        if (filters.department) {
            results = results.filter(a => a.data.department === filters.department);
        }

        if (filters.dateFrom) {
            results = results.filter(a => a.archivedAt >= filters.dateFrom!.getTime());
        }

        if (filters.dateTo) {
            results = results.filter(a => a.archivedAt <= filters.dateTo!.getTime());
        }

        if (filters.reason) {
            results = results.filter(a => a.reason === filters.reason);
        }

        if (filters.tags?.length) {
            results = results.filter(a =>
                filters.tags!.some(tag => a.tags.includes(tag))
            );
        }
    }

    return results.sort((a, b) => b.archivedAt - a.archivedAt);
}

/**
 * الحصول على شكوى مؤرشفة
 */
export function getArchivedTicket(archiveId: string): ArchivedTicket | null {
    const archive = loadArchive();
    return archive.find(a => a.id === archiveId) || null;
}

/**
 * حذف نهائي من الأرشيف
 */
export function permanentlyDelete(archiveId: string): boolean {
    const archive = loadArchive();
    const filtered = archive.filter(a => a.id !== archiveId);

    if (filtered.length === archive.length) return false;

    saveArchive(filtered);
    return true;
}

/**
 * تنظيف الأرشيفات المنتهية
 */
export function cleanupExpired(): {
    deleted: number;
    freedSpace: number;
} {
    const archive = loadArchive();
    const now = Date.now();

    const expired = archive.filter(a => a.expiresAt && a.expiresAt < now);
    const remaining = archive.filter(a => !a.expiresAt || a.expiresAt >= now);

    const freedSpace = expired.reduce((sum, a) => {
        return sum + JSON.stringify(a).length;
    }, 0);

    saveArchive(remaining);

    return {
        deleted: expired.length,
        freedSpace
    };
}

/**
 * الحصول على الشكاوى المستحقة للأرشفة
 */
export function getTicketsDueForArchive(
    tickets: Array<TicketData & { id: string; closedAt?: number }>
): Array<TicketData & { id: string }> {
    const config = loadConfig();
    const cutoff = Date.now() - config.autoArchiveDays * 24 * 60 * 60 * 1000;
    const archive = loadArchive();
    const archivedIds = new Set(archive.map(a => a.originalId));

    return tickets.filter(t => {
        if (archivedIds.has(t.id)) return false;
        if (t.status !== 'مغلق') return false;
        if (!t.closedAt) return false;

        return t.closedAt < cutoff;
    });
}

/**
 * الحصول على الشكاوى القريبة من الأرشفة
 */
export function getTicketsNearArchive(
    tickets: Array<TicketData & { id: string; closedAt?: number }>
): Array<{ ticket: TicketData & { id: string }; daysRemaining: number }> {
    const config = loadConfig();
    const archiveCutoff = Date.now() - config.autoArchiveDays * 24 * 60 * 60 * 1000;
    const notifyCutoff = archiveCutoff + config.notifyDaysBefore * 24 * 60 * 60 * 1000;
    const archive = loadArchive();
    const archivedIds = new Set(archive.map(a => a.originalId));

    return tickets
        .filter(t => {
            if (archivedIds.has(t.id)) return false;
            if (t.status !== 'مغلق') return false;
            if (!t.closedAt) return false;

            return t.closedAt < notifyCutoff && t.closedAt >= archiveCutoff;
        })
        .map(ticket => {
            const daysUntilArchive = Math.ceil(
                (ticket.closedAt! + config.autoArchiveDays * 24 * 60 * 60 * 1000 - Date.now()) /
                (24 * 60 * 60 * 1000)
            );

            return { ticket, daysRemaining: daysUntilArchive };
        });
}

/**
 * إضافة وسوم للأرشيف
 */
export function addTagsToArchive(archiveId: string, tags: string[]): boolean {
    const archive = loadArchive();
    const item = archive.find(a => a.id === archiveId);

    if (!item) return false;

    item.tags = [...new Set([...item.tags, ...tags])];
    saveArchive(archive);

    return true;
}

/**
 * إزالة وسوم من الأرشيف
 */
export function removeTagsFromArchive(archiveId: string, tags: string[]): boolean {
    const archive = loadArchive();
    const item = archive.find(a => a.id === archiveId);

    if (!item) return false;

    item.tags = item.tags.filter(t => !tags.includes(t));
    saveArchive(archive);

    return true;
}

/**
 * تصدير الأرشيف
 */
export function exportArchive(
    archiveIds?: string[]
): string {
    let archive = loadArchive();

    if (archiveIds?.length) {
        archive = archive.filter(a => archiveIds.includes(a.id));
    }

    return JSON.stringify(archive, null, 2);
}

/**
 * استيراد أرشيف
 */
export function importArchive(
    jsonData: string
): { success: number; skipped: number; errors: string[] } {
    const results = { success: 0, skipped: 0, errors: [] as string[] };

    try {
        const imported = JSON.parse(jsonData);

        if (!Array.isArray(imported)) {
            return { success: 0, skipped: 0, errors: ['البيانات غير صالحة'] };
        }

        const archive = loadArchive();
        const existingIds = new Set(archive.map(a => a.id));

        imported.forEach((item, index) => {
            try {
                if (existingIds.has(item.id)) {
                    results.skipped++;
                    return;
                }

                // التحقق من البيانات الأساسية
                if (!item.data?.title || !item.originalId) {
                    results.errors.push(`عنصر ${index + 1}: بيانات ناقصة`);
                    return;
                }

                archive.push({
                    ...item,
                    searchIndex: item.searchIndex || createSearchIndex(item.data)
                });
                results.success++;
            } catch (error) {
                results.errors.push(`عنصر ${index + 1}: ${error}`);
            }
        });

        saveArchive(archive);
    } catch (error) {
        results.errors.push(`فشل في قراءة البيانات: ${error}`);
    }

    return results;
}

/**
 * إحصائيات الأرشيف
 */
export function getArchiveStats(): ArchiveStats {
    const archive = loadArchive();

    const stats: ArchiveStats = {
        totalArchived: archive.length,
        byDepartment: {},
        byReason: {
            auto: 0,
            manual: 0,
            closed: 0,
            duplicate: 0,
            expired: 0,
            migration: 0
        },
        byYear: {},
        totalSize: 0,
        oldestArchive: 0,
        newestArchive: 0
    };

    if (archive.length === 0) return stats;

    stats.oldestArchive = Math.min(...archive.map(a => a.archivedAt));
    stats.newestArchive = Math.max(...archive.map(a => a.archivedAt));
    stats.totalSize = JSON.stringify(archive).length;

    archive.forEach(a => {
        // حسب القسم
        stats.byDepartment[a.data.department] =
            (stats.byDepartment[a.data.department] || 0) + 1;

        // حسب السبب
        stats.byReason[a.reason]++;

        // حسب السنة
        const year = new Date(a.archivedAt).getFullYear().toString();
        stats.byYear[year] = (stats.byYear[year] || 0) + 1;
    });

    return stats;
}

/**
 * الحصول على الوسوم المستخدمة
 */
export function getUsedTags(): Array<{ tag: string; count: number }> {
    const archive = loadArchive();
    const tagCounts = new Map<string, number>();

    archive.forEach(a => {
        a.tags.forEach(tag => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
    });

    return [...tagCounts.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
}

export default {
    loadConfig,
    saveConfig,
    archiveTicket,
    archiveMultiple,
    restoreFromArchive,
    searchArchive,
    getArchivedTicket,
    permanentlyDelete,
    cleanupExpired,
    getTicketsDueForArchive,
    getTicketsNearArchive,
    addTagsToArchive,
    removeTagsFromArchive,
    exportArchive,
    importArchive,
    getArchiveStats,
    getUsedTags
};
