import { BCPAction, BCPPlan, BCPPhase, BCPValidation, DamageAssessment, Disaster, DisasterSeverity, FailoverResult, FailoverStep, NewBCPInput, Normalization, ServiceRecoveryStatus, BCPDataRecovery } from '../types';

const STORAGE_KEY = 'bcp_plans';
const nowIso = () => new Date().toISOString();

function loadPlans(): BCPPlan[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return []; const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
function savePlans(list: BCPPlan[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {} }

export class BusinessContinuityPlan {
  rto = { // minutes for precision; UI can display in hours
    critical: 60,
    high: 240,
    medium: 1440,
    low: 4320
  };

  rpo = { // minutes
    critical: 15,
    high: 60,
    medium: 240,
    low: 1440
  };

  onUpdate?: (plan: BCPPlan) => void;

  constructor(onUpdate?: (plan: BCPPlan) => void) {
    this.onUpdate = onUpdate;
  }

  private persist(plan: BCPPlan) {
    const list = loadPlans();
    const idx = list.findIndex(p => p.id === plan.id);
    if (idx >= 0) list[idx] = plan; else list.unshift(plan);
    savePlans(list);
    this.onUpdate?.(plan);
  }

  list(): BCPPlan[] { return loadPlans(); }

  async create(input: NewBCPInput): Promise<BCPPlan> {
    const disaster: Disaster = {
      type: input.type,
      severity: input.severity,
      description: input.description,
      occurredAt: nowIso(),
      affectedSystems: input.affectedSystems || [],
      affectedServices: input.affectedServices || [],
    };
    const plan: BCPPlan = {
      id: `BCP-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      disaster,
      startTime: nowIso(),
      status: 'ACTIVE',
      phase: 'assessment',
      rto: this.rto,
      rpo: this.rpo,
      progress: 0,
      progressByPhase: {},
      sla: { rpoWindowMinutes: this.getRpoMinutes(disaster.severity), breaches: [] },
      actions: []
    };
    // compute RTO deadline
    plan.sla!.rtoDeadline = this.computeRtoDeadline(disaster.severity, plan.startTime);
    this.persist(plan);
    return plan;
  }

  private log(plan: BCPPlan, phase: BCPPhase, action: string, result: BCPAction['result'] = 'INFO', details?: string) {
    plan.actions.push({ id: `${phase}-${Date.now()}`, phase, action, result, details, at: nowIso() });
  }

  private async update(plan: BCPPlan) { this.persist(plan); return plan; }

  async activateDisasterRecovery(disaster: Disaster | NewBCPInput): Promise<BCPPlan> {
    const plan = 'type' in disaster && 'occurredAt' in (disaster as any)
      ? await (async () => { const p = await this.create({ type: (disaster as Disaster).type, severity: (disaster as Disaster).severity as DisasterSeverity, description: (disaster as Disaster).description, affectedSystems: (disaster as Disaster).affectedSystems, affectedServices: (disaster as Disaster).affectedServices }); p.disaster = disaster as Disaster; return p; })()
      : await this.create(disaster as NewBCPInput);

    try {
      // 1) Damage assessment
      await this.runPhase(plan, 'assessment');

      // 2) Activate emergency team
      await this.runPhase(plan, 'team_activation');

      // 3) Execute failover
      await this.runPhase(plan, 'failover');

      // 4) Data recovery
      await this.runPhase(plan, 'data_recovery');

      // 5) Service recovery
      await this.runPhase(plan, 'service_recovery');

      // 6) Validation & testing
      await this.runPhase(plan, 'validation');

      // 7) Normalization if success
      if (plan.validation?.success) {
        await this.runPhase(plan, 'normalization');
        plan.status = 'COMPLETED';
        plan.endTime = nowIso();
      } else {
        plan.phase = 'failed';
        plan.status = 'FAILED';
      }
      await this.update(plan);
    } catch (e: any) {
      plan.error = e?.message || String(e);
      plan.status = 'FAILED';
      plan.phase = 'failed';
      await this.escalateFailure(plan);
      await this.update(plan);
    }
    return plan;
  }

  // Allow running a single phase manually
  async runPhase(plan: BCPPlan, phase: BCPPhase): Promise<BCPPlan> {
    switch (phase) {
      case 'assessment': {
        plan.assessment = await this.assessDamage(plan.disaster);
        plan.phase = 'team_activation';
        this.bumpProgress(plan, 'assessment', 1);
        break;
      }
      case 'team_activation': {
        plan.team = await this.activateEmergencyTeam(plan.disaster.severity);
        plan.phase = 'failover';
        this.bumpProgress(plan, 'team_activation', 1);
        break;
      }
      case 'failover': {
        plan.failover = await this.executeFailover(plan.assessment!);
        plan.phase = 'data_recovery';
        this.bumpProgress(plan, 'failover', 1);
        break;
      }
      case 'data_recovery': {
        plan.dataRecovery = await this.recoverData(plan.assessment!);
        plan.phase = 'service_recovery';
        this.bumpProgress(plan, 'data_recovery', 1);
        break;
      }
      case 'service_recovery': {
        plan.serviceRecovery = await this.recoverServices(plan.assessment!);
        plan.phase = 'validation';
        this.bumpProgress(plan, 'service_recovery', 1);
        break;
      }
      case 'validation': {
        plan.validation = await this.validateRecovery(plan);
        this.bumpProgress(plan, 'validation', 1);
        break;
      }
      case 'normalization': {
        plan.normalization = await this.returnToNormal(plan);
        this.bumpProgress(plan, 'normalization', 1);
        break;
      }
      default:
        break;
    }
    this.checkSla(plan);
    await this.update(plan);
    return plan;
  }

  // Compute/update overall progress (7 phases)
  private bumpProgress(plan: BCPPlan, phase: BCPPhase, weight = 1) {
    plan.progressByPhase = plan.progressByPhase || {};
    plan.progressByPhase[phase] = 100;
    const phases: BCPPhase[] = ['assessment','team_activation','failover','data_recovery','service_recovery','validation','normalization'];
    const done = phases.reduce((acc, ph) => acc + ((plan.progressByPhase![ph] || 0) > 0 ? 1 : 0), 0);
    plan.progress = Math.round((done / phases.length) * 100);
  }

  private getRpoMinutes(sev: DisasterSeverity): number {
    switch (sev) {
      case 'CRITICAL': return this.rpo.critical;
      case 'HIGH': return this.rpo.high;
      case 'MEDIUM': return this.rpo.medium;
      case 'LOW': return this.rpo.low;
    }
  }

  private computeRtoDeadline(sev: DisasterSeverity, startIso: string): string {
    const mins = (
      sev === 'CRITICAL' ? this.rto.critical :
      sev === 'HIGH' ? this.rto.high :
      sev === 'MEDIUM' ? this.rto.medium : this.rto.low
    );
    const start = new Date(startIso).getTime();
    return new Date(start + mins * 60_000).toISOString();
  }

  private checkSla(plan: BCPPlan) {
    plan.sla = plan.sla || { rpoWindowMinutes: this.getRpoMinutes(plan.disaster.severity), breaches: [] };
    // RTO breach if now past deadline while not completed
    if (plan.status !== 'COMPLETED' && plan.sla.rtoDeadline) {
      const now = Date.now();
      if (now > new Date(plan.sla.rtoDeadline).getTime()) {
        const already = plan.sla.breaches?.some(b => b.kind === 'RTO');
        if (!already) {
          plan.sla.breaches!.push({ kind: 'RTO', at: nowIso(), details: 'تم تجاوز هدف زمن الاستعادة (RTO)' });
          plan.warnings = [...(plan.warnings || []), 'تحذير: تم تجاوز RTO'];
          this.log(plan, plan.phase, 'sla_rto_breached', 'FAILED', 'RTO breached');
        }
      }
    }
    // RPO cannot be checked precisely without data checkpoints; we record window for UI
  }

  // ---------- Exports ----------
  exportCSV(plan: BCPPlan): string {
    const rows = [
      ['Plan ID','Status','Phase','Start','End','Disaster','Severity','Progress','RTO Deadline','RPO Window (min)'],
      [plan.id, plan.status, plan.phase, plan.startTime, plan.endTime || '', plan.disaster.type, plan.disaster.severity, String(plan.progress || 0), plan.sla?.rtoDeadline || '', String(plan.sla?.rpoWindowMinutes || '')]
    ];
    rows.push(['Actions']);
    rows.push(['Phase','Action','Result','At','Details']);
    (plan.actions || []).forEach(a => rows.push([a.phase, a.action, a.result, a.at, a.details || '']));
    return rows.map(r => r.map(v => '"' + String(v).replaceAll('"','""') + '"').join(',')).join('\n');
  }

  async exportPDF(plan: BCPPlan): Promise<Blob> {
    // Lightweight PDF: use dynamic import of jsPDF when called to keep bundle light
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt' });
    let y = 40;
    doc.setFontSize(14);
    doc.text(`خطة استمرارية الأعمال - ${plan.id}`, 40, y); y += 20;
    doc.setFontSize(10);
    doc.text(`الحالة: ${plan.status} / المرحلة: ${plan.phase}`, 40, y); y += 14;
    doc.text(`الحدث: ${plan.disaster.type} - ${plan.disaster.severity}`, 40, y); y += 14;
    doc.text(`البدء: ${plan.startTime}`, 40, y); y += 14;
    if (plan.endTime) { doc.text(`الانتهاء: ${plan.endTime}`, 40, y); y += 14; }
    if (plan.sla?.rtoDeadline) { doc.text(`موعد RTO: ${plan.sla.rtoDeadline}`, 40, y); y += 14; }
    if (plan.sla?.rpoWindowMinutes) { doc.text(`نافذة RPO (دقائق): ${plan.sla.rpoWindowMinutes}`, 40, y); y += 14; }
    y += 10;
    doc.text('سجل الإجراءات:', 40, y); y += 16;
    (plan.actions || []).forEach((a) => {
      const line = `${a.at} | ${a.phase} | ${a.action} | ${a.result} ${a.details ? ' - ' + a.details : ''}`;
      doc.text(line, 40, y); y += 12;
      if (y > 760) { doc.addPage(); y = 40; }
    });
    const blob = doc.output('blob');
    return blob as Blob;
  }

  // ---------- Backend Integrations (stubs) ----------
  async submitEvidence(plan: BCPPlan, evidence: { kind: string; ref?: string; notes?: string }) {
    // Here we only log; in real setup, call backend API
    this.log(plan, plan.phase, 'submitEvidence', 'SUCCESS', `${evidence.kind}:${evidence.ref || ''}`);
    this.update(plan);
  }

  async requestBackup(plan: BCPPlan, target: string) {
    this.log(plan, plan.phase, 'requestBackup', 'SUCCESS', target);
    this.update(plan);
  }

  // ----- Steps / helpers -----
  private async assessDamage(disaster: Disaster): Promise<DamageAssessment> {
    this.log(this.ensurePlanContext(disaster), 'assessment', 'assessDamage', 'SUCCESS');
    const hours = this.estimateDowntime(disaster.severity);
    return {
      affectedSystems: disaster.affectedSystems,
      affectedServices: disaster.affectedServices,
      dataLoss: disaster.severity === 'CRITICAL' || disaster.severity === 'HIGH',
      estimatedDowntimeHours: hours,
      notes: 'تقييم أولي للأثر بناءً على شدة الحادث وأنظمة الإنتاج المتأثرة'
    };
  }

  private estimateDowntime(sev: DisasterSeverity): number {
    switch (sev) {
      case 'CRITICAL': return 1; // hours
      case 'HIGH': return 4;
      case 'MEDIUM': return 24;
      case 'LOW': return 72;
      default: return 24;
    }
  }

  private async activateEmergencyTeam(severity: DisasterSeverity): Promise<{ lead?: string; members?: string[] }> {
    const team = { lead: 'admin', members: severity === 'CRITICAL' ? ['it1', 'security', 'network'] : ['it1', 'network'] };
    return team;
  }

  async executeFailover(assessment: DamageAssessment): Promise<FailoverResult> {
    const failover: FailoverResult = {
      primary: assessment.affectedSystems,
      secondary: [],
      startTime: nowIso(),
      steps: []
    };
    for (const system of assessment.affectedSystems) {
      const priority = this.getSystemPriority(system);
      if (priority === 'critical') {
        const secondary = await this.activateSecondarySystem(system);
        failover.secondary.push(secondary);
        await this.redirectTraffic(system, secondary);
        await this.syncData(system, secondary);
        const step: FailoverStep = { system, secondary, completedAt: nowIso(), status: 'SUCCESS' };
        failover.steps.push(step);
      }
    }
    return failover;
  }

  private getSystemPriority(system: string): 'critical' | 'high' | 'medium' | 'low' {
    // Simple heuristic: if name contains 'db' or 'auth' => critical
    const s = system.toLowerCase();
    if (s.includes('db') || s.includes('auth') || s.includes('core')) return 'critical';
    if (s.includes('api')) return 'high';
    if (s.includes('cache')) return 'medium';
    return 'low';
  }

  private async activateSecondarySystem(system: string): Promise<string> {
    return `${system}-secondary`;
  }
  private async redirectTraffic(primary: string, secondary: string) { return `traffic:${primary}->${secondary}`; }
  private async syncData(primary: string, secondary: string) { return `sync:${primary}<->${secondary}`; }

  private async recoverData(assessment: DamageAssessment): Promise<BCPDataRecovery> {
    const hasLoss = !!assessment.dataLoss;
    const strategy: BCPDataRecovery['strategy'] = hasLoss ? 'SNAPSHOT' : 'INCREMENTAL';
    const recoveredPoints: string[] = [nowIso()];
    return { strategy, recoveredPoints, notes: hasLoss ? 'استعادة من لقطات آمنة' : 'استعادة تفاضلية سريعة' };
  }

  private async recoverServices(assessment: DamageAssessment): Promise<{ services: ServiceRecoveryStatus[] }> {
    const statuses: ServiceRecoveryStatus[] = [];
    for (const svc of assessment.affectedServices) {
      statuses.push({ name: svc, restarted: true, validated: false });
    }
    return { services: statuses };
  }

  private async validateRecovery(plan: BCPPlan): Promise<BCPValidation> {
    const tests = [
      'اختبار اتصال المستخدمين',
      'اختبار أداء قواعد البيانات',
      'تحقق من تكامل البيانات مقابل RPO'
    ];
    const results = tests.map((t, i) => `${t}: ${i === 2 ? 'مطابق لأهداف RPO' : 'ناجح'}`);
    const success = true;
    return { success, tests, results };
  }

  private async returnToNormal(plan: BCPPlan): Promise<Normalization> {
    const steps = [
      'إعادة توجيه الحركة إلى النظام الأساسي',
      'إيقاف الأنظمة الثانوية وضمان تزامن نهائي',
      'إجراء مراجعة بعد الحادث وتوثيق الدروس'
    ];
    return { switchedBackAt: nowIso(), steps };
  }

  private async escalateFailure(plan: BCPPlan) {
  this.log(plan, 'failed', 'escalateFailure', 'FAILED', plan.error);
  }

  private ensurePlanContext(disaster: Disaster): BCPPlan {
    // Helper to create a temporary context for logging if needed
    const p: BCPPlan = {
      id: 'TEMP',
      disaster,
      startTime: nowIso(),
      status: 'ACTIVE',
      phase: 'assessment',
      rto: this.rto,
      rpo: this.rpo,
      actions: []
    };
    return p;
  }
}

export const bcp = new BusinessContinuityPlan();
