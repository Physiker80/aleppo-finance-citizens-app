import { Incident, IncidentAction, IncidentPhase, IncidentSeverity, NewIncidentInput, IncidentReport } from '../types';

const STORAGE_KEY = 'incidents';

const nowIso = () => new Date().toISOString();

function loadIncidents(): Incident[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveIncidents(list: Incident[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

export class IncidentResponsePlan {
  phases = {
    DETECTION: 'detection' as IncidentPhase,
    CONTAINMENT: 'containment' as IncidentPhase,
    INVESTIGATION: 'investigation' as IncidentPhase,
    ERADICATION: 'eradication' as IncidentPhase,
    RECOVERY: 'recovery' as IncidentPhase,
    LESSONS_LEARNED: 'lessons_learned' as IncidentPhase,
  };

  severityLevels: Record<IncidentSeverity, { responseTime: number; escalation: string }> = {
    CRITICAL: { responseTime: 15, escalation: 'immediate' },
    HIGH: { responseTime: 30, escalation: 'within_1_hour' },
    MEDIUM: { responseTime: 120, escalation: 'within_4_hours' },
    LOW: { responseTime: 480, escalation: 'next_business_day' },
  };

  onUpdate?: (incident: Incident) => void;

  constructor(onUpdate?: (incident: Incident) => void) {
    this.onUpdate = onUpdate;
  }

  private persist(incident: Incident) {
    const list = loadIncidents();
    const idx = list.findIndex(i => i.id === incident.id);
    if (idx >= 0) list[idx] = incident; else list.unshift(incident);
    saveIncidents(list);
    this.onUpdate?.(incident);
  }

  list(): Incident[] { return loadIncidents(); }

  getById(id: string): Incident | undefined {
    return loadIncidents().find(i => i.id === id);
  }

  async createIncident(input: NewIncidentInput): Promise<Incident> {
    const id = `INC-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const incident: Incident = {
      id,
      title: input.title,
      description: input.description,
      detectedAt: nowIso(),
      updatedAt: nowIso(),
      status: 'OPEN',
      phase: this.phases.DETECTION,
      severity: input.severity,
      affectedSystems: input.affectedSystems || [],
      compromisedAccounts: input.compromisedAccounts || [],
      affectedServices: input.affectedServices || [],
      timeWindow: input.timeWindow,
      actions: [],
      investigation: { timeline: [], indicators: {}, evidence: [] },
      recovery: { steps: [], validation: [], monitoring: [] },
    };
    this.persist(incident);
    return incident;
  }

  private logAction(incident: Incident, phase: IncidentPhase, action: string, result: IncidentAction['result'] = 'INFO', details?: string) {
    incident.actions.push({ id: `${phase}-${Date.now()}`, phase, action, result, details, at: nowIso() });
    incident.updatedAt = nowIso();
  }

  private async updateIncident(incident: Incident) {
    this.persist(incident);
    return incident;
  }

  async handleIncident(input: NewIncidentInput): Promise<Incident> {
    const incident = await this.createIncident(input);
    try {
      await this.detection(incident);
      await this.containment(incident);
      await this.investigation(incident);
      await this.eradication(incident);
      await this.recovery(incident);
      await this.lessonsLearned(incident);
    } catch (error: any) {
      this.logAction(incident, incident.phase, 'handleIncidentError', 'FAILED', error?.message || String(error));
      incident.status = 'OPEN';
      await this.updateIncident(incident);
    }
    return incident;
  }

  // ----- Phase 1: Detection -----
  async detection(incident: Incident) {
    this.logAction(incident, this.phases.DETECTION, `بدء معالجة الحادث ${incident.id}`);
    // classify
    incident.type = await this.classifyIncident(incident);
    incident.severity = await this.assessSeverity(incident);
    incident.responseTeam = await this.assembleResponseTeam(incident.severity);
    await this.notifyStakeholders(incident);
    await this.startDetailedLogging(incident);
    incident.phase = this.phases.CONTAINMENT;
    incident.status = 'IN_PROGRESS';
    await this.updateIncident(incident);
  }

  // ----- Phase 2: Containment -----
  async containment(incident: Incident) {
    this.logAction(incident, this.phases.CONTAINMENT, `احتواء الحادث ${incident.id}`);
    // Short-term containment
    for (const system of incident.affectedSystems) {
      await this.isolateSystem(system);
    }
    for (const acc of incident.compromisedAccounts) {
      await this.disableAccount(acc);
    }
    if (incident.severity === 'CRITICAL') {
      await this.applyEmergencyFirewallRules();
      await this.enableMaintenanceMode();
    }
    await this.createForensicBackup(incident);
    incident.phase = this.phases.INVESTIGATION;
    await this.updateIncident(incident);
  }

  // ----- Phase 3: Investigation -----
  async investigation(incident: Incident) {
    this.logAction(incident, this.phases.INVESTIGATION, `التحقيق في الحادث ${incident.id}`);
    const inv = incident.investigation || { timeline: [], indicators: {}, evidence: [] };
    // Collect evidence (stubs)
    inv.evidence = [
      ...(inv.evidence || []),
      `logs:${incident.timeWindow?.from || ''}-${incident.timeWindow?.to || ''}`,
      `network:${incident.timeWindow?.from || ''}-${incident.timeWindow?.to || ''}`,
      `snapshots:${incident.affectedSystems.join(',')}`,
      `memory:${incident.affectedSystems.join(',')}`,
    ];
    inv.timeline.push({ at: nowIso(), event: 'evidence_collected' });
    inv.attackVector = 'TBD';
    inv.rootCause = { summary: 'TBD' };
    inv.indicators = { malware: false };
    incident.impact = { scope: 'TBD', dataLoss: false };
    incident.investigation = inv;
    incident.phase = this.phases.ERADICATION;
    await this.updateIncident(incident);
  }

  // ----- Phase 4: Eradication -----
  async eradication(incident: Incident) {
    this.logAction(incident, this.phases.ERADICATION, `استئصال التهديد ${incident.id}`);
    const hasMalware = !!incident.investigation?.indicators && (incident.investigation as any).indicators.malware;
    if (hasMalware) {
      await this.removeMalware('generic');
    }
    if (incident.investigation?.rootCause && (incident.investigation.rootCause as any).vulnerability) {
      await this.patchVulnerability((incident.investigation.rootCause as any).vulnerability);
    }
    await this.updateSecurityRules(incident.investigation?.indicators || {});
    await this.resetCredentials(incident.compromisedAccounts);
    for (const system of incident.affectedSystems) {
      await this.cleanSystem(system);
    }
    incident.phase = this.phases.RECOVERY;
    await this.updateIncident(incident);
  }

  // ----- Phase 5: Recovery -----
  async recovery(incident: Incident) {
    this.logAction(incident, this.phases.RECOVERY, `استعادة الخدمات ${incident.id}`);
    const rec = incident.recovery || { steps: [], validation: [], monitoring: [] };
    if ((incident.impact as any)?.dataLoss) {
      rec.steps.push(await this.restoreFromBackup('last-clean'));
    }
    for (const svc of incident.affectedServices) {
      rec.steps.push(await this.restartService(svc));
      rec.validation.push(await this.validateService(svc));
    }
    for (const acc of incident.compromisedAccounts) {
      rec.steps.push(await this.reactivateAccount(acc));
    }
    rec.monitoring = await this.setupEnhancedMonitoring(incident);
    const ok = await this.verifyFullRecovery(incident);
    incident.recovery = rec;
    (incident as any).recovered = ok;
    incident.phase = this.phases.LESSONS_LEARNED;
    await this.updateIncident(incident);
  }

  // ----- Phase 6: Lessons Learned -----
  async lessonsLearned(incident: Incident) {
    this.logAction(incident, this.phases.LESSONS_LEARNED, `تحليل الدروس المستفادة ${incident.id}`);
    const report: IncidentReport = {
      summary: await this.generateExecutiveSummary(incident),
      timeline: incident.investigation?.timeline || [],
      rootCause: incident.investigation?.rootCause,
      impact: incident.impact || null,
      response: { strengths: [] as string[], weaknesses: [] as string[], improvements: [] as string[] },
      recommendations: [] as string[],
      actionItems: [] as string[]
    };
    report.response = await this.analyzeResponse(incident);
    report.recommendations = await this.generateRecommendations(incident);
    report.actionItems = await this.createActionPlan(report.recommendations);
    await this.documentIncident(incident, report as any);
    await this.updateKnowledgeBase(incident, report as any);
    await this.shareThreatIntelligence(incident.investigation?.indicators || {});
    incident.report = report as any;
    incident.status = 'CLOSED';
    await this.updateIncident(incident);
    return report;
  }

  // ===== Helper stubs (simulate work and log actions) =====
  private async classifyIncident(incident: Incident) { this.logAction(incident, this.phases.DETECTION, 'classifyIncident'); return 'generic'; }
  private async assessSeverity(incident: Incident) { this.logAction(incident, this.phases.DETECTION, 'assessSeverity'); return incident.severity || 'MEDIUM'; }
  private async assembleResponseTeam(severity: IncidentSeverity) { return { lead: 'admin', members: ['it1', 'security'] }; }
  private async notifyStakeholders(incident: Incident) { this.logAction(incident, this.phases.DETECTION, 'notifyStakeholders', 'SUCCESS'); }
  private async startDetailedLogging(incident: Incident) { this.logAction(incident, this.phases.DETECTION, 'startDetailedLogging', 'SUCCESS'); }
  private async isolateSystem(system: string) { return `isolated:${system}`; }
  private async disableAccount(account: string) { return `disabled:${account}`; }
  private async applyEmergencyFirewallRules() { return 'firewall_rules_applied'; }
  private async enableMaintenanceMode() { return 'maintenance_mode_enabled'; }
  private async createForensicBackup(_incident: Incident) { return 'forensic_backup_created'; }
  private async removeMalware(_indicator: any) { return 'malware_removed'; }
  private async patchVulnerability(vuln: string) { return `patched:${vuln}`; }
  private async updateSecurityRules(_indicators: any) { return 'security_rules_updated'; }
  private async resetCredentials(accounts: string[]) { return `credentials_reset:${accounts.length}`; }
  private async cleanSystem(system: string) { return `cleaned:${system}`; }
  private async restoreFromBackup(ref: string) { return `restore_from:${ref}`; }
  private async restartService(service: string) { return `restarted:${service}`; }
  private async validateService(service: string) { return `validated:${service}`; }
  private async reactivateAccount(account: string) { return `reactivated:${account}`; }
  private async setupEnhancedMonitoring(_incident: Incident) { return ['siem_rules_added', 'dashboards_created']; }
  private async verifyFullRecovery(_incident: Incident) { return true; }
  private async generateExecutiveSummary(_incident: Incident) { return 'ملخص تنفيذي للحادث'; }
  private async analyzeResponse(_incident: Incident) { return { strengths: ['استجابة سريعة'], weaknesses: ['توثيق ناقص'], improvements: ['تحسين إجراءات النسخ الاحتياطي'] }; }
  private async generateRecommendations(_incident: Incident) { return ['تحديث نظام إدارة الثغرات', 'تدريب الفريق على الاستجابة']; }
  private async createActionPlan(recs: string[]) { return recs.map((r, i) => `${i + 1}. ${r}`); }
  private async documentIncident(_incident: Incident, _report: any) { return 'documented'; }
  private async updateKnowledgeBase(_incident: Incident, _report: any) { return 'kb_updated'; }
  private async shareThreatIntelligence(_indicators: any) { return 'ti_shared'; }
}

export const incidentPlan = new IncidentResponsePlan();