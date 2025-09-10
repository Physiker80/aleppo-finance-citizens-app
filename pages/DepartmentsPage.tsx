import React, { useEffect, useMemo, useState } from 'react';
import { FaCrown, FaUpload, FaTrash, FaDownload, FaChevronRight, FaChevronDown, FaChevronUp, FaBuilding, FaSearch, FaSearchPlus, FaSearchMinus, FaSync, FaAngleDoubleDown, FaAngleDoubleUp } from 'react-icons/fa';

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
    id: 'general-admin',
    name: 'قسم الإدارة العامة',
    head: 'مدير المديرية',
    description: 'الإشراف العام على المديرية والدعم الإداري والتنفيذي.' ,
    subunits: [
      'دائرة خدمة الجمهور والنافذة الواحدة: شعبة النافذة الواحدة',
      'دائرة خدمة الجمهور والنافذة الواحدة: شعبة التسجيل والبيانات',
      'دائرة خدمة الجمهور والنافذة الواحدة: شعبة المستوى والجودة',
      'دائرة خدمة الجمهور والنافذة الواحدة: شعبة الدعم الإلكتروني والتحويلات',
      'دائرة مكتب المدير: شعبة الشؤون الإدارية والقانونية',
      'دائرة مكتب المدير: شعبة التخطيط والمتابعة',
      'دائرة مكتب المدير: شعبة العلاقات العامة والاتصال',
      'دائرة مكتب المدير: شعبة الشؤون المالية للمكتب',
      'دائرة مكتب المدير: شعبة التقنية والمعلومات'
    ]
  },
  {
    id: 'income',
    name: 'قسم الدخل',
    description: 'إدارة وتحصيل الضرائب والرسوم وفق القوانين النافذة.',
    subunits: [
      'دائرة الضرائب على الأرباح الحقيقية: شعبة المراقبة والتحقق',
      'دائرة الضرائب على الأرباح الحقيقية: شعبة التكاليف الضريبية',
      'دائرة الضرائب على الأرباح الحقيقية: شعبة الطعون والاعتراضات',
      'دائرة الضرائب على الأرباح الحقيقية: شعبة التسجيل والمحفوظات',
      'دائرة الضرائب على الدخل المتطوع: شعبة التسجيل والتصنيف',
      'دائرة الضرائب على الدخل المتطوع: شعبة التحقق والمتابعة',
      'دائرة الضرائب على الدخل المتطوع: شعبة الطعن والتقاص',
      'دائرة الضرائب على الدخل المتطوع: شعبة الإبلاغ والتبليغ',
      'دائرة رسوم التركات والهبات والوصايا: شعبة التحقق والتقييم',
      'دائرة رسوم التركات والهبات والوصايا: شعبة التسجيل والمحفوظات',
      'دائرة رسوم التركات والهبات والوصايا: شعبة الاستعلام والتوثيق',
      'دائرة رسوم التركات والهبات والوصايا: شعبة التحصيل والمتابعة',
      'دائرة الرواتب والأجور وضرائب رأس المال: شعبة الرواتب والأجور',
      'دائرة الرواتب والأجور وضرائب رأس المال: شعبة رؤوس الأموال المتداولة',
      'دائرة الرواتب والأجور وضرائب رأس المال: شعبة التحقق الميداني',
      'دائرة الرواتب والأجور وضرائب رأس المال: شعبة المطابقة والتدقيق',
      'دائرة التدقيق واللجان: شعبة التدقيق الداخلي',
      'دائرة التدقيق واللجان: شعبة اللجان الضريبية',
      'دائرة التدقيق واللجان: شعبة التبليغ والإعلام',
      'دائرة التدقيق واللجان: شعبة المراجعة القانونية',
      'دائرة التحول الرقمي والبيانات: شعبة الأنظمة الإلكترونية',
      'دائرة التحول الرقمي والبيانات: شعبة قواعد البيانات',
      'دائرة التحول الرقمي والبيانات: شعبة التحليل الإحصائي',
      'دائرة التحول الرقمي والبيانات: شعبة الدعم الفني',
      'دائرة الشكاوى وخدمة المكلفين: شعبة استقبال الشكاوى',
      'دائرة الشكاوى وخدمة المكلفين: شعبة التظلمات والاعتراضات',
      'دائرة الشكاوى وخدمة المكلفين: شعبة التوعية الضريبية',
      'دائرة الشكاوى وخدمة المكلفين: شعبة خدمة المكلفين'
    ]
  },
  {
    id: 'large-taxpayers',
    name: 'قسم كبار ومتوسطي المكلفين',
    description: 'إدارة العلاقة مع كبار ومتوسطي المكلفين والتحصيل والتقييم.',
    subunits: [
      'شعبة إدارة علاقات المكلفين',
      'شعبة التحصيل والمتابعة',
      'شعبة التحليل والتقييم',
      'شعبة الدعم الفني والإلكتروني'
    ]
  },
  {
    id: 'debt-collection',
    name: 'قسم المتابعة وإدارة الديون',
    description: 'متابعة وتحصيل الديون المستحقة واتخاذ الإجراءات القانونية.',
    subunits: [
      'دائرة حسابات الجهة والمعاملات: شعبة تحقيق المعاملات وتنظيم الوثائق',
      'دائرة حسابات الجهة والمعاملات: شعبة حسابات الجهة',
      'دائرة حسابات الجهة والمعاملات: شعبة الوثائق والصندوق',
      'دائرة حسابات الجهة والمعاملات: شعبة تقليل الإصدارات',
      'دائرة الإجراءات والتقنية: شعبة الإجراءات',
      'دائرة الإجراءات والتقنية: شعبة إعداد المعالجات والطبع القانونية',
      'دائرة الإجراءات والتقنية: شعبة تحصيل أموال الزراعي والإدارات والهيئات العامة',
      'دائرة الإجراءات والتقنية: شعبة التحصيل الاجتماعي',
      'دائرة الإجراءات والتقنية: شعبة تحقق الذمم الشخصية',
      'دائرة تحصيل الأموال العامة: شعبة تحصيل التكاليف',
      'دائرة تحصيل الأموال العامة: شعبة تحصيل الأموال العامة'
    ]
  },
  {
    id: 'imports',
    name: 'قسم الواردات',
    description: 'تحصيل الرسوم والضرائب على الواردات والتدقيق المرتبط بها.',
    subunits: [
      'شعبة الرسم على الاستهلاك والإنتاج',
      'شعبة الرسوم الجمركية المباشرة',
      'شعبة الرسوم غير المباشرة والرسوم الملحقة',
      'شعبة رسم الطابع والرسوم الملحقة',
      'شعبة المراقبة والتدقيق',
      'شعبة الحاسب الآلي والمعالجة الإلكترونية',
      'شعبة الإرشاد والاستشارات'
    ]
  },
  {
    id: 'internal-audit',
    name: 'قسم الرقابة الداخلية',
    description: 'الامتثال والمراجعة الداخلية وتقييم المخاطر.',
    subunits: [
      'شعبة المتابعة والتدقيق',
      'شعبة الرقابة والتحقيق',
      'شعبة المراجعة الداخلية',
      'شعبة تقييم المخاطر والامتثال'
    ]
  },
  {
    id: 'informatics',
    name: 'قسم المعلوماتية',
    description: 'تطوير الأنظمة الإلكترونية والدعم الفني والبيانات.',
    subunits: [
      'شعبة التحليل والتصميم',
      'شعبة التطوير والبرمجة',
      'شعبة الأنظمة والشبكات',
      'شعبة الدعم الفني والصيانة',
      'شعبة البيانات والتقارير'
    ]
  },
  {
    id: 'admin-development',
    name: 'قسم التنمية الإدارية',
    description: 'تطوير الهياكل والإجراءات والموارد البشرية والتحول الرقمي.',
    subunits: [
      'دائرة التنمية الإدارية: شعبة تطوير الهياكل التنظيمية',
      'دائرة التنمية الإدارية: شعبة تحسين العمليات الإدارية',
      'دائرة التنمية الإدارية: شعبة الجودة والتميز المؤسسي',
      'دائرة التنمية الإدارية: شعبة الابتكار والإبداع الإداري',
      'دائرة الموارد البشرية: شعبة التوظيف والاختيار',
      'دائرة الموارد البشرية: شعبة التدريب والتطوير',
      'دائرة الموارد البشرية: شعبة الرواتب والمكافآت',
      'دائرة الموارد البشرية: شعبة التقييم والأداء',
      'دائرة الشؤون المالية والإدارية: شعبة الموازنة والاعتمادات',
      'دائرة الشؤون المالية والإدارية: شعبة النفقات والتصفية',
      'دائرة الشؤون المالية والإدارية: شعبة المشتريات والمستودعات',
      'دائرة الشؤون المالية والإدارية: شعبة المراجعة الداخلية',
      'دائرة نظم المعلومات والإدارة الإلكترونية: شعبة التحول الرقمي',
      'دائرة نظم المعلومات والإدارة الإلكترونية: شعبة قواعد البيانات',
      'دائرة نظم المعلومات والإدارة الإلكترونية: شعبة الدعم الفني',
      'دائرة نظم المعلومات والإدارة الإلكترونية: شعبة الأتمتة الإدارية',
      'دائرة الشؤون القانونية: شعبة التوثيق والمحفوظات',
      'دائرة الشؤون القانونية: شعبة الصياغة والتشريعات',
      'دائرة الشؤون القانونية: شعبة المنازعات والمطالبات',
      'دائرة الشؤون القانونية: شعبة الامتثال والالتزام',
      'دائرة خدمة الجمهور والعلاقات: شعبة استقبال المراجعين',
      'دائرة خدمة الجمهور والعلاقات: شعبة الشكاوى والمقترحات',
      'دائرة خدمة الجمهور والعلاقات: شعبة التواصل المؤسسي',
      'دائرة خدمة الجمهور والعلاقات: شعبة التظلمات والشكاوى'
    ]
  },
  {
    id: 'inquiry',
    name: 'قسم الاستعلام',
    description: 'توفير المعلومات والبيانات المالية وخدمة الجمهور إلكترونياً.',
    subunits: [
      'دائرة الخدمات الإلكترونية: شعبة البوابة الإلكترونية والمنصات الرقمية',
      'دائرة الخدمات الإلكترونية: شعبة تطبيقات الهاتف المحمول',
      'دائرة الخدمات الإلكترونية: شعبة وسائل التواصل الاجتماعي',
      'دائرة خدمة الجمهور: شعبة الاستعلامات المباشرة',
      'دائرة خدمة الجمهور: شعبة الشكاوى والمقترحات',
      'دائرة خدمة الجمهور: شعبة المركز الواحد',
      'دائرة المعلومات والبيانات المالية: شعبة قواعد البيانات المالية',
      'دائرة المعلومات والبيانات المالية: شعبة الإحصاء والتقارير',
      'دائرة المعلومات والبيانات المالية: شعبة النشر والشفافية',
      'دائرة الدعم الفني والتدريب: شعبة الدعم الفني للمواطنين',
      'دائرة الدعم الفني والتدريب: شعبة التدريب والتأهيل',
      'دائرة الدعم الفني والتدريب: شعبة الجودة والرضا',
      'دائرة الشؤون القانونية والإجراءات: شعبة التوثيق القانوني',
      'دائرة الشؤون القانونية والإجراءات: شعبة الإجراءات والأنظمة',
      'دائرة الشؤون القانونية والإجراءات: شعبة حماية البيانات'
    ]
  },
  {
    id: 'treasury',
    name: 'قسم الخزينة',
    description: 'إدارة الخزينة المركزية والحسابات والمشاريع والأنظمة المالية.',
    subunits: [
      'مكتب الشؤون الإدارية',
      'دائرة الحسابات العامة والموازنة: شعبة حسابات الموازنة العامة',
      'دائرة الحسابات العامة والموازنة: شعبة الواردات والنفقات',
      'دائرة الحسابات العامة والموازنة: شعبة التوثيق والمصادقة',
      'دائرة الحسابات العامة والموازنة: شعبة المراجعة الداخلية',
      'دائرة الخزينة المركزية: شعبة الصندوق والنقدية',
      'دائرة الخزينة المركزية: شعبة الحسابات المصرفية',
      'دائرة الخزينة المركزية: شعبة حركة النقد',
      'دائرة الخزينة المركزية: شعبة الأوراق المالية والطوابع',
      'دائرة السلف والأمانات: شعبة السلف الدائمة والمؤقتة',
      'دائرة السلف والأمانات: شعبة الأمانات النقدية',
      'دائرة السلف والأمانات: شعبة الضمانات والكفالات',
      'دائرة السلف والأمانات: شعبة متابعة التسديد',
      'دائرة المشاريع والتمويل: شعبة تمويل المشاريع',
      'دائرة المشاريع والتمويل: شعبة متابعة الصرف',
      'دائرة المشاريع والتمويل: شعبة التسويات',
      'دائرة الأنظمة المالية الإلكترونية: شعبة الدفع الإلكتروني',
      'دائرة الأنظمة المالية الإلكترونية: شعبة الحوكمة الإلكترونية',
      'دائرة الأنظمة المالية الإلكترونية: شعبة دعم الأنظمة'
    ]
  }
];

