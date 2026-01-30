// =====================================================
// 🔗 Linked Tickets System
// نظام الشكاوى المرتبطة
// =====================================================

export type LinkType =
    | 'related'      // مرتبطة
    | 'duplicate'    // مكررة
    | 'parent'       // أصلية
    | 'child'        // فرعية
    | 'blocks'       // تعيق
    | 'blocked_by'   // معاقة بواسطة
    | 'follows'      // تتبع
    | 'followed_by'; // متبوعة بواسطة

export interface TicketLink {
    id: string;
    sourceTicketId: string;
    targetTicketId: string;
    linkType: LinkType;
    description?: string;
    createdBy: string;
    createdAt: number;
}

export interface LinkedTicketInfo {
    ticketId: string;
    title: string;
    status: string;
    department: string;
    linkType: LinkType;
    linkDirection: 'outgoing' | 'incoming';
}

const LINKS_KEY = 'ticket-links';

/**
 * تحميل الروابط
 */
function loadLinks(): TicketLink[] {
    try {
        const saved = localStorage.getItem(LINKS_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * حفظ الروابط
 */
function saveLinks(links: TicketLink[]): void {
    localStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

/**
 * إنشاء رابط بين شكويين
 */
export function createLink(
    sourceTicketId: string,
    targetTicketId: string,
    linkType: LinkType,
    createdBy: string,
    description?: string
): TicketLink {
    const links = loadLinks();

    // التحقق من عدم وجود رابط مشابه
    const exists = links.some(
        l => l.sourceTicketId === sourceTicketId &&
            l.targetTicketId === targetTicketId &&
            l.linkType === linkType
    );

    if (exists) {
        throw new Error('الرابط موجود مسبقاً');
    }

    const newLink: TicketLink = {
        id: `link-${Date.now()}`,
        sourceTicketId,
        targetTicketId,
        linkType,
        description,
        createdBy,
        createdAt: Date.now()
    };

    links.push(newLink);

    // إنشاء الرابط العكسي للأنواع ثنائية الاتجاه
    const reverseType = getReverseType(linkType);
    if (reverseType && reverseType !== linkType) {
        links.push({
            id: `link-${Date.now()}-rev`,
            sourceTicketId: targetTicketId,
            targetTicketId: sourceTicketId,
            linkType: reverseType,
            description,
            createdBy,
            createdAt: Date.now()
        });
    }

    saveLinks(links);
    return newLink;
}

/**
 * الحصول على النوع العكسي
 */
function getReverseType(linkType: LinkType): LinkType | null {
    const reverseMap: Record<LinkType, LinkType> = {
        'related': 'related',
        'duplicate': 'duplicate',
        'parent': 'child',
        'child': 'parent',
        'blocks': 'blocked_by',
        'blocked_by': 'blocks',
        'follows': 'followed_by',
        'followed_by': 'follows'
    };

    return reverseMap[linkType] || null;
}

/**
 * حذف رابط
 */
export function deleteLink(linkId: string): boolean {
    const links = loadLinks();
    const link = links.find(l => l.id === linkId);

    if (!link) return false;

    // حذف الرابط والعكسي
    const filtered = links.filter(l => {
        if (l.id === linkId) return false;

        // حذف العكسي
        const reverseType = getReverseType(link.linkType);
        if (reverseType &&
            l.sourceTicketId === link.targetTicketId &&
            l.targetTicketId === link.sourceTicketId &&
            l.linkType === reverseType) {
            return false;
        }

        return true;
    });

    saveLinks(filtered);
    return true;
}

/**
 * الحصول على روابط شكوى
 */
export function getTicketLinks(ticketId: string): TicketLink[] {
    return loadLinks().filter(
        l => l.sourceTicketId === ticketId || l.targetTicketId === ticketId
    );
}

/**
 * الحصول على الشكاوى المرتبطة مع معلوماتها
 */
export function getLinkedTickets(
    ticketId: string,
    tickets: Array<{ id: string; title: string; status: string; department: string }>
): LinkedTicketInfo[] {
    const links = getTicketLinks(ticketId);
    const result: LinkedTicketInfo[] = [];

    links.forEach(link => {
        let linkedTicketId: string;
        let direction: 'outgoing' | 'incoming';
        let effectiveType: LinkType;

        if (link.sourceTicketId === ticketId) {
            linkedTicketId = link.targetTicketId;
            direction = 'outgoing';
            effectiveType = link.linkType;
        } else {
            linkedTicketId = link.sourceTicketId;
            direction = 'incoming';
            effectiveType = getReverseType(link.linkType) || link.linkType;
        }

        const ticket = tickets.find(t => t.id === linkedTicketId);
        if (ticket && !result.some(r => r.ticketId === linkedTicketId)) {
            result.push({
                ticketId: ticket.id,
                title: ticket.title,
                status: ticket.status,
                department: ticket.department,
                linkType: effectiveType,
                linkDirection: direction
            });
        }
    });

    return result;
}

/**
 * الحصول على الشكاوى المكررة
 */
export function getDuplicates(ticketId: string): string[] {
    return loadLinks()
        .filter(l =>
            l.linkType === 'duplicate' &&
            (l.sourceTicketId === ticketId || l.targetTicketId === ticketId)
        )
        .map(l => l.sourceTicketId === ticketId ? l.targetTicketId : l.sourceTicketId);
}

/**
 * الحصول على الشكوى الأصلية
 */
export function getParentTicket(ticketId: string): string | null {
    const link = loadLinks().find(
        l => l.sourceTicketId === ticketId && l.linkType === 'child'
    );

    return link?.targetTicketId || null;
}

/**
 * الحصول على الشكاوى الفرعية
 */
export function getChildTickets(ticketId: string): string[] {
    return loadLinks()
        .filter(l => l.sourceTicketId === ticketId && l.linkType === 'parent')
        .map(l => l.targetTicketId);
}

/**
 * الحصول على الشكاوى المعيقة
 */
export function getBlockingTickets(ticketId: string): string[] {
    return loadLinks()
        .filter(l => l.sourceTicketId === ticketId && l.linkType === 'blocked_by')
        .map(l => l.targetTicketId);
}

/**
 * التحقق من إمكانية إغلاق الشكوى
 */
export function canCloseTicket(
    ticketId: string,
    tickets: Array<{ id: string; status: string }>
): { canClose: boolean; blockers: string[] } {
    const blockingIds = getBlockingTickets(ticketId);
    const blockers = blockingIds.filter(id => {
        const ticket = tickets.find(t => t.id === id);
        return ticket && ticket.status !== 'مغلق' && ticket.status !== 'ملغي';
    });

    return {
        canClose: blockers.length === 0,
        blockers
    };
}

/**
 * دمج شكويين كمكررتين
 */
export function markAsDuplicate(
    duplicateTicketId: string,
    originalTicketId: string,
    createdBy: string
): void {
    createLink(duplicateTicketId, originalTicketId, 'duplicate', createdBy, 'شكوى مكررة');
}

/**
 * إنشاء شكوى فرعية
 */
export function createChildTicket(
    parentTicketId: string,
    childTicketId: string,
    createdBy: string,
    description?: string
): void {
    createLink(parentTicketId, childTicketId, 'parent', createdBy, description);
}

/**
 * الحصول على وصف نوع الرابط
 */
export function getLinkTypeLabel(linkType: LinkType): string {
    const labels: Record<LinkType, string> = {
        'related': 'مرتبطة بـ',
        'duplicate': 'مكررة من',
        'parent': 'أصلية لـ',
        'child': 'فرعية من',
        'blocks': 'تعيق',
        'blocked_by': 'معاقة بواسطة',
        'follows': 'تتبع',
        'followed_by': 'متبوعة بواسطة'
    };

    return labels[linkType] || linkType;
}

/**
 * الحصول على إحصائيات الروابط
 */
export function getLinkStats(): {
    totalLinks: number;
    byType: Record<LinkType, number>;
    mostLinkedTickets: Array<{ ticketId: string; linkCount: number }>;
} {
    const links = loadLinks();
    const stats = {
        totalLinks: links.length,
        byType: {} as Record<LinkType, number>,
        mostLinkedTickets: [] as Array<{ ticketId: string; linkCount: number }>
    };

    const ticketCounts = new Map<string, number>();

    links.forEach(link => {
        stats.byType[link.linkType] = (stats.byType[link.linkType] || 0) + 1;

        ticketCounts.set(
            link.sourceTicketId,
            (ticketCounts.get(link.sourceTicketId) || 0) + 1
        );
    });

    stats.mostLinkedTickets = [...ticketCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ticketId, linkCount]) => ({ ticketId, linkCount }));

    return stats;
}

/**
 * البحث عن شكاوى ذات صلة
 */
export function findRelatedTickets(
    ticketId: string,
    depth: number = 2
): string[] {
    const visited = new Set<string>();
    const related: string[] = [];

    function traverse(id: string, currentDepth: number) {
        if (currentDepth > depth || visited.has(id)) return;

        visited.add(id);

        const links = getTicketLinks(id);
        links.forEach(link => {
            const otherId = link.sourceTicketId === id
                ? link.targetTicketId
                : link.sourceTicketId;

            if (!visited.has(otherId)) {
                related.push(otherId);
                traverse(otherId, currentDepth + 1);
            }
        });
    }

    traverse(ticketId, 0);

    return related.filter(id => id !== ticketId);
}

export default {
    createLink,
    deleteLink,
    getTicketLinks,
    getLinkedTickets,
    getDuplicates,
    getParentTicket,
    getChildTickets,
    getBlockingTickets,
    canCloseTicket,
    markAsDuplicate,
    createChildTicket,
    getLinkTypeLabel,
    getLinkStats,
    findRelatedTickets
};
