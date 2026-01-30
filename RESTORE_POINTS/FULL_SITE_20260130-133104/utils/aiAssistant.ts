// Lightweight AI Assistant (rule-based + heuristics) to simulate NLP features offline
// Provides: auto-replies for common inquiries, department suggestion, and peak time prediction

export type AutoReply = {
  intent: 'status' | 'payment' | 'documents' | 'deadline' | 'greeting' | 'unknown';
  answer: string;
  confidence: number; // 0..1
};

export type RoutingSuggestion = {
  department: string;
  reason: string;
  confidence: number; // 0..1
};

export type RoutingCandidate = {
  department: string;
  score: number;
  source: 'rule' | 'dynamic';
  ruleReason?: string;
  ruleMatches?: string[];
  aliasHits?: string[];
  negativeHits?: string[];
  boosts?: string[];
  penalties?: string[];
};

export type PeakPrediction = {
  hour: number; // 0..23 local time
  label: string; // e.g., "ذروة متوقعة"
  confidence: number; // 0..1
};

// Debug/testing options to enable/disable certain rule families and dynamic signals
export type DebugOptions = {
  // Include/Exclude rule families by their dep label (e.g., 'الخزينة', 'تكنولوجيا المعلومات', ...)
  ruleInclude?: Record<string, boolean>;
  // Control dynamic matching contributions
  enableDynamicName?: boolean;       // mention of department name in text
  enableDynamicAliases?: boolean;    // aliases list matches
  enableDynamicNegatives?: boolean;  // negatives list penalties
  // Optional tuning of rule base and weight per family (keyed by dep label)
  ruleOverrides?: Record<string, { base?: number; weight?: number }>;
  // Optional tuning of boosts/penalties
  boosts?: { dynName?: number; dynAlias?: number };
  penalties?: { ruleNeg?: number; dynNeg?: number };
};

const COMMON_PATTERNS: Array<{ intent: AutoReply['intent']; patterns: RegExp[]; answer: string }> = [
  {
    intent: 'status',
    patterns: [/\b(حالة|متابعة|وصلت|رقم الطلب|تتبع)\b/i],
    answer: 'لمتابعة حالة طلبك، يرجى استخدام صفحة تتبّع الطلبات وإدخال رقم الطلب. أو أرسل لنا رقم الطلب لنساعدك مباشرة.'
  },
  {
    intent: 'payment',
    patterns: [/\b(دفع|رسوم|سداد|فاتورة|تحصيل)\b/i],
    answer: 'بالنسبة للمدفوعات والرسوم، يمكنك مراجعة قسم الخزينة أو الدفع الإلكتروني إن كان مفعّلًا. زودنا برقم الفاتورة إن توفر.'
  },
  {
    intent: 'documents',
    patterns: [/\b(وثائق|مستندات|أوراق|مطلوبة)\b/i],
    answer: 'المستندات تختلف حسب نوع المعاملة. اذكر نوع الطلب وسنرسل لك قائمة المستندات المطلوبة بالتفصيل.'
  },
  {
    intent: 'deadline',
    patterns: [/\b(مهلة|موعد|آخر|تاريخ|يوم)\b/i],
    answer: 'لمواعيد التسليم والمُهل، يرجى تحديد نوع الخدمة وسنزوّدك بالموعد النظامي والإجراءات.'
  },
  {
    intent: 'greeting',
    patterns: [/\b(مرحبا|السلام|صباح الخير|مساء الخير)\b/i],
    answer: 'مرحبًا بك! كيف يمكنني مساعدتك اليوم؟'
  }
];