const DepartmentsPage: React.FC = () => {
  // Departments state synced with localStorage
  const [depItems, setDepItems] = useState<DepartmentInfo[]>(DEFAULT_DEPARTMENTS);
  const departments = depItems;
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'overview' | 'list' | 'chart'>('overview');
  const [viewMode, setViewMode] = useState<'tree' | 'org' | 'interactive'>('tree');
  const [manageOpen, setManageOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkMode, setBulkMode] = useState<'replace' | 'append'>('replace');
  const bulkPdfRef = React.useRef<HTMLInputElement | null>(null);
  const [detailsDept, setDetailsDept] = useState<DepartmentInfo | null>(null);
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
  // Allow manage UI only when manager and explicitly launched with manage=1 (from dashboard)
  const allowManage = useMemo(() => {
    const hash = window.location.hash || '';
    const qs = hash.split('?')[1] || '';
    const params = new URLSearchParams(qs);
    return isManager && params.get('manage') === '1';
  }, [isManager]);

  // Defaults for overview content
  const [leaderName, setLeaderName] = useState('السيد أحمد محمد الأحمد');
  const [leaderTitle, setLeaderTitle] = useState('المسؤول الأول عن إدارة الشؤون المالية للمحافظة');
  const DEFAULT_ABOUT = 'تعتبر مديرية مالية محافظة حلب إحدى المؤسسات الحكومية الرائدة في الجمهورية العربية السورية والتي تُعنى بإدارة الشؤون المالية والمحاسبية للمحافظة. تأسست المديرية عام 1949 وتضم ما يقارب 280 موظفاً وموظفة يعملون في 8 أقسام رئيسية متخصصة في مختلف جوانب العمل المالي والإداري.';
  const [aboutText, setAboutText] = useState(DEFAULT_ABOUT);
  const [stats, setStats] = useState({ totalEmployees: 280, mainDepartments: 10, subUnits: 126, yearsOfService: 75 });
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState('');
  const [editingLeader, setEditingLeader] = useState(false);
  const [leaderDraft, setLeaderDraft] = useState({ name: '', title: '' });
  const [editingStats, setEditingStats] = useState(false);
  const [statsDraft, setStatsDraft] = useState({ totalEmployees: 280, mainDepartments: 10, subUnits: 126, yearsOfService: 75 });

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
  const saveLeader = () => {
    try {
      const name = (leaderDraft.name || leaderName).trim();
      const title = (leaderDraft.title || leaderTitle).trim();
      const payload = { name, title };
      localStorage.setItem('departmentsLeader', JSON.stringify(payload));
      setLeaderName(name);
      setLeaderTitle(title);
      setEditingLeader(false);
    } catch {
      alert('تعذر حفظ بيانات القيادة.');
    }
  };
  const resetLeader = () => {
    if (!confirm('سيتم استعادة بيانات القيادة الافتراضية. متابعة؟')) return;
    try { localStorage.removeItem('departmentsLeader'); } catch { /* noop */ }
    setLeaderName('السيد أحمد محمد الأحمد');
    setLeaderTitle('المسؤول الأول عن إدارة الشؤون المالية للمحافظة');
    setEditingLeader(false);
  };

  const saveStatsDraft = () => {
    try {
      const normalized = {
        totalEmployees: Number(statsDraft.totalEmployees) || 0,
        mainDepartments: Number(statsDraft.mainDepartments) || 0,
        subUnits: Number(statsDraft.subUnits) || 0,
        yearsOfService: Number(statsDraft.yearsOfService) || 0,
      };
      localStorage.setItem('departmentsStats', JSON.stringify(normalized));
      setStats(normalized);
      setEditingStats(false);
    } catch {
      alert('تعذر حفظ الإحصائيات.');
    }
  };
  const resetStats = () => {
    if (!confirm('سيتم استعادة الإحصائيات الافتراضية. متابعة؟')) return;
    try { localStorage.removeItem('departmentsStats'); } catch { /* noop */ }
    setStats({ totalEmployees: 280, mainDepartments: 10, subUnits: 126, yearsOfService: 75 });
    setEditingStats(false);
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
  // notify other pages that depend on the departments list
  try { window.dispatchEvent(new Event('departmentsListUpdated')); } catch {}
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
        // Prefer a real module worker via workerPort when available
        // @ts-ignore Vite returns a Worker constructor for ?worker imports
        const PdfJsWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?worker')).default as any;
        // @ts-ignore Support workerPort if available
        pdfjs.GlobalWorkerOptions.workerPort = new PdfJsWorker();
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

  // Close details with Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDetailsDept(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
              {!editingLeader ? (
                <>
                  <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">{leaderName}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{leaderTitle}</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">الإدارة العليا</div>
                  {allowManage && (
                    <div className="mt-3">
                      <button onClick={() => { setLeaderDraft({ name: leaderName, title: leaderTitle }); setEditingLeader(true); }} className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70">تحرير</button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-left" dir="rtl">
                  <div className="grid md:grid-cols-2 gap-3 text-right">
                    <label className="text-sm">الاسم
                      <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={leaderDraft.name} onChange={(e) => setLeaderDraft((d) => ({ ...d, name: e.target.value }))} />
                    </label>
                    <label className="text-sm">المنصب/الصفة
                      <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={leaderDraft.title} onChange={(e) => setLeaderDraft((d) => ({ ...d, title: e.target.value }))} />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={saveLeader} className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">حفظ</button>
                    <button onClick={() => setEditingLeader(false)} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">إلغاء</button>
                    <button onClick={resetLeader} className="px-4 py-2 rounded border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:bg-amber-900/30 text-sm">استعادة الافتراضي</button>
                  </div>
                </div>
              )}
            </div>

            {/* Stats tiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-3">
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
            {allowManage && !editingStats && (
              <div className="mb-5 text-center">
                <button onClick={() => { setStatsDraft(stats); setEditingStats(true); }} className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70">تحرير الإحصائيات</button>
              </div>
            )}
            {allowManage && editingStats && (
              <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-4 shadow-sm mb-5">
                <div className="grid md:grid-cols-4 gap-3">
                  <label className="text-sm">الموظفون
                    <input type="number" className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={statsDraft.totalEmployees} onChange={(e) => setStatsDraft((s) => ({ ...s, totalEmployees: Number(e.target.value) }))} />
                  </label>
                  <label className="text-sm">الأقسام الرئيسية
                    <input type="number" className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={statsDraft.mainDepartments} onChange={(e) => setStatsDraft((s) => ({ ...s, mainDepartments: Number(e.target.value) }))} />
                  </label>
                  <label className="text-sm">الوحدات الفرعية
                    <input type="number" className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={statsDraft.subUnits} onChange={(e) => setStatsDraft((s) => ({ ...s, subUnits: Number(e.target.value) }))} />
                  </label>
                  <label className="text-sm">سنوات الخدمة
                    <input type="number" className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={statsDraft.yearsOfService} onChange={(e) => setStatsDraft((s) => ({ ...s, yearsOfService: Number(e.target.value) }))} />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={saveStatsDraft} className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">حفظ</button>
                  <button onClick={() => setEditingStats(false)} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">إلغاء</button>
                  <button onClick={resetStats} className="px-4 py-2 rounded border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:bg-amber-900/30 text-sm">استعادة الافتراضي</button>
                </div>
              </div>
            )}

            {/* About */}
            <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">نبذة عن المديرية</h3>
                {allowManage && !editingAbout && (
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
              {allowManage && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setManageOpen((v) => !v)} className="px-4 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70">
                    {manageOpen ? 'إخفاء الإدارة' : 'إدارة الأقسام'}
                  </button>
                  <button onClick={startAdd} className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700">إضافة قسم</button>
                  <button onClick={() => setBulkOpen((v) => !v)} className="px-4 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70">إدخال مجمّع</button>
                </div>
              )}
            </div>

            {allowManage && bulkOpen && (
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

            {allowManage && manageOpen && (
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
                                <button onClick={() => {
                                  if (i === 0) return; const next = [...departments];
                                  const tmp = next[i-1]; next[i-1] = next[i]; next[i] = tmp; persistDepartments(next);
                                }} className="text-gray-600 dark:text-gray-300 hover:underline" title="تحريك للأعلى">▲</button>
                                <button onClick={() => {
                                  if (i === departments.length - 1) return; const next = [...departments];
                                  const tmp = next[i+1]; next[i+1] = next[i]; next[i] = tmp; persistDepartments(next);
                                }} className="text-gray-600 dark:text-gray-300 hover:underline" title="تحريك للأسفل">▼</button>
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
              {filtered.map((d) => {
                const subCount = d.subunits?.length || 0;
                const groups = new Set<string>();
                (d.subunits || []).forEach((s) => { const p = s.split(':'); if (p.length > 1) groups.add(p[0].trim()); });
                const grpCount = groups.size;
                const hasContact = !!(d.phone || d.email);
                return (
                  <section key={d.id} className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{d.name}</h2>
                        {d.head && <p className="text-sm text-gray-700 dark:text-gray-300">المسؤول: <span className="font-medium">{d.head}</span></p>}
                        {d.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{d.description}</p>}
                      </div>
                      <div className="shrink-0">
                        <button onClick={() => setDetailsDept(d)} className="px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700">تفاصيل</button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700">{subCount} شعب</span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700">{grpCount} دوائر</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border ${hasContact ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-700' : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-700'}`}>{hasContact ? 'معلومات اتصال' : 'بدون اتصال'}</span>
                    </div>
                  </section>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-full text-center text-sm text-gray-600 dark:text-gray-300">لا توجد نتائج مطابقة لبحثك.</div>
              )}
            </div>

            {/* Details panel */}
            {detailsDept && (
              <div className="fixed inset-0 z-40">
                <div className="absolute inset-0 bg-black/30" onClick={() => setDetailsDept(null)} />
                <div className="absolute right-0 top-0 h-full w-full md:w-[520px] bg-white/90 dark:bg-gray-900/90 backdrop-blur border-l border-white/20 dark:border-white/10 shadow-xl animate-fade-in-up p-5 overflow-y-auto" dir="rtl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">تفاصيل القسم</h3>
                    <button onClick={() => setDetailsDept(null)} className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-sm">إغلاق</button>
                  </div>
                  <div className="mt-3">
                    <div className="text-xl font-semibold text-gray-900 dark:text-white">{detailsDept.name}</div>
                    {detailsDept.head && <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">المسؤول: {detailsDept.head}</div>}
                    {(detailsDept.phone || detailsDept.email) && (
                      <div className="mt-1 text-sm text-gray-700 dark:text-gray-300 flex flex-col gap-1">
                        {detailsDept.phone && <div>الهاتف: {detailsDept.phone}</div>}
                        {detailsDept.email && <div>البريد: <a className="text-blue-600 dark:text-blue-400 hover:underline" href={`mailto:${detailsDept.email}`}>{detailsDept.email}</a></div>}
                      </div>
                    )}
                    {detailsDept.description && <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{detailsDept.description}</p>}

                    {/* Grouped subunits */}
                    {!!(detailsDept.subunits && detailsDept.subunits.length) && (
                      <div className="mt-4">
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">الوحدات التابعة</div>
                        {(() => {
                          const grouped: Record<string, string[]> = {};
                          (detailsDept.subunits || []).forEach((s) => {
                            const parts = s.split(':');
                            if (parts.length >= 2) {
                              const grp = parts[0].trim();
                              const leaf = parts.slice(1).join(':').trim();
                              grouped[grp] = grouped[grp] || [];
                              grouped[grp].push(leaf);
                            } else {
                              grouped['__flat__'] = grouped['__flat__'] || [];
                              grouped['__flat__'].push(s.trim());
                            }
                          });
                          const keys = Object.keys(grouped);
                          return (
                            <div className="space-y-3">
                              {keys.map((k) => (
                                <div key={k} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                  {k !== '__flat__' && (
                                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-sm font-medium">{k}</div>
                                  )}
                                  <ul className="px-4 py-2 list-disc pr-5 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                    {grouped[k].map((leaf, i) => (<li key={i}>{leaf}</li>))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">يمكن تحديث قائمة الأقسام داخلياً لاحقاً عبر أدوات الإدارة.</div>
          </div>
        )}

        {tab === 'chart' && (
          <div>
            {/* View mode switch */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button onClick={() => setViewMode('tree')} className={`px-3 py-2 rounded-lg text-sm border ${viewMode==='tree' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/70 dark:bg-gray-800/70 border-gray-300 dark:border-gray-600'}`}>عرض شجري</button>
              <button onClick={() => setViewMode('org')} className={`px-3 py-2 rounded-lg text-sm border ${viewMode==='org' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/70 dark:bg-gray-800/70 border-gray-300 dark:border-gray-600'}`}>مخطط تنظيمي</button>
                  <button onClick={() => setViewMode('interactive')} className={`px-3 py-2 rounded-lg text-sm border ${viewMode==='interactive' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/70 dark:bg-gray-800/70 border-gray-300 dark:border-gray-600'}`}>مخطط تفاعلي</button>
              {viewMode === 'org' && (
                <div className="ms-auto flex items-center gap-2">
                  {allowManage && (
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer text-sm bg-white/70 dark:bg-gray-800/70">
                      <FaUpload size={16} />
                      <span>إضافة</span>
                      <input type="file" accept="application/pdf,image/*" className="hidden" onChange={onOrgChartSelect} />
                    </label>
                  )}
                  {orgChart && (
                    <button onClick={downloadOrgChart} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white/70 dark:bg-gray-800/70">
                      <FaDownload size={16} /> تنزيل
                    </button>
                  )}
                  {allowManage && orgChart && (
                    <button onClick={clearOrgChart} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 dark:border-rose-700 dark:text-rose-200 dark:bg-rose-900/30 text-sm">
                      <FaTrash size={16} /> إزالة
                    </button>
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
      لا يوجد مخطط مرفوع حالياً.
                </div>
              )
            )}
            {viewMode === 'interactive' && (
              <InteractiveOrgChart departments={departments} />
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

// =========================
// Interactive Org Chart (collapsible tree with search and zoom)
// =========================

type NodeType = 'root' | 'قسم' | 'دائرة' | 'شعبة' | 'جهة';
type OrgNode = { name: string; type: NodeType; children?: OrgNode[] };

const toOrgTree = (departments: DepartmentInfo[]): OrgNode => {
  // Group subunits under groups split by ':' as دوائر; ungrouped as شعب
  const deptNodes: OrgNode[] = departments.map((dep) => {
    const grouped: Record<string, string[]> = {};
    (dep.subunits || []).forEach((s) => {
      const parts = s.split(':');
      if (parts.length >= 2) {
        const grp = parts[0].trim();
        const leaf = parts.slice(1).join(':').trim();
        if (!grouped[grp]) grouped[grp] = [];
        grouped[grp].push(leaf);
      } else {
        if (!grouped['__flat__']) grouped['__flat__'] = [];
        grouped['__flat__'].push(s.trim());
      }
    });
    const children: OrgNode[] = [];
    Object.keys(grouped).forEach((k) => {
      if (k === '__flat__') {
        grouped[k].forEach((leaf) => children.push({ name: leaf, type: 'شعبة' }));
      } else {
        const grpType: NodeType = /\bدائرة\b/u.test(k) ? 'دائرة' : 'جهة';
        children.push({
          name: k,
          type: grpType,
          children: grouped[k].map((leaf) => ({ name: leaf, type: 'شعبة' })),
        });
      }
    });
    return { name: dep.name, type: 'قسم', children };
  });
  return { name: 'مديرية مالية محافظة حلب', type: 'root', children: deptNodes };
};

const InteractiveOrgChart: React.FC<{ departments: DepartmentInfo[] }> = ({ departments }) => {
  const [query, setQuery] = useState('');
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [scale, setScale] = useState<number>(1);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const orgData = useMemo(() => toOrgTree(departments), [departments]);

  // collect all path keys
  const getAllKeys = (node: OrgNode, acc: string[] = [], path: string[] = []) => {
    const key = [...path, node.name].join('/');
    acc.push(key);
    (node.children || []).forEach((c) => getAllKeys(c, acc, [...path, node.name]));
    return acc;
  };

  useEffect(() => {
    const all = getAllKeys(orgData);
    // open only root initially
    setOpenKeys(new Set([all[0]]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgData.name]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return orgData;
    const pred = (name: string) => name.toLowerCase().includes(q.toLowerCase());
    const filterTree = (node: OrgNode): OrgNode | null => {
      const match = pred(node.name);
      const kids = (node.children || []).map(filterTree).filter(Boolean) as OrgNode[];
      if (match || kids.length) return { ...node, children: kids };
      return null;
    };
    return filterTree(orgData) || { ...orgData, children: [] };
  }, [orgData, query]);

  const expandAll = () => { setOpenKeys(new Set(getAllKeys(orgData))); };
  const collapseAll = () => { setOpenKeys(new Set([orgData.name])); };
  const toggleKey = (key: string) => {
    setOpenKeys((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  };
  const handleWheelZoom = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      setScale((s) => Math.min(2, Math.max(0.5, s - Math.sign(e.deltaY) * 0.05)));
    }
  };

  return (
    <div dir="rtl" className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-3 shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-3">
        <div className="text-base font-semibold text-gray-900 dark:text-gray-100">الفلوشارت التفاعلي — الهيكل الإداري والتنظيمي</div>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><FaSearch size={14} /></span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن قسم/دائرة/شعبة..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/70 text-sm" />
          </div>
          <div className="flex gap-2">
            <button onClick={expandAll} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/70"><FaAngleDoubleDown /> فتح الكل</button>
            <button onClick={collapseAll} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/70"><FaAngleDoubleUp /> طيّ الكل</button>
          </div>
          <div className="flex items-center gap-2">
            <FaSearchMinus />
            <input type="range" min={0.5} max={2} step={0.01} value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-40" />
            <FaSearchPlus />
            <button onClick={() => setScale(1)} className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/70" title="إعادة الضبط"><FaSync /></button>
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div ref={containerRef} onWheel={handleWheelZoom} className="overflow-auto border rounded-2xl p-6 bg-white/90 dark:bg-gray-900/60 shadow-sm" style={{ direction: 'rtl' }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top right' }}>
          <InteractiveTree node={filtered} openKeys={openKeys} toggleKey={toggleKey} path={[]} query={query} />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">تلميح: استخدم Ctrl + عجلة الفأرة للتكبير/التصغير.</p>
      </div>
    </div>
  );
};

type ITreeProps = { node: OrgNode; openKeys: Set<string>; toggleKey: (k: string) => void; path: string[]; query: string };

const InteractiveTree: React.FC<ITreeProps> = ({ node, openKeys, toggleKey, path, query }) => {
  const key = [...path, node.name].join('/');
  const isOpen = openKeys.has(key);
  const hasChildren = !!(node.children && node.children.length);
  const highlighted = useMemo(() => highlight(node.name, query), [node.name, query]);

  return (
    <div className="relative flex flex-col items-center">
      <InteractiveTreeNode name={node.name} type={node.type} hasChildren={hasChildren} isOpen={isOpen} onToggle={() => toggleKey(key)} highlightedName={highlighted} />
      {hasChildren && isOpen && (
        <div className="flex flex-col items-stretch">
          <div className="h-6 w-px bg-gray-300 mx-auto" />
          <div className="relative">
            <div className="absolute top-0 left-0 right-0 mx-6 h-px bg-gray-300" />
            <div className="flex flex-wrap items-start justify-center gap-6 pt-3">
              {node.children!.map((child, i) => (
                <div key={i} className="relative flex flex-col items-center">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-3 w-px bg-gray-300" />
                  <InteractiveTree node={child} openKeys={openKeys} toggleKey={toggleKey} path={[...path, node.name]} query={query} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InteractiveTreeNode: React.FC<{ name: string; type: NodeType; hasChildren: boolean; isOpen: boolean; onToggle: () => void; highlightedName: React.ReactNode }> = ({ name, type, hasChildren, isOpen, onToggle, highlightedName }) => {
  const badgeStyles: Record<NodeType, string> = {
    root: 'bg-blue-600 text-white',
    'قسم': 'bg-emerald-600 text-white',
    'دائرة': 'bg-amber-500 text-black',
    'شعبة': 'bg-gray-200 text-gray-800',
    'جهة': 'bg-indigo-100 text-indigo-800',
  };
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm hover:shadow transition-shadow">
      {hasChildren ? (
        <button onClick={onToggle} aria-label={isOpen ? 'طي الفرع' : 'فتح الفرع'} className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800">
          {isOpen ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      ) : (
        <span className="inline-flex w-8" />
      )}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center rounded-xl px-2 py-0.5 text-[0.7rem] ${badgeStyles[type]}`}>{type}</span>
        <span className="font-medium leading-relaxed">{highlightedName}</span>
      </div>
    </div>
  );
};

function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <span>
      {before}
      <mark className="bg-yellow-200 rounded px-0.5">{match}</mark>
      {after}
    </span>
  );
}
