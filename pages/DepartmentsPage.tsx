import React, { useEffect, useMemo, useState } from 'react';
import { FaCrown, FaUpload, FaTrash, FaDownload, FaChevronRight, FaChevronDown, FaBuilding } from 'react-icons/fa';

type DepartmentInfo = {
  id: string;
  name: string;
  head?: string;
  description?: string;
  phone?: string;
  email?: string;
  subunits?: string[];
};

const DEFAULT_DEPARTMENTS: DepartmentInfo[] = [
  {
    id: 'gen-admin',
    name: 'الإدارة العامة',
    head: 'مدير المديرية',
    description: 'الإشراف العام على أعمال المديرية وتنسيق العمل بين الأقسام.'
  },
  {
    id: 'diwan',
    name: 'الديوان العام',
    head: 'رئيس الديوان',
    description: 'استلام وتصدير البريد الرسمي، وترقيم وأرشفة الكتب والتعاميم.'
  },
  {
    id: 'income',
    name: 'قسم الدخل',
    description: 'متابعة معاملات الدخل، التحصيل، والتدقيق.'
  },
  {
    id: 'companies',
    name: 'قسم الشركات',
    description: 'شؤون الشركات والتراخيص والسجلات.'
  },
  {
    id: 'realestate',
    name: 'قسم العقارات',
    description: 'ضريبة العقارات والمعاملات المرتبطة بنقل الملكية.'
  },
  {
    id: 'stamps',
    name: 'قسم الطوابع',
    description: 'إدارة الطوابع والتحصيل المرتبط بها.'
  },
];

