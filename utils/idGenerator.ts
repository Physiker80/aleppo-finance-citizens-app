// مولد معرفات التذاكر - قابل للتعديل يدوياً
// يمكنك تعديل الدالة أو ضبط الإعدادات عبر localStorage بالمفتاح: ticketIdConfig
// مثال تخزين إعداد مخصص في المتصفح:
// localStorage.setItem('ticketIdConfig', JSON.stringify({ prefix: 'ALF', pattern: '{PREFIX}-{DATE}-{SEQ3}-{RAND4}', seqDigits: 3, randomLength: 4 }))

export interface TicketIdConfig {
  prefix: string;              // البادئة الثابتة
  pattern: string;             // قالب التوليد
  seqDigits: number;           // عدد أرقام التسلسل اليومي (مع أصفار بادئة)
  randomLength: number;        // طول الجزء العشوائي (A-Z0-9)
  dateFormat?: 'YYYYMMDD' | 'YYMMDD';
}

const DEFAULT_CONFIG: TicketIdConfig = {
  prefix: 'ALF',
  pattern: '{PREFIX}-{DATE}-{RAND6}',
  seqDigits: 3,
  randomLength: 6,
  dateFormat: 'YYYYMMDD',
};

function loadConfig(): TicketIdConfig {
  try {
    const raw = localStorage.getItem('ticketIdConfig');
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch { return DEFAULT_CONFIG; }
}

function saveSeq(dateKey: string, seq: number) {
  try { localStorage.setItem('ticketSeq', JSON.stringify({ date: dateKey, seq })); } catch {}
}
function loadSeq(dateKey: string): number {
  try {
    const raw = localStorage.getItem('ticketSeq');
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (parsed.date === dateKey) return parsed.seq || 0;
    return 0;
  } catch { return 0; }
}

function pad(num: number, digits: number) { return num.toString().padStart(digits, '0'); }
function rand(length: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i=0;i<length;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

export function generateTicketId(): string {
  const cfg = loadConfig();
  const now = new Date();
  const datePart = cfg.dateFormat === 'YYMMDD'
    ? now.toISOString().slice(2,10).replace(/-/g,'')
    : now.toISOString().slice(0,10).replace(/-/g,'');
  const dateKey = datePart; // daily key
  let currentSeq = loadSeq(dateKey) + 1;
  saveSeq(dateKey, currentSeq);

  const replacements: Record<string,string> = {
    '{PREFIX}': cfg.prefix,
    '{DATE}': datePart,
      '{SEQ}': String(currentSeq),
      '{RAND}': rand(cfg.randomLength),
    '{RAND4}': rand(4),
    '{RAND5}': rand(5),
    '{RAND6}': rand(6),
  };
    // مفاتيح ديناميكية حسب الإعداد
    replacements[`{SEQ${cfg.seqDigits}}`] = pad(currentSeq, cfg.seqDigits);
    replacements[`{RAND${cfg.randomLength}}`] = rand(cfg.randomLength);

  let out = cfg.pattern;
  Object.entries(replacements).forEach(([k,v]) => { out = out.replaceAll(k, v); });
  return out.toUpperCase();
}

export function isTicketIdUsed(existingIds: string[], candidate: string): boolean {
  const up = candidate.toUpperCase();
  return existingIds.some(id => id.toUpperCase() === up);
}