export const aiAssistant = {
  autoReply(message: string): AutoReply {
    const text = (message || '').trim();
    if (!text) return { intent: 'unknown', answer: 'يرجى توضيح الاستفسار.', confidence: 0.2 };
    for (const p of COMMON_PATTERNS) {
      if (p.patterns.some(r => r.test(text))) return { intent: p.intent, answer: p.answer, confidence: 0.85 };
    }
    // fallback: unknown
    return { intent: 'unknown', answer: 'سأحول استفسارك للقسم المناسب بعد تحديد نوع الخدمة.', confidence: 0.5 };
  },

  suggestDepartment(details: string): RoutingSuggestion {
    const lower = (details || '').toLowerCase();
    const original = details || '';
    // Load dynamic departments list if present to slightly boost direct mentions
    let dynamicDeps: string[] = [];
    let dynamicEntries: Array<{ name: string; aliases?: string[]; negatives?: string[] } > = [];
    // Optional: system-default routing tunables (persisted by admins)
    let sysDefaults: any = null;
    try {
      const dl = JSON.parse(localStorage.getItem('departmentsList') || '[]');
      if (Array.isArray(dl)) {
        dynamicDeps = dl.map((d: any) => String(d?.name || d).toLowerCase()).filter(Boolean);
        dynamicEntries = dl.map((d: any) => ({
          name: String(d?.name || '').toLowerCase(),
          aliases: Array.isArray(d?.aliases) ? d.aliases.map((a: any) => String(a || '').toLowerCase()).filter(Boolean) : undefined,
          negatives: Array.isArray(d?.negatives) ? d.negatives.map((a: any) => String(a || '').toLowerCase()).filter(Boolean) : undefined,
        }));
      }
      // Load system defaults if provided
      try {
        const rawSys = localStorage.getItem('routing_system_defaults');
        if (rawSys) {
          const parsed = JSON.parse(rawSys);
          if (parsed && typeof parsed === 'object') sysDefaults = parsed;
        }
      } catch {}
    } catch {}

    type Rule = {
      dep: string;
      reason: string;
      positives: RegExp[];
      negatives?: RegExp[]; // if matched, reduce score
      base: number; // base confidence
      weight?: number; // optional boost per positive match
    };

    let rules: Rule[] = [
      {
        dep: 'الموارد البشرية',
        reason: 'شؤون الموظفين: رواتب، إجازات، دوام، تعيينات',
        positives: [/راتب|رواتب|تعويض|علاوة|سلفة/i, /دوام|تأخير|توقيع|بصمة/i, /إجازة|استقالة|تثبيت|توظيف|تعيين|وظيفة|مسابقة/i],
        negatives: [/منحة دراسية|منحة طلاب|تأمين صحي خارجي/i],
        base: 0.78,
        weight: 0.07,
      },
      {
        dep: 'الخزينة',
        reason: 'تحصيل مالي: دفع، رسوم، فواتير، ضريبة، إيصال',
        positives: [/دفع|سداد|تحصيل|إيصال|قبض/i, /رسوم|فاتورة|غرامة|ضريبة|طابع/i],
        negatives: [/إعفاء جمركي|إعفاء صحي/i],
        base: 0.8,
        weight: 0.08,
      },
      {
        dep: 'الشؤون القانونية',
        reason: 'قضايا ونزاعات: دعوى، شكوى قانونية، مخالفة، محضر',
        positives: [/دعوى|مذكرة|محضر|مخالفة|قانون|استئناف|تبليغ/i],
        negatives: [/مخالفة فنية كهرباء|عطل شبكة/i],
        base: 0.76,
        weight: 0.09,
      },
      {
        dep: 'تكنولوجيا المعلومات',
        reason: 'أعطال تقنية: نظام، موقع، تطبيق، شبكة، حاسوب',
        positives: [/نظام|منصة|موقع|تطبيق|خدمة إلكترونية/i, /عطل|يتوقف|لا يعمل|تجميد|بطيء/i, /شبكة|اتصال|حاسوب|طابعة|كهرباء|سيرفر/i, /otp|رمز|بريد إلكتروني/i],
        negatives: [/شبكة اجتماعية|موقع خارجي لا يتبع المديرية/i],
        base: 0.79,
        weight: 0.08,
      },
      {
        dep: 'التدقيق',
        reason: 'مطابقة وتحقق: تدقيق، مراجعة، تحليل، تسوية',
        positives: [/تدقيق|مطابقة|تسوية|تحليل|فحص|تحقق/i],
        negatives: [/تدقيق لغوي|مراجعة نص/i],
        base: 0.74,
        weight: 0.07,
      },
      {
        dep: 'الديوان',
        reason: 'كتب واردة وصادرة وأرشفة',
        positives: [/صادر|وارد|رقم كتاب|ختم|تأشير|أرشفة|ديوان/i],
        base: 0.73,
        weight: 0.07,
      },
      {
        dep: 'الخدمة المواطنية',
        reason: 'نوافذ خدمة المواطنين: معاملات عامة واستعلامات',
        positives: [/معاملة|استعلام|سير المعاملة|تتبع الطلب/i],
        base: 0.7,
        weight: 0.06,
      },
    ];

    // Apply system-default rule overrides and inclusion filters if provided
    if (sysDefaults && typeof sysDefaults === 'object') {
      const include: Record<string, boolean> | undefined = sysDefaults.ruleInclude;
      const overrides: Record<string, { base?: number; weight?: number }> | undefined = sysDefaults.ruleOverrides;
      rules = rules
        .filter(r => (include && include[r.dep] === false) ? false : true)
        .map(r => {
          const ov = overrides?.[r.dep];
          return {
            ...r,
            base: ov && typeof ov.base === 'number' ? ov.base : r.base,
            weight: ov && typeof ov.weight === 'number' ? ov.weight : r.weight,
          } as Rule;
        });
    }

    let best: { dep: string; reason: string; score: number } | null = null;
    const candidates: RoutingCandidate[] = [];
    const invalidRegex: Array<{ dep: string; alias: string; error: string; kind: 'alias' | 'negative' }> = [];

    // Resolve tunables for dynamic signals and penalties
    const dynNameEnabled = sysDefaults ? (sysDefaults.dynName !== false) : true;
    const dynAliasesEnabled = sysDefaults ? (sysDefaults.dynAliases !== false) : true;
    const dynNegativesEnabled = sysDefaults ? (sysDefaults.dynNegatives !== false) : true;
    const dynNameBoost = Math.abs(sysDefaults?.dynNameBoost ?? 0.72);
    const dynAliasBoost = Math.abs(sysDefaults?.dynAliasBoost ?? 0.08);
    const ruleNegPenalty = Math.abs(sysDefaults?.ruleNegPenalty ?? 0.12);
    const dynNegPenalty = Math.abs(sysDefaults?.dynNegPenalty ?? 0.12);

    // 1) Rule-based scoring
    for (const r of rules) {
      let score = r.base;
      let posHits = 0;
      const ruleMatches: string[] = [];
      for (const re of r.positives) {
        if (re.test(original)) { posHits++; score += (r.weight ?? 0.06); ruleMatches.push(re.toString()); }
      }
      if (r.negatives) for (const ne of r.negatives) if (ne.test(original)) { score -= ruleNegPenalty; }
      if (posHits === 0) continue; // require at least one positive signal
      candidates.push({ department: r.dep, score, source: 'rule', ruleReason: r.reason, ruleMatches });
      if (!best || score > best.score) best = { dep: r.dep, reason: r.reason, score };
    }

    // 2) Dynamic name/alias matching as candidates
    const dynamicCandidates: { dep: string; score: number; reason: string }[] = [];
    for (const entry of dynamicEntries) {
      const depName = entry.name;
      let score = 0;
      const aliasHits: string[] = [];
      const negativeHits: string[] = [];
      const boosts: string[] = [];
      const penalties: string[] = [];
      if (dynNameEnabled && depName && lower.includes(depName)) { score += dynNameBoost; boosts.push('name'); }
      if (dynAliasesEnabled && Array.isArray(entry.aliases) && entry.aliases.length) {
        for (const alRaw of entry.aliases) {
          const raw = alRaw as unknown as string; // already lowercased above
          // Detect regex literal syntax /pattern/flags
          const m = /^\/(.*)\/([gimsuy]*)$/.exec(raw);
          if (m) {
            try {
              const re = new RegExp(m[1], m[2]);
              if (re.test(original)) { score += dynAliasBoost; aliasHits.push(`/${m[1]}/${m[2]}`); }
            } catch (e: any) {
              invalidRegex.push({ dep: depName, alias: raw, error: String(e?.message || 'invalid'), kind: 'alias' });
            }
          } else {
            if (lower.includes(raw)) { score += dynAliasBoost; aliasHits.push(raw); }
          }
        }
      }
      if (dynNegativesEnabled && Array.isArray(entry.negatives) && entry.negatives.length) {
        for (const ngRaw of entry.negatives) {
          const raw = ngRaw as unknown as string;
          const m = /^\/(.*)\/([gimsuy]*)$/.exec(raw);
          if (m) {
            try {
              const re = new RegExp(m[1], m[2]);
              if (re.test(original)) { score -= dynNegPenalty; negativeHits.push(`/${m[1]}/${m[2]}`); penalties.push('neg'); }
            } catch (e: any) {
              invalidRegex.push({ dep: depName, alias: raw, error: String(e?.message || 'invalid'), kind: 'negative' });
            }
          } else {
            if (lower.includes(raw)) { score -= dynNegPenalty; negativeHits.push(raw); penalties.push('neg'); }
          }
        }
      }
      if (score > 0.5) {
        dynamicCandidates.push({ dep: depName, score, reason: 'ذكر مباشر للاسم/المرادفات' });
        candidates.push({ department: depName, score, source: 'dynamic', aliasHits, negativeHits, boosts, penalties });
      }
    }

    if (dynamicCandidates.length) {
      const top = dynamicCandidates.sort((a, b) => b.score - a.score)[0];
      if (!best || top.score > best.score) {
        best = { dep: top.dep, reason: top.reason, score: top.score };
      }
    }

    if (best) {
      // Boost if exact department name appears in text along with matching rule
      if (dynNameEnabled) {
        if (dynamicDeps.some(dn => lower.includes(dn)) && lower.includes(best.dep.toLowerCase())) {
          best.score += 0.05;
        }
      }
      // Boost/Penalize using entry-level aliases/negatives for final match
      const matchedEntry = dynamicEntries.find(e => best && (best.dep.toLowerCase().includes(e.name) || e.name.includes(best.dep.toLowerCase())));
      if (matchedEntry?.aliases?.length && dynAliasesEnabled) {
        if (matchedEntry.aliases.some(al => lower.includes(al))) best.score += Math.min(0.06, dynAliasBoost / 2);
      }
      if (matchedEntry?.negatives?.length && dynNegativesEnabled) {
        if (matchedEntry.negatives.some(ng => lower.includes(ng))) best.score -= Math.min(0.12, dynNegPenalty);
      }
      return { department: best.dep, reason: best.reason, confidence: Math.max(0.5, Math.min(1, best.score)) };
    }

    // Fallback with light heuristics for negative intents (avoid misrouting)
    if (/شكوى|تظلم|اعتراض/i.test(lower)) {
      return { department: 'الشؤون القانونية', reason: 'صياغة شكوى/اعتراض - تحويل قانوني مبدئي', confidence: 0.65 };
    }
    if (/عطل|لا يعمل|توقف|شبكة|سيرفر/i.test(lower)) {
      return { department: 'تكنولوجيا المعلومات', reason: 'مؤشرات عطل تقني', confidence: 0.66 };
    }
    // Prefer a department name directly mentioned in text if any
    const direct = dynamicDeps.find(d => lower.includes(d));
    if (direct) {
      const named = direct.replace(/\s+/g, ' ').trim();
      return { department: named, reason: 'ذكر مباشر لاسم القسم في النص', confidence: 0.62 };
    }
    return { department: 'إدارة الاستعلامات والشكاوى', reason: 'تصنيف عام/غير واضح', confidence: 0.6 };
  },

  // Debug variant: returns breakdown for UI testing/tuning with optional toggles
  debugSuggest(details: string, options?: DebugOptions): { result: RoutingSuggestion; candidates: RoutingCandidate[]; invalidRegex: Array<{ dep: string; alias: string; error: string; kind: 'alias'|'negative' }>; } {
    const lower = (details || '').toLowerCase();
    const original = details || '';
    const opts: DebugOptions = options || {};

    // Load dynamic departments
    let dynamicEntries: Array<{ name: string; aliases?: string[]; negatives?: string[] } > = [];
    let dynamicDeps: string[] = [];
    try {
      const dl = JSON.parse(localStorage.getItem('departmentsList') || '[]');
      if (Array.isArray(dl)) {
        dynamicDeps = dl.map((d: any) => String(d?.name || d).toLowerCase()).filter(Boolean);
        dynamicEntries = dl.map((d: any) => ({
          name: String(d?.name || '').toLowerCase(),
          aliases: Array.isArray(d?.aliases) ? d.aliases.map((a: any) => String(a || '').toLowerCase()).filter(Boolean) : undefined,
          negatives: Array.isArray(d?.negatives) ? d.negatives.map((a: any) => String(a || '').toLowerCase()).filter(Boolean) : undefined,
        }));
      }
    } catch {}

    // Define rule families
    type Rule = { dep: string; reason: string; positives: RegExp[]; negatives?: RegExp[]; base: number; weight?: number };
    const rules: Rule[] = [
      { dep: 'الموارد البشرية', reason: 'شؤون الموظفين: رواتب، إجازات، دوام، تعيينات', positives: [/راتب|رواتب|تعويض|علاوة|سلفة/i, /دوام|تأخير|توقيع|بصمة/i, /إجازة|استقالة|تثبيت|توظيف|تعيين|وظيفة|مسابقة/i], negatives: [/منحة دراسية|منحة طلاب|تأمين صحي خارجي/i], base: 0.78, weight: 0.07 },
      { dep: 'الخزينة', reason: 'تحصيل مالي: دفع، رسوم، فواتير، ضريبة، إيصال', positives: [/دفع|سداد|تحصيل|إيصال|قبض/i, /رسوم|فاتورة|غرامة|ضريبة|طابع/i], negatives: [/إعفاء جمركي|إعفاء صحي/i], base: 0.8, weight: 0.08 },
      { dep: 'الشؤون القانونية', reason: 'قضايا ونزاعات: دعوى، شكوى قانونية، مخالفة، محضر', positives: [/دعوى|مذكرة|محضر|مخالفة|قانون|استئناف|تبليغ/i], base: 0.76, weight: 0.09 },
      { dep: 'تكنولوجيا المعلومات', reason: 'أعطال تقنية: نظام، موقع، تطبيق، شبكة، حاسوب', positives: [/نظام|منصة|موقع|تطبيق|خدمة إلكترونية/i, /عطل|يتوقف|لا يعمل|تجميد|بطيء/i, /شبكة|اتصال|حاسوب|طابعة|كهرباء|سيرفر/i, /otp|رمز|بريد إلكتروني/i], negatives: [/شبكة اجتماعية|موقع خارجي لا يتبع المديرية/i], base: 0.79, weight: 0.08 },
      { dep: 'التدقيق', reason: 'مطابقة وتحقق: تدقيق، مراجعة، تحليل، تسوية', positives: [/تدقيق|مطابقة|تسوية|تحليل|فحص|تحقق/i], negatives: [/تدقيق لغوي|مراجعة نص/i], base: 0.74, weight: 0.07 },
      { dep: 'الديوان', reason: 'كتب واردة وصادرة وأرشفة', positives: [/صادر|وارد|رقم كتاب|ختم|تأشير|أرشفة|ديوان/i], base: 0.73, weight: 0.07 },
      { dep: 'الخدمة المواطنية', reason: 'نوافذ خدمة المواطنين: معاملات عامة واستعلامات', positives: [/معاملة|استعلام|سير المعاملة|تتبع الطلب/i], base: 0.7, weight: 0.06 },
    ].map(r => {
      const ov = opts.ruleOverrides?.[r.dep];
      return {
        ...r,
        base: ov?.base !== undefined ? ov.base! : r.base,
        weight: ov?.weight !== undefined ? ov.weight! : r.weight,
      } as Rule;
    });

    let best: { dep: string; reason: string; score: number } | null = null;
    const candidates: RoutingCandidate[] = [];
    const invalidRegex: Array<{ dep: string; alias: string; error: string; kind: 'alias' | 'negative' }> = [];

    // 1) Rule-based scoring with toggles
    for (const r of rules) {
      if (opts.ruleInclude && opts.ruleInclude[r.dep] === false) continue; // skip disabled family
      let score = r.base;
      const ruleMatches: string[] = [];
      let hits = 0;
      for (const re of r.positives) {
        if (re.test(original)) { hits++; score += (r.weight ?? 0.06); ruleMatches.push(re.toString()); }
      }
      const ruleNegPenalty = Math.abs(opts.penalties?.ruleNeg ?? 0.12);
      if (r.negatives) for (const ne of r.negatives) { if (ne.test(original)) score -= ruleNegPenalty; }
      if (hits === 0) continue;
      candidates.push({ department: r.dep, score, source: 'rule', ruleMatches, ruleReason: r.reason });
      if (!best || score > best.score) best = { dep: r.dep, reason: r.reason, score };
    }

    // 2) Dynamic name/alias matching as candidates with toggles
    for (const entry of dynamicEntries) {
      let score = 0; const aliasHits: string[] = []; const negativeHits: string[] = []; const boosts: string[] = []; const penalties: string[] = [];
      const depName = entry.name;
      if (opts.enableDynamicName !== false) {
        const nameBoost = Math.abs(opts.boosts?.dynName ?? 0.72);
        if (depName && lower.includes(depName)) { score += nameBoost; boosts.push('name'); }
      }
      if (opts.enableDynamicAliases !== false && entry.aliases) {
        for (const alRaw of entry.aliases) {
          const m = /^\/(.*)\/([gimsuy]*)$/.exec(alRaw);
          if (m) {
            try { const re = new RegExp(m[1], m[2]); if (re.test(original)) { score += Math.abs(opts.boosts?.dynAlias ?? 0.08); aliasHits.push(`/${m[1]}/${m[2]}`); } }
            catch (e: any) { invalidRegex.push({ dep: depName, alias: alRaw, error: String(e?.message || 'invalid'), kind: 'alias' }); }
          } else { if (lower.includes(alRaw)) { score += Math.abs(opts.boosts?.dynAlias ?? 0.08); aliasHits.push(alRaw); } }
        }
      }
      if (opts.enableDynamicNegatives !== false && entry.negatives) {
        for (const ngRaw of entry.negatives) {
          const m = /^\/(.*)\/([gimsuy]*)$/.exec(ngRaw);
          if (m) {
            try { const re = new RegExp(m[1], m[2]); if (re.test(original)) { score -= Math.abs(opts.penalties?.dynNeg ?? 0.12); negativeHits.push(`/${m[1]}/${m[2]}`); penalties.push('neg'); } }
            catch (e: any) { invalidRegex.push({ dep: depName, alias: ngRaw, error: String(e?.message || 'invalid'), kind: 'negative' }); }
          } else { if (lower.includes(ngRaw)) { score -= Math.abs(opts.penalties?.dynNeg ?? 0.12); negativeHits.push(ngRaw); penalties.push('neg'); } }
        }
      }
      if (score > 0.5) {
        candidates.push({ department: depName, score, source: 'dynamic', aliasHits, negativeHits, boosts, penalties });
        if (!best || score > best.score) best = { dep: depName, reason: 'ذكر مباشر للاسم/المرادفات', score };
      }
    }

    // 3) Fallbacks (respect toggles where applicable)
    if (!best) {
      if (/شكوى|تظلم|اعتراض/i.test(lower)) {
        best = { dep: 'الشؤون القانونية', reason: 'صياغة شكوى/اعتراض - تحويل قانوني مبدئي', score: 0.65 };
      } else if (/عطل|لا يعمل|توقف|شبكة|سيرفر/i.test(lower)) {
        best = { dep: 'تكنولوجيا المعلومات', reason: 'مؤشرات عطل تقني', score: 0.66 };
      } else if (opts.enableDynamicName !== false) {
        const direct = dynamicDeps.find(d => lower.includes(d));
        if (direct) best = { dep: direct.replace(/\s+/g, ' ').trim(), reason: 'ذكر مباشر لاسم القسم في النص', score: 0.62 };
      }
    }

    const final: RoutingSuggestion = best
      ? { department: best.dep, reason: best.reason, confidence: Math.max(0.5, Math.min(1, best.score)) }
      : { department: 'إدارة الاستعلامات والشكاوى', reason: 'تصنيف عام/غير واضح', confidence: 0.6 };

    candidates.sort((a, b) => b.score - a.score);
    return { result: final, candidates, invalidRegex };
  },

  predictPeaks(history: Array<{ timestamp: string }>): PeakPrediction[] {
    // Aggregate counts per hour of day and produce top-3 as peaks
    const counts = new Array(24).fill(0);
    for (const h of history || []) {
      const d = new Date(h.timestamp);
      if (!isNaN(d.getTime())) counts[d.getHours()]++;
    }
    const entries = counts.map((c, hour) => ({ hour, c }));
    entries.sort((a, b) => b.c - a.c);
    const total = counts.reduce((a, b) => a + b, 0) || 1;
    return entries.slice(0, 3).map((e, idx) => ({
      hour: e.hour,
      label: idx === 0 ? 'ذروة متوقعة' : 'نشاط مرتفع',
      confidence: Math.min(1, e.c / total + 0.2)
    }));
  }
};
