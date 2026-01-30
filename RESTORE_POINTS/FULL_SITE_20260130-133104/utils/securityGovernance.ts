import { GovernanceState, PolicyComplianceResult, SecurityPolicies, SecurityViolation, SecurityOrgUnit, PolicyException } from '../types';
import { incidentPlan } from './incidentResponse';
import { auditLogger } from './auditLogger';

const STORAGE_KEY = 'governance_state';

function loadState(): GovernanceState | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as GovernanceState : null; } catch { return null; }
}
function saveState(state: GovernanceState) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} }

function orgStructureSeed(): SecurityOrgUnit {
  return {
    name: 'لجنة الأمان التنفيذية',
    children: [
      {
        name: 'مسؤول أمن المعلومات (CISO)',
        children: [
          {
            name: 'فريق الأمان التشغيلي',
            children: [
              { name: 'محللو الأمان' },
              { name: 'مهندسو الأمان' },
              { name: 'فريق الاستجابة للحوادث' },
            ]
          },
          {
            name: 'فريق الحوكمة والامتثال',
            children: [
              { name: 'مسؤول الامتثال' },
              { name: 'مراجعو السياسات' },
              { name: 'منسقو التدريب' },
            ]
          },
          {
            name: 'فريق إدارة المخاطر',
            children: [
              { name: 'محللو المخاطر' },
              { name: 'مقيمو الثغرات' },
              { name: 'مخططو استمرارية الأعمال' },
            ]
          }
        ]
      },
      {
        name: 'مسؤولو الأقسام',
        children: [
          { name: 'ممثلو الأمان القسمي' },
          { name: 'منسقو الامتثال القسمي' },
        ]
      }
    ]
  };
}

function policiesSeed(): SecurityPolicies {
  return {
    accessControl: {
      title: 'سياسة التحكم بالوصول',
      version: '2.0',
      effectiveDate: '2025-01-01',
      rules: [
        'يجب استخدام مبدأ الصلاحيات الأدنى',
        'المراجعة الدورية للصلاحيات كل 90 يوم',
        'إلغاء الوصول فوراً عند انتهاء الحاجة',
        'توثيق جميع طلبات الوصول الاستثنائية'
      ],
      owner: 'CISO',
      approvers: ['CISO','مدير تقنية المعلومات'],
      nextReviewDate: '2026-01-01',
      lastApprovedAt: '2025-01-02',
      status: 'active'
    },
    passwordPolicy: {
      title: 'سياسة كلمات المرور',
      version: '1.5',
      requirements: {
        minLength: 12,
        complexity: { uppercase: true, lowercase: true, numbers: true, symbols: true },
        expiry: 90,
        history: 12,
        lockout: { attempts: 5, duration: 30 }
      },
      owner: 'مسؤول الهوية',
      approvers: ['CISO'],
      nextReviewDate: '2026-03-01',
      lastApprovedAt: '2025-03-01',
      status: 'active'
    },
    encryptionPolicy: {
      title: 'سياسة التشفير',
      version: '1.2',
      standards: { inTransit: 'TLS 1.3', atRest: 'AES-256-GCM', keyManagement: 'NIST SP 800-57', hashAlgorithm: 'SHA-256 minimum' },
      owner: 'مسؤول الأمن التقني',
      approvers: ['CISO'],
      nextReviewDate: '2026-06-01',
      lastApprovedAt: '2025-06-01',
      status: 'active'
    },
    incidentResponse: {
      title: 'سياسة الاستجابة للحوادث',
      version: '2.1',
      procedures: { detection: '15 دقيقة', containment: '30 دقيقة', escalation: 'فوري للحوادث الحرجة', communication: 'تحديثات كل ساعة', documentation: 'تقرير كامل خلال 48 ساعة' },
      owner: 'قائد فريق الاستجابة للحوادث',
      approvers: ['CISO'],
      nextReviewDate: '2026-02-01',
      lastApprovedAt: '2025-02-01',
      status: 'active'
    }
  };
}

export class SecurityPolicyFramework {
  state: GovernanceState;
  onUpdate?: (state: GovernanceState) => void;

  constructor() {
    const existing = loadState();
    this.state = existing || { orgStructure: orgStructureSeed(), policies: policiesSeed(), violations: [], exceptions: [] };
  }

  private persist() { saveState(this.state); this.onUpdate?.(this.state); }

  getPolicies(): SecurityPolicies { return this.state.policies; }
  getOrgStructure(): SecurityOrgUnit { return this.state.orgStructure; }
  getViolations(): SecurityViolation[] { return this.state.violations; }
  getExceptions(): PolicyException[] { return this.state.exceptions || []; }

