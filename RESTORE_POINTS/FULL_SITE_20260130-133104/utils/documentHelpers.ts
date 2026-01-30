// Utilities extracted from GeneralDiwanPage for filtering, sorting, and statistics.
// This refactor centralizes logic for reuse and testability.

export type MailDirection = 'بريد وارد' | 'بريد صادر';
export type DocType = 'محضر' | 'تقرير' | 'خطاب' | 'تعميم' | 'كتاب رسمي';
export type DocPriority = 'عادي' | 'هام' | 'عاجل' | 'سري';

export interface DiwanDocument {
  id: string;
  title: string;
  type: DocType;
  priority: DocPriority;
  approved: boolean;
  dateISO: string; // ISO date string
  mailDirection: MailDirection;
  [key: string]: any; // allow extra dynamic fields from existing storage
}

export interface FilterParams {
  mailDirectionFilter: 'الكل' | MailDirection;
  filterApproved: 'الكل' | 'معتمد' | 'مسودة';
  filterPrioritySel: 'الكل' | DocPriority;
  filterTypeSel: 'الكل' | DocType;
  searchQuery: string;
  advId: string;
  advTitle: string;
  dateFrom: string; // yyyy-mm-dd or ''
  dateTo: string;   // yyyy-mm-dd or ''
}

export const sortableFields = ['dateISO','id','title','type','priority','approved','mailDirection'] as const;
export type SortableField = typeof sortableFields[number];

export interface SortConfig {
  sortPrimary: SortableField;
  sortPrimaryDir: 'asc' | 'desc';
  sortSecondary: SortableField;
  sortSecondaryDir: 'asc' | 'desc';
}

// Normalization for docs loaded from storage
export function normalizeDocs(raw: any[]): DiwanDocument[] {
  return raw.map(d => ({
    ...d,
    mailDirection: d.mailDirection === 'بريد صادر' ? 'بريد صادر' : 'بريد وارد',
    priority: d.priority || 'عادي'
  }));
}

export function filterDocs(docs: DiwanDocument[], p: FilterParams): DiwanDocument[] {
  const normalizedSearch = p.searchQuery.trim().toLowerCase();
  return docs.filter(d => {
    if (p.mailDirectionFilter !== 'الكل' && d.mailDirection !== p.mailDirectionFilter) return false;
    if (p.filterApproved !== 'الكل') {
      if (p.filterApproved === 'معتمد' && !d.approved) return false;
      if (p.filterApproved === 'مسودة' && d.approved) return false;
    }
    if (p.filterPrioritySel !== 'الكل' && d.priority !== p.filterPrioritySel) return false;
    if (p.filterTypeSel !== 'الكل' && d.type !== p.filterTypeSel) return false;
    if (p.advId && !String(d.id).includes(p.advId.trim())) return false;
    if (p.advTitle && !(d.title || '').includes(p.advTitle.trim())) return false;
    if (p.dateFrom && (!d.dateISO || d.dateISO.slice(0,10) < p.dateFrom)) return false;
    if (p.dateTo && (!d.dateISO || d.dateISO.slice(0,10) > p.dateTo)) return false;
    if (normalizedSearch) {
      const hay = `${d.id} ${d.title} ${d.type} ${d.priority} ${d.mailDirection}`.toLowerCase();
      if (!hay.includes(normalizedSearch)) return false;
    }
    return true;
  });
}

function compareField(field: SortableField, dir: 'asc'|'desc', a: DiwanDocument, b: DiwanDocument): number {
  const av: any = (a as any)[field];
  const bv: any = (b as any)[field];
  let result: number;
  if (av == null && bv != null) result = -1;
  else if (av != null && bv == null) result = 1;
  else if (av == null && bv == null) result = 0;
  else if (field === 'approved') result = (a.approved === b.approved ? 0 : a.approved ? 1 : -1);
  else if (field === 'dateISO') result = new Date(av).getTime() - new Date(bv).getTime();
  else if (typeof av === 'string' && typeof bv === 'string') result = av.localeCompare(bv, 'ar');
  else result = av > bv ? 1 : av < bv ? -1 : 0;
  return dir === 'asc' ? result : -result;
}