const DepartmentsPage: React.FC = () => {
  // Departments state synced with localStorage
  const [depItems, setDepItems] = useState<DepartmentInfo[]>(DEFAULT_DEPARTMENTS);
  const departments = depItems;
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'overview' | 'list' | 'chart'>('overview');
  const [viewMode, setViewMode] = useState<'tree' | 'org' | 'hier'>('tree');
  const [manageOpen, setManageOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkMode, setBulkMode] = useState<'replace' | 'append'>('replace');
  const bulkPdfRef = React.useRef<HTMLInputElement | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<DepartmentInfo>({ id: '', name: '', head: '', description: '', phone: '', email: '', subunits: [] });
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const isManager = useMemo(() => {
    try {
      const u = localStorage.getItem('currentUser');
      if (!u) return false;
      const p = JSON.parse(u);
      return p?.role === 'مدير';
    } catch { return false; }
  }, []);

  // Defaults for overview content
  const [leaderName, setLeaderName] = useState('السيد أحمد محمد الأحمد');
  const [leaderTitle, setLeaderTitle] = useState('المسؤول الأول عن إدارة الشؤون المالية للمحافظة');
  const DEFAULT_ABOUT = 'تعتبر مديرية مالية محافظة حلب إحدى المؤسسات الحكومية الرائدة في الجمهورية العربية السورية والتي تُعنى بإدارة الشؤون المالية والمحاسبية للمحافظة. تأسست المديرية عام 1949 وتضم ما يقارب 280 موظفاً وموظفة يعملون في 8 أقسام رئيسية متخصصة في مختلف جوانب العمل المالي والإداري.';
  const [aboutText, setAboutText] = useState(DEFAULT_ABOUT);
  const [stats, setStats] = useState({ totalEmployees: 280, mainDepartments: 8, subUnits: 15, yearsOfService: 75 });
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState('');

  // Read optional overrides from localStorage
  useEffect(() => {
    // load departments from storage
    try {
      const raw = localStorage.getItem('departmentsList');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) setDepItems(arr);
      }
    } catch { /* noop */ }
    try {
      const s = localStorage.getItem('departmentsStats');
      if (s) {
        const parsed = JSON.parse(s);
        setStats({
          totalEmployees: Number(parsed.totalEmployees) || 280,
          mainDepartments: Number(parsed.mainDepartments) || 8,
          subUnits: Number(parsed.subUnits) || 15,
          yearsOfService: Number(parsed.yearsOfService) || 75,
        });
      }
    } catch { /* noop */ }
    try {
      const leader = localStorage.getItem('departmentsLeader');
      if (leader) {
        const p = JSON.parse(leader);
        if (p.name) setLeaderName(String(p.name));
        if (p.title) setLeaderTitle(String(p.title));
      }
    } catch { /* noop */ }
    try {
      const about = localStorage.getItem('departmentsAbout');
  if (about && about.trim()) setAboutText(about);
    } catch { /* noop */ }

    try {
      const kind = localStorage.getItem('orgChartKind');
      const dataUrl = localStorage.getItem('orgChartDataUrl');
      if (kind && dataUrl) setOrgChart({ kind: kind as 'pdf' | 'image', dataUrl });
    } catch { /* noop */ }
  }, []);

  const saveAbout = () => {
    const val = (aboutDraft || '').trim();
    try {
      if (val) {
        localStorage.setItem('departmentsAbout', val);
        setAboutText(val);
      } else {
        localStorage.removeItem('departmentsAbout');
        setAboutText(DEFAULT_ABOUT);
      }
      setEditingAbout(false);
    } catch {
      alert('تعذر حفظ النبذة.');
    }
  };
  const resetAbout = () => {
    if (!confirm('سيتم استعادة النبذة الافتراضية. متابعة؟')) return;
    try {
      localStorage.removeItem('departmentsAbout');
    } catch { /* noop */ }
    setAboutText(DEFAULT_ABOUT);
    setEditingAbout(false);
  };

  const persistDepartments = (list: DepartmentInfo[]) => {
    setDepItems(list);
    try {
      localStorage.setItem('departmentsList', JSON.stringify(list));
    } catch { /* noop */ }
  };

  const resetDepartments = () => {
    if (!confirm('هل تريد استعادة الأقسام الافتراضية؟ ستفقد التغييرات الحالية.')) return;
    try { localStorage.removeItem('departmentsList'); } catch { /* noop */ }
    setDepItems(DEFAULT_DEPARTMENTS);
  };

  const startAdd = () => {
    setEditingIndex(null);
    setDraft({ id: '', name: '', head: '', description: '', phone: '', email: '', subunits: [] });
    setManageOpen(true);
  };
  const startEdit = (idx: number) => {
    const item = departments[idx];
    setEditingIndex(idx);
    setDraft({ ...item });
    setManageOpen(true);
  };
  const removeItem = (idx: number) => {
    if (!confirm('تأكيد حذف القسم؟')) return;
    const next = departments.filter((_, i) => i !== idx);
    persistDepartments(next);
  };
  const saveDraft = () => {
    if (!draft.name.trim()) return alert('الاسم مطلوب.');
    const next = [...departments];
    const subunits = (draft.subunits || []).filter(Boolean);
    if (editingIndex === null) {
      const id = `dep-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
      next.unshift({ ...draft, id, subunits });
    } else {
      next[editingIndex] = { ...draft, subunits };
    }
    persistDepartments(next);
    setEditingIndex(null);
    setDraft({ id: '', name: '', head: '', description: '', phone: '', email: '', subunits: [] });
  };
  const onImportDeps: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('bad');
      const list: DepartmentInfo[] = data.map((x: any) => ({
        id: String(x?.id || `dep-${Date.now()}-${Math.random().toString(36).slice(2,7)}`),
        name: String(x?.name || ''),
        head: x?.head ? String(x.head) : undefined,
        description: x?.description ? String(x.description) : undefined,
        phone: x?.phone ? String(x.phone) : undefined,
        email: x?.email ? String(x.email) : undefined,
        subunits: Array.isArray(x?.subunits) ? x.subunits.map((s: any) => String(s)) : [],
      })).filter((d) => d.name.trim());
      persistDepartments(list);
    } catch {
      alert('فشل استيراد الملف. تأكد من صحة تنسيق JSON.');
    } finally { e.target.value = ''; }
  };
  const exportDeps = () => {
    try {
      const data = JSON.stringify(departments, null, 2);
      const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().slice(0, 19).replace(/[.:T]/g, '-');
      a.download = `departments-${ts}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('تعذر تصدير البيانات.'); }
  };

  // Parse bulk text into departments with subunits
  const parseBulkTextToDepartments = (text: string): DepartmentInfo[] => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const result: DepartmentInfo[] = [];
    let current: DepartmentInfo | null = null;
    const isDeptLine = (l: string) => /[:：]$/.test(l) || /^(قسم|دائرة|مديرية)\s+/u.test(l);
    const isSubLine = (l: string) => /^[-•\u2022]/.test(l) || /^\s{1,3}/.test(l);
    for (const raw of lines) {
      const l = raw.replace(/^[-•\u2022]\s?/, '');
      if (isDeptLine(raw)) {
        const name = raw.replace(/[:：]\s*$/, '');
        current = { id: `dep-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, name, subunits: [] };
        result.push(current);
      } else if (current && (isSubLine(raw) || !isDeptLine(raw))) {
        // treat as subunit if a current department exists
        const name = l.trim();
        if (name) {
          current.subunits = current.subunits || [];
          // avoid duplicates within same department
          if (!current.subunits.includes(name)) current.subunits.push(name);
        }
      } else {
        // line without a current department, create a department directly
        const name = l.trim();
        if (name) {
          current = { id: `dep-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, name, subunits: [] };
          result.push(current);
        }
      }
    }
    // normalize: trim names and drop empties
    return result
      .map(d => ({
        ...d,
        name: d.name.trim(),
        subunits: (d.subunits || []).map(s => s.trim()).filter(Boolean)
      }))
      .filter(d => d.name.length > 0);
  };

  const applyBulk = () => {
    const parsed = parseBulkTextToDepartments(bulkText || '');
    if (parsed.length === 0) { alert('لم يتم التعرف على أي أقسام. تأكد من التنسيق.'); return; }
    const merged = bulkMode === 'append' ? [...departments, ...parsed] : parsed;
    // de-duplicate by department name (keep first occurrence)
    const seen = new Set<string>();
    const unique = merged.filter(d => {
      const k = d.name.trim();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    persistDepartments(unique);
    setBulkOpen(false);
    setBulkText('');
  };

  // Try to normalize arbitrary Arabic text (from PDFs) into dept:+subunits format
  const smartNormalizeBulk = () => {
    const lines = (bulkText || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const out: string[] = [];
    const isDept = (l: string) => /(\b|^)(دائرة|قسم)\b/u.test(l);
    const isSub = (l: string) => /(\b|^)(شعبة|وحدة)\b/u.test(l) || /^[-•\u2022]/.test(l);
    let currentDept: string | null = null;
    for (const l of lines) {
      if (isDept(l)) {
        // strip trailing colon-like
        const name = l.replace(/[：:]+\s*$/, '').trim();
        currentDept = name.includes(':') ? name.split(':')[0].trim() : name;
        out.push(`${currentDept}:`);
      } else if (isSub(l)) {
        const name = l.replace(/^[-•\u2022]\s?/, '').trim();
        if (!currentDept) {
          // start an implicit department if none
          currentDept = 'قسم غير معنون';
          out.push(`${currentDept}:`);
        }
        out.push(`- ${name}`);
      } else if (/مديرية\b/u.test(l)) {
        // skip directorate headers
        continue;
      } else {
        // treat as subunit if we have a current dept and it's a short label
        if (currentDept && l.length <= 40) out.push(`- ${l}`);
      }
    }
    if (out.length === 0) {
      alert('تعذر تنسيق النص تلقائياً. يرجى ضبط التنسيق يدوياً.');
      return;
    }
    setBulkText(out.join('\n'));
  };

  // Import PDF and extract text into bulk area
  const onBulkPdfSelect: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      // Lazy-load pdfjs to keep bundle light
      const pdfjs: any = await import('pdfjs-dist');
      try {
        const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        if (workerUrl) {
          pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        }
      } catch { /* no worker override */ }
      const data = await f.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data });
      const pdf = await loadingTask.promise;
      let all = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strs = content.items.map((it: any) => (it?.str ?? it?.unicode ?? '')).filter(Boolean);
        all += strs.join(' ') + '\n';
      }
      // Put raw extracted text for user to adjust; heuristics can be added later
      setBulkText(all.trim());
      if (!bulkOpen) setBulkOpen(true);
    } catch (err) {
      console.error(err);
      alert('تعذر استخراج النص من ملف PDF. يرجى تجربة ملف آخر أو نسخ النص يدوياً.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const [orgChart, setOrgChart] = useState<null | { kind: 'pdf' | 'image'; dataUrl: string }>(null);
  const onOrgChartSelect: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    const isImg = f.type.startsWith('image/');
    if (!isPdf && !isImg) {
      alert('يرجى اختيار ملف PDF أو صورة للمخطط التنظيمي.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const kind: 'pdf' | 'image' = isPdf ? 'pdf' : 'image';
      try {
        localStorage.setItem('orgChartKind', kind);
        localStorage.setItem('orgChartDataUrl', dataUrl);
        setOrgChart({ kind, dataUrl });
      } catch { alert('تعذر حفظ الملف.'); }
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };
  const clearOrgChart = () => {
    if (!confirm('سيتم إزالة المخطط التنظيمي المخزن. متابعة؟')) return;
    try {
      localStorage.removeItem('orgChartKind');
      localStorage.removeItem('orgChartDataUrl');
      setOrgChart(null);
    } catch { /* noop */ }
  };
  const downloadOrgChart = () => {
    if (!orgChart) return;
    try {
      const a = document.createElement('a');
      a.href = orgChart.dataUrl;
      a.download = orgChart.kind === 'pdf' ? 'org-chart.pdf' : 'org-chart.png';
      a.click();
    } catch { /* noop */ }
  };

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return departments;
    return departments.filter(d =>
      d.name.includes(q) ||
      (d.description && d.description.includes(q)) ||
      (d.head && d.head.includes(q))
    );
  }, [departments, query]);

  return (
    <div className="rounded-2xl p-8 animate-fade-in-up transition-all duration-300 border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-900/60 backdrop-blur shadow-lg">
      <div className="max-w-6xl mx-auto">
        <header className="mb-4 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">الهيكل الإداري</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">مديرية مالية محافظة حلب — الجمهورية العربية السورية</p>
        </header>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <button
            className={`px-4 py-2 rounded-lg text-sm border transition ${tab === 'overview' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/70 dark:bg-gray-800/70 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'}`}
            onClick={() => setTab('overview')}
          >الملخص العام</button>
          <button
            className={`px-4 py-2 rounded-lg text-sm border transition ${tab === 'list' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/70 dark:bg-gray-800/70 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'}`}
            onClick={() => setTab('list')}
          >الأقسام</button>
          <button
            className={`px-4 py-2 rounded-lg text-sm border transition ${tab === 'chart' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/70 dark:bg-gray-800/70 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'}`}
            onClick={() => setTab('chart')}
          >خريطة الهيكل التنظيمي</button>
        </div>

        {tab === 'overview' && (
          <div>
            {/* Leader card */}
            <div className="max-w-3xl mx-auto rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-6 shadow-sm mb-5 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl text-amber-600 mb-3">
                <FaCrown />
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">{leaderName}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{leaderTitle}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">الإدارة العليا</div>
            </div>

            {/* Stats tiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
              <div className="rounded-xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-5 text-center">
                <div className="text-2xl font-extrabold text-emerald-500">+{stats.totalEmployees}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">إجمالي الموظفين</div>
              </div>
              <div className="rounded-xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-5 text-center">
                <div className="text-2xl font-extrabold text-gray-100 dark:text-white">{stats.mainDepartments}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">الأقسام الرئيسية</div>
              </div>
              <div className="rounded-xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-5 text-center">
                <div className="text-2xl font-extrabold text-green-400">{stats.subUnits}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">الوحدات الفرعية</div>
              </div>
              <div className="rounded-xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-5 text-center">
                <div className="text-2xl font-extrabold text-yellow-400">{stats.yearsOfService}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">سنوات الخدمة</div>
              </div>
            </div>

            {/* About */}
            <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">نبذة عن المديرية</h3>
                {isManager && !editingAbout && (
                  <button onClick={() => { setAboutDraft(aboutText); setEditingAbout(true); }} className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70">تحرير</button>
                )}
              </div>
              {!editingAbout ? (
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300" dir="rtl">{aboutText}</p>
              ) : (
                <div className="mt-2">
                  <textarea dir="rtl" className="w-full min-h-[120px] p-3 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm" value={aboutDraft} onChange={(e) => setAboutDraft(e.target.value)} />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={saveAbout} className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">حفظ</button>
                    <button onClick={() => setEditingAbout(false)} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">إلغاء</button>
                    <button onClick={resetAbout} className="px-4 py-2 rounded border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:bg-amber-900/30 text-sm">استعادة الافتراضي</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'list' && (
          <div>
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-5">
              <div className="text-xs text-gray-600 dark:text-gray-400">عدد الأقسام: <span className="font-semibold text-gray-900 dark:text-gray-100">{filtered.length}</span></div>
              <div className="md:w-80">
                <input
                  dir="rtl"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو الوصف أو اسم المسؤول"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              {isManager && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setManageOpen((v) => !v)} className="px-4 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70">
                    {manageOpen ? 'إخفاء الإدارة' : 'إدارة الأقسام'}
                  </button>
                  <button onClick={startAdd} className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700">إضافة قسم</button>
                  <button onClick={() => setBulkOpen((v) => !v)} className="px-4 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70">إدخال مجمّع</button>
                </div>
              )}
            </div>

            {isManager && bulkOpen && (
              <div className="mb-5 rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">إدخال مجمّع للدوائر والشعب</h3>
                  <button onClick={() => setBulkOpen(false)} className="text-sm px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600">إغلاق</button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 mb-2" dir="rtl">
                  الصق قائمة الهيكل من الملف: اكتب اسم الدائرة متبوعاً بنقطتين، ثم أسطر تبدأ بشرطة لتمثل الشعب. مثال:
                </p>
                <pre className="text-[12px] leading-5 p-3 rounded bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 overflow-auto" dir="rtl">
                  دائرة الديوان العام:
                  - شعبة الصادر والوارد
                  - شعبة الأرشيف
                  دائرة الدخل:
                  - شعبة كبار المكلفين
                  - شعبة تحقق الدخل
                </pre>
                <div className="mt-3">
                  <textarea
                    dir="rtl"
                    className="w-full min-h-[160px] p-3 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm"
                    placeholder="الصق هنا نص الهيكل (دوائر وشعب)"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="text-sm inline-flex items-center gap-2">
                    <span>الوضع:</span>
                    <select value={bulkMode} onChange={(e) => setBulkMode(e.target.value as 'replace' | 'append')} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm">
                      <option value="replace">استبدال القائمة الحالية</option>
                      <option value="append">إضافة إلى القائمة الحالية</option>
                    </select>
                  </label>
                  <button onClick={applyBulk} className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">تطبيق</button>
                  <button onClick={smartNormalizeBulk} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">تنسيق ذكي للنص</button>
                  <button onClick={() => bulkPdfRef.current?.click()} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">استخراج من PDF</button>
                  <input ref={bulkPdfRef} type="file" accept="application/pdf" onChange={onBulkPdfSelect} hidden />
                </div>
              </div>
            )}

            {isManager && manageOpen && (
              <div className="mb-5 rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-4 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{editingIndex === null ? 'إضافة قسم' : 'تعديل قسم'}</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="text-sm">الاسم
                    <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  </label>
                  <label className="text-sm">المسؤول
                    <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={draft.head || ''} onChange={(e) => setDraft({ ...draft, head: e.target.value })} />
                  </label>
                  <label className="text-sm">الهاتف
                    <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={draft.phone || ''} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
                  </label>
                  <label className="text-sm">البريد الإلكتروني
                    <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={draft.email || ''} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                  </label>
                  <label className="text-sm md:col-span-2">الوصف
                    <textarea className="mt-1 w-full min-h-[80px] p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                  </label>
                  <label className="text-sm md:col-span-2">الشعب التابعة (كل سطر شعبة)
                    <textarea className="mt-1 w-full min-h-[80px] p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={(draft.subunits || []).join('\n')} onChange={(e) => setDraft({ ...draft, subunits: e.target.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean) })} />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={saveDraft} className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">{editingIndex === null ? 'إضافة' : 'حفظ'}</button>
                  <button onClick={() => { setEditingIndex(null); setDraft({ id: '', name: '', head: '', description: '', phone: '', email: '', subunits: [] }); }} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">إلغاء</button>
                  <button onClick={exportDeps} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">تصدير JSON</button>
                  <button onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">استيراد JSON</button>
                  <button onClick={resetDepartments} className="px-4 py-2 rounded border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:bg-amber-900/30 text-sm">استعادة الافتراضي</button>
                  <input ref={fileRef} type="file" accept="application/json" onChange={onImportDeps} hidden />
                </div>
                <div className="mt-4 border rounded-xl overflow-hidden border-gray-200 dark:border-gray-700">
                  {departments.length === 0 ? (
                    <div className="p-3 text-sm text-gray-600 dark:text-gray-300">لا توجد أقسام بعد.</div>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                        <tr>
                          <th className="p-2 text-right">الاسم</th>
                          <th className="p-2 text-right">المسؤول</th>
                          <th className="p-2 text-right">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {departments.map((d, i) => (
                          <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="p-2 font-medium text-gray-900 dark:text-gray-100">{d.name}</td>
                            <td className="p-2 text-gray-700 dark:text-gray-300">{d.head || '-'}</td>
                            <td className="p-2">
                              <div className="flex gap-2">
                                <button onClick={() => startEdit(i)} className="text-blue-600 dark:text-blue-400 hover:underline">تعديل</button>
                                <button onClick={() => removeItem(i)} className="text-red-600 dark:text-red-400 hover:underline">حذف</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((d) => (
                <section key={d.id} className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-5 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{d.name}</h2>
                  {d.head && <p className="text-sm text-gray-700 dark:text-gray-300">المسؤول: <span className="font-medium">{d.head}</span></p>}
                  {d.phone && <p className="text-sm text-gray-700 dark:text-gray-300">الهاتف: {d.phone}</p>}
                  {d.email && <p className="text-sm text-gray-700 dark:text-gray-300">البريد: <a className="text-blue-600 dark:text-blue-400 hover:underline" href={`mailto:${d.email}`}>{d.email}</a></p>}
                  {d.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{d.description}</p>}
                  {!!(d.subunits && d.subunits.length) && (
                    <div className="mt-3">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">الشعب التابعة:</div>
                      <ul className="list-disc pr-5 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        {d.subunits!.map((s, i) => (<li key={i}>{s}</li>))}
                      </ul>
                    </div>
                  )}
                </section>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full text-center text-sm text-gray-600 dark:text-gray-300">لا توجد نتائج مطابقة لبحثك.</div>
              )}
            </div>

            <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">يمكن تحديث قائمة الأقسام داخلياً لاحقاً عبر أدوات الإدارة.</div>
          </div>
        )}

        {tab === 'chart' && (
          <div>
            {/* View mode switch */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button onClick={() => setViewMode('tree')} className={`px-3 py-2 rounded-lg text-sm border ${viewMode==='tree' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/70 dark:bg-gray-800/70 border-gray-300 dark:border-gray-600'}`}>عرض شجري</button>
              <button onClick={() => setViewMode('org')} className={`px-3 py-2 rounded-lg text-sm border ${viewMode==='org' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/70 dark:bg-gray-800/70 border-gray-300 dark:border-gray-600'}`}>مخطط تنظيمي</button>
              <button onClick={() => setViewMode('hier')} className={`px-3 py-2 rounded-lg text-sm border ${viewMode==='hier' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/70 dark:bg-gray-800/70 border-gray-300 dark:border-gray-600'}`}>مخطط هرمي</button>
              {viewMode !== 'tree' && (
                <div className="ms-auto flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer text-sm bg-white/70 dark:bg-gray-800/70">
                    <FaUpload size={16} />
                    <span>رفع ملف</span>
                    <input type="file" accept="application/pdf,image/*" className="hidden" onChange={onOrgChartSelect} />
                  </label>
                  {orgChart && (
                    <>
                      <button onClick={downloadOrgChart} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white/70 dark:bg-gray-800/70">
                        <FaDownload size={16} /> تنزيل
                      </button>
                      <button onClick={clearOrgChart} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 dark:border-rose-700 dark:text-rose-200 dark:bg-rose-900/30 text-sm">
                        <FaTrash size={16} /> إزالة
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {viewMode === 'tree' && (
              <ChartTree
                departments={departments}
              />
            )}
            {viewMode === 'org' && (
              orgChart ? (
                <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-3 shadow-sm">
                  {orgChart.kind === 'pdf' ? (
                    <iframe title="org-chart" src={orgChart.dataUrl} className="w-full h-[70vh] rounded" />
                  ) : (
                    <div className="w-full flex justify-center">
                      <img src={orgChart.dataUrl} alt="المخطط التنظيمي" className="max-w-full max-h-[70vh] rounded" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/40 dark:bg-gray-800/40 backdrop-blur p-8 text-center text-sm text-gray-600 dark:text-gray-300">
                  لا يوجد مخطط مرفوع حالياً. استخدم زر "رفع ملف" لإضافة ملف PDF أو صورة للمخطط التنظيمي.
                </div>
              )
            )}
            {viewMode === 'hier' && (
              <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/40 dark:bg-gray-800/40 backdrop-blur p-8 text-center text-sm text-gray-600 dark:text-gray-300">
                عرض هرمي تفاعلي — سيتم تطويره لاحقاً.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Tree view component with details panel
const ChartTree: React.FC<{ departments: DepartmentInfo[] }> = ({ departments }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<null | { kind: 'root' | 'dep' | 'sub'; depIdx?: number; subIdx?: number }>(null);
  const toggle = (key: string) => setExpanded((m) => ({ ...m, [key]: !m[key] }));

  const selDep = selected?.kind === 'dep' && selected.depIdx !== undefined ? departments[selected.depIdx] : null;
  const selSub = selected?.kind === 'sub' && selected.depIdx !== undefined && selected.subIdx !== undefined ? {
    dep: departments[selected.depIdx],
    name: departments[selected.depIdx].subunits?.[selected.subIdx] || ''
  } : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ direction: 'ltr' }}>
      {/* Details panel */}
      <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-gray-800/60 backdrop-blur p-4 shadow-sm md:order-1 order-2">
        <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">تفاصيل الوحدة</div>
        {!selected && (
          <div className="flex flex-col items-center justify-center text-center text-sm text-gray-600 dark:text-gray-300 min-h-[140px]">
            <FaBuilding size={28} />
            <div className="mt-2">اختر وحدة من الهيكل التنظيمي لعرض تفاصيلها</div>
          </div>
        )}
        {selected?.kind === 'root' && (
          <div className="text-sm text-gray-700 dark:text-gray-300" dir="rtl">
            <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">مديرية مالية محافظة حلب</div>
            <div>المدير: مدير مالية محافظة حلب</div>
            <div className="mt-2">الهيكل الإداري والتنظيمي — الأقسام والوحدات التابعة.</div>
          </div>
        )}
        {selDep && (
          <div className="text-sm text-gray-700 dark:text-gray-300" dir="rtl">
            <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{selDep.name}</div>
            {selDep.head && <div>المسؤول: {selDep.head}</div>}
            {selDep.phone && <div>الهاتف: {selDep.phone}</div>}
            {selDep.email && <div>البريد: {selDep.email}</div>}
            {selDep.description && <div className="mt-2">{selDep.description}</div>}
          </div>
        )}
        {selSub && (
          <div className="text-sm text-gray-700 dark:text-gray-300" dir="rtl">
            <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{selSub.name}</div>
            <div>تابعة لـ {selSub.dep.name}</div>
          </div>
        )}
      </div>

      {/* Tree panel */}
  <div className="md:col-span-2 rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-gray-800/60 backdrop-blur p-4 shadow-sm md:order-2 order-1" dir="rtl">
        <div className="mb-2">
          <div className="text-sm text-gray-500 dark:text-gray-400">الهيكل الشجري</div>
          <div className="text-base font-semibold text-gray-900 dark:text-gray-100">الهيكل الإداري والتنظيمي لمديرية مالية محافظة حلب</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">المدير: مدير مالية محافظة حلب</div>
        </div>
        <div className="border rounded-xl overflow-hidden border-gray-200 dark:border-gray-700">
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            <li className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => setSelected({ kind: 'root' })}>
              مديرية
            </li>
            {departments.map((d, i) => {
              const key = d.id || `dep-${i}`;
              const open = !!expanded[key];
              return (
                <li key={key} className="">
                  <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => { toggle(key); setSelected({ kind: 'dep', depIdx: i }); }}>
                    <div className="flex items-center gap-2">
                      {open ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}
                      <span className="text-green-500 text-xs">قسم</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{d.name}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{(d.subunits?.length || 0) > 0 ? `${d.subunits!.length} شعبة` : ''}</span>
                  </div>
                  {open && (d.subunits && d.subunits.length > 0) && (
                    <ul className="bg-gray-50/60 dark:bg-gray-800/30">
                      {d.subunits.map((s, si) => (
                        <li key={`${key}-sub-${si}`} className="ps-8 p-2 hover:bg-gray-100 dark:hover:bg-gray-800/60 cursor-pointer" onClick={() => setSelected({ kind: 'sub', depIdx: i, subIdx: si })}>
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DepartmentsPage;