  // Lifecycle management
  updatePolicyLifecycle(policyName: keyof SecurityPolicies, updates: Partial<{ owner: string; approvers: string[]; nextReviewDate: string; lastApprovedAt: string; status: 'draft'|'active'|'under_review'; version: string }>) {
    const p = (this.state.policies as any)[policyName];
    if (!p) return;
    Object.assign(p, updates || {});
    // Audit
    auditLogger.logSystemConfigurationChange(`policy.${String(policyName)}`, {}, updates, 'SYSTEM', 'تحديث حالة دورة حياة السياسة');
    this.persist();
  }

  // Exceptions registry
  addException(exc: Omit<PolicyException, 'id'|'createdAt'|'status'> & { status?: PolicyException['status'] }): PolicyException {
    const ex: PolicyException = {
      id: `EXC-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      createdAt: new Date().toISOString(),
      status: exc.status || 'pending',
      ...exc
    };
    if (!this.state.exceptions) this.state.exceptions = [];
    this.state.exceptions.unshift(ex);
    auditLogger.logSystemConfigurationChange('policy.exception.add', null, ex, 'SYSTEM', `إضافة استثناء لسياسة ${String(exc.policy)}`);
    this.persist();
    return ex;
  }
  approveException(id: string, approver: string) {
    const ex = (this.state.exceptions || []).find(e => e.id === id);
    if (!ex) return;
    ex.status = 'approved';
    ex.approvedBy = approver;
    auditLogger.logSystemConfigurationChange('policy.exception.approve', { id }, { approvedBy: approver }, 'SYSTEM');
    this.persist();
  }
  revokeException(id: string, reason?: string) {
    const ex = (this.state.exceptions || []).find(e => e.id === id);
    if (!ex) return;
    ex.status = 'revoked';
    auditLogger.logSystemConfigurationChange('policy.exception.revoke', { id }, { reason }, 'SYSTEM');
    this.persist();
  }

  async enforcePolicy(policyName: keyof SecurityPolicies, context?: any): Promise<PolicyComplianceResult> {
    const policy = this.state.policies[policyName];
    if (!policy) throw new Error(`السياسة ${String(policyName)} غير موجودة`);
    const compliance = await this.checkCompliance(policyName, context);
    if (!compliance.compliant) {
      await this.logViolation({ policy: String(policyName), context, violations: compliance.violations, timestamp: new Date().toISOString() });
      await this.takeCorrectiveAction(policyName, compliance.violations, context);
    }
    return compliance;
  }

  private async checkCompliance(policyName: keyof SecurityPolicies, context?: any): Promise<PolicyComplianceResult> {
    // Realistic checks using available data and context.
    const violations: string[] = [];

    // Apply exceptions: if any approved exception matches policy and scope, short-circuit compliance
    const approved = (this.state.exceptions || []).filter(e => e.status === 'approved' && (e.policy === policyName || e.policy === String(policyName)));
    const scope = context?.scope || context?.username || context?.route || '*';
    if (approved.some(e => !e.expiresAt || new Date(e.expiresAt) > new Date())) {
      const hasScope = approved.some(e => !e.scope || e.scope === '*' || e.scope === scope);
      if (hasScope) return { compliant: true, violations: [] };
    }

    if (policyName === 'accessControl') {
      // Use employees RBAC assignments from localStorage
      try {
        const employeesRaw = localStorage.getItem('employees');
        const employees = employeesRaw ? JSON.parse(employeesRaw) as any[] : [];
        if (context?.username) {
          const emp = employees.find(e => e.username === context.username);
          if (!emp) violations.push('طلب وصول لمستخدم غير معروف');
          if (context?.requestedPrivilege === 'admin' && !context?.justification) {
            violations.push('منح صلاحية عليا دون مبرر مكتوب');
          }
          if (context?.requestedDepartment && emp && emp.department !== context.requestedDepartment && emp.role !== 'مدير') {
            violations.push('طلب وصول خارج نطاق القسم دون موافقة مدير');
          }
        }
      } catch {}
    } else if (policyName === 'passwordPolicy') {
      const req = this.state.policies.passwordPolicy.requirements;
      // Check password content when provided
      const pwd: string = context?.password || '';
      if (pwd) {
        if (pwd.length < req.minLength) violations.push('طول كلمة المرور أقل من الحد الأدنى');
        if (req.complexity.uppercase && !/[A-Z]/.test(pwd)) violations.push('يجب احتواء كلمة المرور على حرف كبير');
        if (req.complexity.lowercase && !/[a-z]/.test(pwd)) violations.push('يجب احتواء كلمة المرور على حرف صغير');
        if (req.complexity.numbers && !/[0-9]/.test(pwd)) violations.push('يجب احتواء كلمة المرور على رقم');
        if (req.complexity.symbols && !/[!@#$%^&*(),.?":{}|<>\[\];'`~\\/+-=_]/.test(pwd)) violations.push('يجب احتواء كلمة المرور على رمز');
      }
      // Enforce password age if provided
      if (context?.passwordLastChanged) {
        const daysSince = Math.floor((Date.now() - new Date(context.passwordLastChanged).getTime()) / (24*3600*1000));
        if (daysSince > req.expiry) violations.push('انتهت صلاحية كلمة المرور ويجب تغييرها');
      }
      // Lockout config enforcement is part of server.js (LOGIN_LOCK_MAX_FAILS etc.)
    } else if (policyName === 'encryptionPolicy') {
      // Inspect server config from env-like snapshot: check TLS and HSTS flags via localStorage mirror or security_status.json if available
      try {
        const tls = (context?.tlsVersion || process?.env?.TLS_VERSION || 'TLS 1.3');
        if (String(tls).trim() !== 'TLS 1.3') violations.push('بروتوكول النقل أقل من TLS 1.3');
      } catch {}
      try {
        const hsts = (context?.hstsEnabled != null) ? context.hstsEnabled : undefined;
        if (hsts === false) violations.push('HSTS غير مفعّل في بيئة الإنتاج');
      } catch {}
      // Cipher check (heuristic via context)
      if (context?.weakCiphers && Array.isArray(context.weakCiphers) && context.weakCiphers.length) {
        violations.push('وجود خوارزميات تشفير ضعيفة مفعلة: ' + context.weakCiphers.join(','));
      }
    } else if (policyName === 'incidentResponse') {
      // Use incidentPlan incidents to compute detection times when incident id provided
      if (context?.incidentId) {
        const inc = incidentPlan.getById(context.incidentId);
        if (inc) {
          const detected = new Date(inc.detectedAt).getTime();
          const firstAction = inc.actions?.[0]?.at ? new Date(inc.actions[0].at).getTime() : detected;
          const mins = Math.floor((firstAction - detected) / 60000);
          if (!Number.isFinite(mins) || mins > 15) violations.push('تجاوز زمن الاكتشاف/الاستجابة الأولى 15 دقيقة');
        }
      }
      if (!context?.detectionTimeMinutes && !context?.incidentId) {
        violations.push('لا تتوفر بيانات للتحقق من زمن الاكتشاف');
      } else if (context?.detectionTimeMinutes && context.detectionTimeMinutes > 15) {
        violations.push('تجاوز زمن الاكتشاف المسموح');
      }
    }
    return { compliant: violations.length === 0, violations };
  }

  private async logViolation(v: Omit<SecurityViolation, 'id'>) {
    // Write to audit log first
    const auditId = auditLogger.logSecurityViolation('SYSTEM', `governance.${v.policy}`, v.violations.join('; '), 'HIGH');
    const violation: SecurityViolation = { id: `GV-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, auditId, ...v };
    this.state.violations.unshift(violation);
    this.persist();
  }

  private async takeCorrectiveAction(policyName: keyof SecurityPolicies, violations: string[], context?: any) {
    // Stub corrective actions; in real system, orchestrate workflows
    console.warn('Corrective action for', policyName, violations, context);
  }

  exportCSV(): string {
    const rows: string[][] = [];
    rows.push(['Section','Field','Value']);
    rows.push(['Org','Root', this.state.orgStructure.name]);
    rows.push(['Policies','AccessControl.version', this.state.policies.accessControl.version]);
    rows.push(['Policies','PasswordPolicy.version', this.state.policies.passwordPolicy.version]);
    rows.push(['Policies','EncryptionPolicy.version', this.state.policies.encryptionPolicy.version]);
    rows.push(['Policies','IncidentResponse.version', this.state.policies.incidentResponse.version]);
    rows.push(['Violations','Count', String(this.state.violations.length)]);
    this.state.violations.forEach(v => rows.push(['Violation', v.policy, JSON.stringify(v.violations)]));
    return rows.map(r => r.map(v => '"' + String(v).replaceAll('"','""') + '"').join(',')).join('\n');
  }

  async exportPDF(): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt' });
    let y = 40;
    doc.setFontSize(14);
    doc.text('إطار الحوكمة الأمنية', 40, y); y += 20;
    doc.setFontSize(11);
    doc.text('الهيكل التنظيمي:', 40, y); y += 14;
    const renderNode = (node: SecurityOrgUnit, indent: number) => {
      doc.text(`${' '.repeat(indent*2)}- ${node.name}`, 44, y); y += 12; if (y > 760) { doc.addPage(); y = 40; }
      (node.children||[]).forEach(ch => renderNode(ch, indent+1));
    };
    renderNode(this.state.orgStructure, 0);
    y += 8; doc.text('الانتهاكات:', 40, y); y += 14;
    this.state.violations.forEach(v => {
      doc.text(`• ${v.policy}: ${v.violations.join('; ')}`, 44, y); y += 12; if (y > 760) { doc.addPage(); y = 40; }
    });
    return doc.output('blob') as Blob;
  }
}

export const governance = new SecurityPolicyFramework();