export function sortDocs(docs: DiwanDocument[], cfg: SortConfig): DiwanDocument[] {
  return [...docs].sort((a,b) => {
    const primary = compareField(cfg.sortPrimary, cfg.sortPrimaryDir, a, b);
    if (primary !== 0) return primary;
    const secondary = compareField(cfg.sortSecondary, cfg.sortSecondaryDir, a, b);
    if (secondary !== 0) return secondary;
    const dateDiff = new Date(b.dateISO || 0).getTime() - new Date(a.dateISO || 0).getTime();
    if (dateDiff !== 0) return dateDiff;
    return String(a.id).localeCompare(String(b.id), 'ar');
  });
}

export interface StatsResult {
  total: number;
  approved: number;
  byType: Record<DocType, number>;
  byPriority: Record<DocPriority, number>;
  recent: number; // last 7 days
  mailDirectionCounts: { inbound: number; outbound: number; total: number };
}

export function computeStats(allDocs: DiwanDocument[], filterDirection: 'الكل' | MailDirection): StatsResult {
  const docs = allDocs;
  const byType: Record<DocType, number> = { 'محضر':0,'تقرير':0,'خطاب':0,'تعميم':0,'كتاب رسمي':0 };
  const byPriority: Record<DocPriority, number> = { 'عادي':0,'هام':0,'عاجل':0,'سري':0 };
  let approved = 0; let recent = 0; const last7 = Date.now() - 7*24*60*60*1000;
  docs.forEach(d => {
    byType[d.type] = (byType[d.type]||0)+1;
    byPriority[d.priority] = (byPriority[d.priority]||0)+1;
    if (d.approved) approved++;
    if (new Date(d.dateISO).getTime() >= last7) recent++;
  });
  const filtered = docs.filter(d => filterDirection === 'الكل' || d.mailDirection === filterDirection);
  const inbound = docs.filter(d => d.mailDirection === 'بريد وارد').length;
  const outbound = docs.filter(d => d.mailDirection === 'بريد صادر').length;
  return {
    total: filtered.length,
    approved,
    byType,
    byPriority,
    recent,
    mailDirectionCounts: { inbound, outbound, total: docs.length }
  };
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function countsByField(docs: DiwanDocument[], field: keyof DiwanDocument): Array<{ key: string; count: number }> {
  const map: Record<string, number> = {};
  docs.forEach(d => {
    const k = (d[field] as any) || 'غير محدد';
    map[k] = (map[k]||0)+1;
  });
  return Object.entries(map).map(([key,count]) => ({ key, count })).sort((a,b)=>b.count-a.count);
}

export interface ExportRow {
  التسلسل: number;
  الرقم: string;
  العنوان: string;
  النوع: string;
  الأولوية: string;
  معتمدة: string;
  التاريخ: string;
  'نوع البريد': string;
}

export function buildExportRows(docs: DiwanDocument[]): ExportRow[] {
  return docs.map((d,i) => ({
    التسلسل: i+1,
    الرقم: d.id,
    العنوان: d.title,
    النوع: d.type,
    الأولوية: d.priority,
    معتمدة: d.approved ? 'نعم' : 'لا',
    التاريخ: d.dateISO,
    'نوع البريد': d.mailDirection
  }));
}

export function buildStatsSheetData(docs: DiwanDocument[]) {
  const stats: any[] = [];
  stats.push({ الفئة: 'إجمالي', العدد: docs.length });
  const pushSection = (title: string) => stats.push({ الفئة: `--- ${title} ---`, العدد: '' });
  const by = (field: keyof DiwanDocument) => {
    const arr = countsByField(docs, field).map(x => ({ الفئة: field === 'mailDirection' ? (x.key as string).replace('بريد ','') : x.key, العدد: x.count }));
    arr.forEach(r => stats.push(r));
  };
  pushSection('حسب النوع'); by('type');
  pushSection('حسب الأولوية'); by('priority');
  pushSection('حسب نوع البريد'); by('mailDirection');
  return stats;
}
