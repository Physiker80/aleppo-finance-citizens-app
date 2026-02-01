/**
 * نظام التحليل الذكي للأمان - AI Security Analytics
 * نظام متقدم للتحليل الأمني باستخدام خوارزميات الذكاء الاصطناعي
 * نظام الاستعلامات والشكاوى - بوابة الخدمات الإلكترونية
 */

import { ActiveSession, SecurityLog, Employee } from '../types';

// توسيع واجهة ActiveSession لتشمل userId
interface ExtendedActiveSession extends ActiveSession {
  userId: string;
}

// أنواع البيانات للتحليل الذكي
export interface AISecurityAnalysis {
  securityScore: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: RiskFactor[];
  behaviorAnalysis: BehaviorAnalysis;
  predictions: SecurityPrediction[];
  recommendations: IntelligentRecommendation[];
  anomalies: SecurityAnomaly[];
  trends: SecurityTrend[];
}

export interface RiskFactor {
  id: string;
  type: 'SESSION_ANOMALY' | 'IP_SUSPICIOUS' | 'BEHAVIORAL_CHANGE' | 'TIME_ANOMALY' | 'DEVICE_RISK' | 'GEOGRAPHIC_ANOMALY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;
  description: string;
  evidence: string[];
  timestamp: Date;
  affectedSessions: string[];
}

export interface BehaviorAnalysis {
  userProfiles: UserBehaviorProfile[];
  deviations: BehaviorDeviation[];
  patterns: BehaviorPattern[];
  riskScore: number;
}

export interface UserBehaviorProfile {
  userId: string;
  normalLoginTimes: number[];  // ساعات الدخول العادية
  commonDevices: string[];     // الأجهزة المعتادة
  typicalLocations: string[];  // المواقع المعتادة
  averageSessionDuration: number; // مدة الجلسة المعتادة
  accessPatterns: AccessPattern[];
  riskLevel: number;
}

export interface AccessPattern {
  route: string;
  frequency: number;
  timePatterns: number[];
  riskScore: number;
}

export interface BehaviorDeviation {
  userId: string;
  type: string;
  severity: number;
  description: string;
  detectedAt: Date;
  confidence: number;
}

export interface BehaviorPattern {
  type: 'LOGIN_PATTERN' | 'NAVIGATION_PATTERN' | 'TIME_PATTERN' | 'DEVICE_PATTERN';
  description: string;
  strength: number;
  samples: number;
}

export interface SecurityPrediction {
  type: 'POTENTIAL_BREACH' | 'SUSPICIOUS_ACTIVITY' | 'SYSTEM_OVERLOAD' | 'ACCOUNT_TAKEOVER';
  probability: number;
  timeWindow: string;
  description: string;
  preventiveActions: string[];
  confidence: number;
}

export interface IntelligentRecommendation {
  id: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: 'POLICY' | 'TECHNICAL' | 'MONITORING' | 'TRAINING' | 'INCIDENT_RESPONSE';
  title: string;
  description: string;
  actionItems: string[];
  expectedImpact: string;
  implementationDifficulty: 'EASY' | 'MEDIUM' | 'HARD';
  estimatedCost: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface SecurityAnomaly {
  id: string;
  type: 'STATISTICAL' | 'BEHAVIORAL' | 'TEMPORAL' | 'GEOGRAPHICAL' | 'TECHNICAL';
  severity: number;
  description: string;
  affectedUsers: string[];
  detectedAt: Date;
  confidence: number;
  possibleCauses: string[];
}

export interface SecurityTrend {
  metric: string;
  direction: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
  changeRate: number;
  significance: number;
  description: string;
  period: string;
}

/**
 * محرك التحليل الذكي للأمان
 */
export class AISecurityEngine {
  private static instance: AISecurityEngine;
  private analysisHistory: AISecurityAnalysis[] = [];
  private learningData: any = {};

  static getInstance(): AISecurityEngine {
    if (!AISecurityEngine.instance) {
      AISecurityEngine.instance = new AISecurityEngine();
    }
    return AISecurityEngine.instance;
  }

  /**
   * تحليل شامل للحالة الأمنية
   */
  async performComprehensiveAnalysis(
    activeSessions: ExtendedActiveSession[],
    securityLogs: SecurityLog[],
    employees: Employee[]
  ): Promise<AISecurityAnalysis> {
    
    // تحليل عوامل المخاطر
    const riskFactors = this.analyzeRiskFactors(activeSessions, securityLogs);
    
    // تحليل سلوك المستخدمين
    const behaviorAnalysis = this.analyzeBehavior(activeSessions, securityLogs, employees);
    
    // التنبؤ بالتهديدات
    const predictions = this.generateSecurityPredictions(riskFactors, behaviorAnalysis);
    
    // إنشاء التوصيات الذكية
    const recommendations = this.generateIntelligentRecommendations(riskFactors, behaviorAnalysis, predictions);
    
    // كشف الشذوذ
    const anomalies = this.detectAnomalies(activeSessions, securityLogs);
    
    // تحليل الاتجاهات
    const trends = this.analyzeTrends();
    
    // حساب النقاط الإجمالية
    const securityScore = this.calculateAdvancedSecurityScore(riskFactors, behaviorAnalysis, anomalies);
    
    // تحديد مستوى التهديد
    const threatLevel = this.determineThreatLevel(securityScore, riskFactors, predictions);

    const analysis: AISecurityAnalysis = {
      securityScore,
      threatLevel,
      riskFactors,
      behaviorAnalysis,
      predictions,
      recommendations,
      anomalies,
      trends
    };

    // حفظ التحليل للتعلم المستقبلي
    this.storeAnalysisForLearning(analysis);
    this.analysisHistory.push(analysis);
    
    return analysis;
  }

  /**
   * تحليل عوامل المخاطر
   */
  private analyzeRiskFactors(sessions: ExtendedActiveSession[], logs: SecurityLog[]): RiskFactor[] {
    const riskFactors: RiskFactor[] = [];

    // تحليل الجلسات المشبوهة
    sessions.forEach(session => {
      if (session.isSuspicious) {
        riskFactors.push({
          id: `session_${session.sessionId}`,
          type: 'SESSION_ANOMALY',
          severity: 'HIGH',
          score: 75,
          description: `جلسة مشبوهة من ${session.location}`,
          evidence: [`IP: ${session.ipAddress}`, `Device: ${session.device}`],
          timestamp: new Date(),
          affectedSessions: [session.sessionId]
        });
      }

      // تحليل عناوين IP غير المألوفة
      if (this.isUnfamiliarIP(session.ipAddress)) {
        riskFactors.push({
          id: `ip_${session.ipAddress}`,
          type: 'IP_SUSPICIOUS',
          severity: 'MEDIUM',
          score: 60,
          description: `عنوان IP غير مألوف: ${session.ipAddress}`,
          evidence: [`Location: ${session.location}`, `First seen: ${new Date().toISOString()}`],
          timestamp: new Date(),
          affectedSessions: [session.sessionId]
        });
      }

      // تحليل أوقات الدخول غير العادية
      const loginHour = new Date(session.lastActivity).getHours();
      if (loginHour < 6 || loginHour > 22) {
        riskFactors.push({
          id: `time_${session.sessionId}`,
          type: 'TIME_ANOMALY',
          severity: 'MEDIUM',
          score: 45,
          description: `دخول في وقت غير عادي: ${loginHour}:00`,
          evidence: [`Session: ${session.sessionId}`, `Time: ${loginHour}:00`],
          timestamp: new Date(),
          affectedSessions: [session.sessionId]
        });
      }
    });

    // تحليل السجلات الأمنية
    const recentLogs = logs.filter(log => 
      Date.now() - log.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    const criticalLogs = recentLogs.filter(log => log.severity === 'CRITICAL' || log.severity === 'ERROR');
    if (criticalLogs.length > 5) {
      riskFactors.push({
        id: 'multiple_critical_events',
        type: 'BEHAVIORAL_CHANGE',
        severity: 'HIGH',
        score: 85,
        description: `${criticalLogs.length} حدث خطير في آخر 24 ساعة`,
        evidence: criticalLogs.map(log => `${log.event}: ${log.details}`),
        timestamp: new Date(),
        affectedSessions: []
      });
    }

    return riskFactors.sort((a, b) => b.score - a.score);
  }

  /**
   * تحليل سلوك المستخدمين
   */
  private analyzeBehavior(sessions: ExtendedActiveSession[], logs: SecurityLog[], employees: Employee[]): BehaviorAnalysis {
    const userProfiles: UserBehaviorProfile[] = [];
    const deviations: BehaviorDeviation[] = [];
    const patterns: BehaviorPattern[] = [];

    // إنشاء ملفات سلوكية للمستخدمين
    employees.forEach(employee => {
      const userSessions = sessions.filter(s => s.userId === employee.username);
      const userLogs = logs.filter(l => l.userId === employee.username);

      if (userSessions.length > 0) {
        const profile = this.createUserBehaviorProfile(employee.username, userSessions, userLogs);
        userProfiles.push(profile);

        // كشف الانحرافات السلوكية
        const userDeviations = this.detectBehaviorDeviations(profile, userSessions);
        deviations.push(...userDeviations);
      }
    });

    // تحليل الأنماط العامة
    patterns.push(...this.identifyBehaviorPatterns(sessions, logs));

    const riskScore = this.calculateBehaviorRiskScore(userProfiles, deviations);

    return {
      userProfiles,
      deviations,
      patterns,
      riskScore
    };
  }

  /**
   * إنشاء ملف سلوكي للمستخدم
   */
  private createUserBehaviorProfile(userId: string, sessions: ExtendedActiveSession[], logs: SecurityLog[]): UserBehaviorProfile {
    // تحليل أوقات الدخول العادية
    const loginTimes = sessions.map(s => new Date(s.lastActivity).getHours());
    const normalLoginTimes = this.findNormalHours(loginTimes);

    // الأجهزة المعتادة
    const devices = [...new Set(sessions.map(s => s.device))];
    
    // المواقع المعتادة
    const locations = [...new Set(sessions.map(s => s.location))];

    // متوسط مدة الجلسة
    const sessionDurations = sessions.map(s => {
      const now = new Date().getTime();
      const lastActivity = new Date(s.lastActivity).getTime();
      return now - lastActivity;
    });
    const averageSessionDuration = sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length;

    // أنماط الوصول
    const accessPatterns = this.analyzeAccessPatterns(userId, logs);

    return {
      userId,
      normalLoginTimes,
      commonDevices: devices,
      typicalLocations: locations,
      averageSessionDuration,
      accessPatterns,
      riskLevel: this.calculateUserRiskLevel(sessions, logs)
    };
  }

  /**
   * كشف الانحرافات السلوكية
   */
  private detectBehaviorDeviations(profile: UserBehaviorProfile, sessions: ExtendedActiveSession[]): BehaviorDeviation[] {
    const deviations: BehaviorDeviation[] = [];

    sessions.forEach(session => {
      const sessionHour = new Date(session.lastActivity).getHours();
      
      // انحراف في وقت الدخول
      if (!profile.normalLoginTimes.includes(sessionHour)) {
        deviations.push({
          userId: profile.userId,
          type: 'UNUSUAL_LOGIN_TIME',
          severity: 0.7,
          description: `دخول في وقت غير معتاد: ${sessionHour}:00`,
          detectedAt: new Date(),
          confidence: 0.8
        });
      }

      // انحراف في الجهاز
      if (!profile.commonDevices.includes(session.device)) {
        deviations.push({
          userId: profile.userId,
          type: 'NEW_DEVICE',
          severity: 0.8,
          description: `استخدام جهاز جديد: ${session.device}`,
          detectedAt: new Date(),
          confidence: 0.9
        });
      }

      // انحراف في الموقع
      if (!profile.typicalLocations.includes(session.location)) {
        deviations.push({
          userId: profile.userId,
          type: 'UNUSUAL_LOCATION',
          severity: 0.9,
          description: `دخول من موقع غير معتاد: ${session.location}`,
          detectedAt: new Date(),
          confidence: 0.85
        });
      }
    });

    return deviations;
  }

  /**
   * التنبؤ بالتهديدات الأمنية
   */
  private generateSecurityPredictions(riskFactors: RiskFactor[], behaviorAnalysis: BehaviorAnalysis): SecurityPrediction[] {
    const predictions: SecurityPrediction[] = [];

    // التنبؤ بمحاولات الاختراق
    const highRiskFactors = riskFactors.filter(rf => rf.severity === 'HIGH' || rf.severity === 'CRITICAL');
    if (highRiskFactors.length > 2) {
      predictions.push({
        type: 'POTENTIAL_BREACH',
        probability: Math.min(0.9, highRiskFactors.length * 0.2),
        timeWindow: '2-6 ساعات',
        description: 'احتمالية محاولة اختراق بناء على الأنشطة المشبوهة المتعددة',
        preventiveActions: [
          'تفعيل المراقبة المكثفة',
          'تحديد هوية المستخدمين المشبوهين',
          'إنهاء الجلسات عالية المخاطر'
        ],
        confidence: 0.85
      });
    }

    // التنبؤ بحمولة النظام
    const activeSessions = riskFactors.filter(rf => rf.type === 'SESSION_ANOMALY').length;
    if (activeSessions > 10) {
      predictions.push({
        type: 'SYSTEM_OVERLOAD',
        probability: Math.min(0.8, activeSessions * 0.05),
        timeWindow: '1-3 ساعات',
        description: 'احتمالية زيادة الحمولة على النظام',
        preventiveActions: [
          'مراقبة أداء الخادم',
          'تحسين استجابة النظام',
          'إعداد تحديث تدريجي للموارد'
        ],
        confidence: 0.75
      });
    }

    // التنبؤ بالأنشطة المشبوهة
    const behaviorDeviations = behaviorAnalysis.deviations.length;
    if (behaviorDeviations > 5) {
      predictions.push({
        type: 'SUSPICIOUS_ACTIVITY',
        probability: Math.min(0.95, behaviorDeviations * 0.1),
        timeWindow: '30 دقيقة - 2 ساعة',
        description: 'زيادة متوقعة في الأنشطة المشبوهة بناء على الانحرافات السلوكية',
        preventiveActions: [
          'تكثيف المراقبة الآلية',
          'تفعيل التنبيهات الفورية',
          'مراجعة سجلات الأمان'
        ],
        confidence: 0.8
      });
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  /**
   * إنشاء التوصيات الذكية
   */
  private generateIntelligentRecommendations(
    riskFactors: RiskFactor[], 
    behaviorAnalysis: BehaviorAnalysis, 
    predictions: SecurityPrediction[]
  ): IntelligentRecommendation[] {
    const recommendations: IntelligentRecommendation[] = [];

    // توصيات بناء على عوامل المخاطر
    const criticalRisks = riskFactors.filter(rf => rf.severity === 'CRITICAL');
    if (criticalRisks.length > 0) {
      recommendations.push({
        id: 'critical_risk_response',
        priority: 'URGENT',
        category: 'INCIDENT_RESPONSE',
        title: 'استجابة فورية للمخاطر الحرجة',
        description: 'يوجد مخاطر حرجة تتطلب تدخل فوري',
        actionItems: [
          'تحديد مصدر التهديد بدقة',
          'إنهاء الجلسات عالية المخاطر',
          'تفعيل البروتوكولات الأمنية الطارئة',
          'إعداد تقرير حادث مفصل'
        ],
        expectedImpact: 'منع الاختراق المحتمل وحماية البيانات',
        implementationDifficulty: 'MEDIUM',
        estimatedCost: 'LOW'
      });
    }

    // توصيات تقنية
    const ipRisks = riskFactors.filter(rf => rf.type === 'IP_SUSPICIOUS');
    if (ipRisks.length > 3) {
      recommendations.push({
        id: 'ip_filtering_enhancement',
        priority: 'HIGH',
        category: 'TECHNICAL',
        title: 'تحسين فلترة عناوين IP',
        description: 'تطوير نظام أكثر ذكاء لتصفية عناوين IP المشبوهة',
        actionItems: [
          'إنشاء قائمة بيضاء لعناوين IP الموثوقة',
          'تطوير خوارزميات كشف IP المشبوه',
          'تفعيل الحجب التلقائي للعناوين المشبوهة',
          'إعداد تنبيهات لمحاولات الوصول المشبوهة'
        ],
        expectedImpact: 'تقليل محاولات الوصول غير المصرح بها بنسبة 60%',
        implementationDifficulty: 'MEDIUM',
        estimatedCost: 'MEDIUM'
      });
    }

    // توصيات تدريبية
    const behaviorDeviations = behaviorAnalysis.deviations.length;
    if (behaviorDeviations > 10) {
      recommendations.push({
        id: 'user_security_training',
        priority: 'MEDIUM',
        category: 'TRAINING',
        title: 'برنامج تدريب الأمان للمستخدمين',
        description: 'تدريب المستخدمين على أفضل الممارسات الأمنية',
        actionItems: [
          'تصميم برنامج تدريبي شامل',
          'إعداد محاكيات لهجمات التصيد',
          'اختبارات أمان دورية',
          'ورش عمل حول الوعي الأمني'
        ],
        expectedImpact: 'تحسين الوعي الأمني وتقليل الأخطاء البشرية',
        implementationDifficulty: 'EASY',
        estimatedCost: 'LOW'
      });
    }

    // توصيات المراقبة
    const timeAnomalies = riskFactors.filter(rf => rf.type === 'TIME_ANOMALY');
    if (timeAnomalies.length > 0) {
      recommendations.push({
        id: 'enhanced_monitoring',
        priority: 'MEDIUM',
        category: 'MONITORING',
        title: 'تحسين أنظمة المراقبة',
        description: 'تطوير قدرات المراقبة لكشف الأنماط غير العادية',
        actionItems: [
          'تطوير خوارزميات كشف الأنماط الزمنية',
          'إعداد تنبيهات للأنشطة خارج ساعات العمل',
          'تحليل سلوك المستخدمين بشكل مستمر',
          'إنشاء لوحات مراقبة متقدمة'
        ],
        expectedImpact: 'كشف مبكر للتهديدات الأمنية',
        implementationDifficulty: 'HARD',
        estimatedCost: 'HIGH'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * كشف الشذوذ الأمني
   */
  private detectAnomalies(sessions: ExtendedActiveSession[], logs: SecurityLog[]): SecurityAnomaly[] {
    const anomalies: SecurityAnomaly[] = [];

    // شذوذ إحصائي في عدد الجلسات
    const hourlyStats = this.calculateHourlySessionStats(sessions);
    const averageSessions = hourlyStats.reduce((a, b) => a + b, 0) / hourlyStats.length;
    const currentHour = new Date().getHours();
    const currentSessions = sessions.filter(s => new Date(s.lastActivity).getHours() === currentHour).length;

    if (currentSessions > averageSessions * 2) {
      anomalies.push({
        id: 'session_spike_anomaly',
        type: 'STATISTICAL',
        severity: 0.8,
        description: `ارتفاع غير طبيعي في عدد الجلسات: ${currentSessions} مقابل متوسط ${Math.round(averageSessions)}`,
        affectedUsers: sessions.map(s => s.userId),
        detectedAt: new Date(),
        confidence: 0.9,
        possibleCauses: [
          'هجوم موزع',
          'خطأ في النظام',
          'حملة تسجيل دخول جماعية'
        ]
      });
    }

    // شذوذ جغرافي
    const locationStats = this.calculateLocationStats(sessions);
    const suspiciousLocations = this.findSuspiciousLocations(locationStats);
    
    if (suspiciousLocations.length > 0) {
      anomalies.push({
        id: 'geographic_anomaly',
        type: 'GEOGRAPHICAL',
        severity: 0.7,
        description: `مواقع جغرافية مشبوهة: ${suspiciousLocations.join(', ')}`,
        affectedUsers: sessions.filter(s => suspiciousLocations.includes(s.location)).map(s => s.userId),
        detectedAt: new Date(),
        confidence: 0.75,
        possibleCauses: [
          'استخدام VPN أو Proxy',
          'محاولة اختراق من مواقع بعيدة',
          'سفر غير معتاد للمستخدمين'
        ]
      });
    }

    // شذوذ زمني
    const temporalAnomaly = this.detectTemporalAnomalies(logs);
    if (temporalAnomaly) {
      anomalies.push(temporalAnomaly);
    }

    return anomalies.sort((a, b) => b.severity - a.severity);
  }

  /**
   * تحليل الاتجاهات الأمنية
   */
  private analyzeTrends(): SecurityTrend[] {
    const trends: SecurityTrend[] = [];

    // محاكاة بيانات تاريخية
    const historicalData = this.getHistoricalSecurityData();

    // اتجاه عدد محاولات الدخول
    const loginTrend = this.calculateTrend(historicalData.loginAttempts);
    trends.push({
      metric: 'محاولات تسجيل الدخول',
      direction: loginTrend.direction,
      changeRate: loginTrend.rate,
      significance: 0.8,
      description: `${loginTrend.direction === 'INCREASING' ? 'زيادة' : 'انخفاض'} بنسبة ${Math.abs(loginTrend.rate)}% في الأسبوع الماضي`,
      period: 'أسبوعي'
    });

    // اتجاه الأنشطة المشبوهة
    const suspiciousTrend = this.calculateTrend(historicalData.suspiciousActivities);
    trends.push({
      metric: 'الأنشطة المشبوهة',
      direction: suspiciousTrend.direction,
      changeRate: suspiciousTrend.rate,
      significance: 0.9,
      description: `${suspiciousTrend.direction === 'INCREASING' ? 'زيادة مقلقة' : 'انخفاض إيجابي'} في الأنشطة المشبوهة`,
      period: 'يومي'
    });

    return trends;
  }

  /**
   * حساب النقاط المتقدمة للأمان
   */
  private calculateAdvancedSecurityScore(
    riskFactors: RiskFactor[], 
    behaviorAnalysis: BehaviorAnalysis, 
    anomalies: SecurityAnomaly[]
  ): number {
    let score = 100;

    // خصم نقاط بناء على عوامل المخاطر
    riskFactors.forEach(rf => {
      const penalty = {
        'LOW': 2,
        'MEDIUM': 5,
        'HIGH': 10,
        'CRITICAL': 20
      }[rf.severity];
      score -= penalty;
    });

    // خصم نقاط بناء على الانحرافات السلوكية
    const behaviorPenalty = behaviorAnalysis.deviations.reduce((total, dev) => total + (dev.severity * 10), 0);
    score -= behaviorPenalty;

    // خصم نقاط بناء على الشذوذ
    const anomalyPenalty = anomalies.reduce((total, anomaly) => total + (anomaly.severity * 15), 0);
    score -= anomalyPenalty;

    // مكافآت للسلوك الجيد
    if (riskFactors.length === 0) score += 10;
    if (behaviorAnalysis.deviations.length === 0) score += 5;
    if (anomalies.length === 0) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * تحديد مستوى التهديد
   */
  private determineThreatLevel(
    securityScore: number, 
    riskFactors: RiskFactor[], 
    predictions: SecurityPrediction[]
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // مستوى التهديد بناء على النقاط
    if (securityScore < 40) return 'CRITICAL';
    if (securityScore < 60) return 'HIGH';
    if (securityScore < 80) return 'MEDIUM';

    // فحص عوامل المخاطر الحرجة
    const criticalRisks = riskFactors.filter(rf => rf.severity === 'CRITICAL').length;
    if (criticalRisks > 0) return 'CRITICAL';

    const highRisks = riskFactors.filter(rf => rf.severity === 'HIGH').length;
    if (highRisks > 2) return 'HIGH';

    // فحص التنبؤات عالية الاحتمال
    const highProbabilityPredictions = predictions.filter(p => p.probability > 0.7).length;
    if (highProbabilityPredictions > 0) return 'HIGH';

    return 'LOW';
  }

  // دوال مساعدة
  private isUnfamiliarIP(ip: string): boolean {
    // محاكاة فحص قاعدة بيانات عناوين IP المعروفة
    const knownIPs = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];
    return !knownIPs.some(knownIP => ip.startsWith(knownIP.substring(0, 9)));
  }

  private findNormalHours(hours: number[]): number[] {
    // العثور على الساعات الأكثر شيوعاً (ساعات العمل العادية)
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const sortedHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([hour]) => parseInt(hour));

    return sortedHours.slice(0, Math.max(3, sortedHours.length * 0.6));
  }

  private analyzeAccessPatterns(userId: string, logs: SecurityLog[]): AccessPattern[] {
    // تحليل أنماط الوصول للمستخدم
    const userLogs = logs.filter(log => log.userId === userId);
    const patterns = new Map<string, AccessPattern>();

    userLogs.forEach(log => {
      const route = log.details || 'unknown';
      if (!patterns.has(route)) {
        patterns.set(route, {
          route,
          frequency: 0,
          timePatterns: [],
          riskScore: 0
        });
      }
      const pattern = patterns.get(route)!;
      pattern.frequency++;
      pattern.timePatterns.push(log.timestamp.getHours());
    });

    return Array.from(patterns.values()).map(pattern => ({
      ...pattern,
      riskScore: this.calculatePatternRiskScore(pattern)
    }));
  }

  private calculateUserRiskLevel(sessions: ExtendedActiveSession[], logs: SecurityLog[]): number {
    let risk = 0;
    
    // زيادة المخاطر بناء على الأنشطة المشبوهة
    risk += sessions.filter(s => s.isSuspicious).length * 20;
    
    // زيادة المخاطر بناء على الأحداث الأمنية
    const criticalLogs = logs.filter(log => log.severity === 'CRITICAL' || log.severity === 'ERROR');
    risk += criticalLogs.length * 15;
    
    return Math.min(100, risk);
  }

  private identifyBehaviorPatterns(sessions: ExtendedActiveSession[], logs: SecurityLog[]): BehaviorPattern[] {
    const patterns: BehaviorPattern[] = [];

    // نمط أوقات الدخول
    const loginHours = sessions.map(s => new Date(s.lastActivity).getHours());
    const peakHours = this.findPeakHours(loginHours);
    if (peakHours.length > 0) {
      patterns.push({
        type: 'TIME_PATTERN',
        description: `أوقات الذروة: ${peakHours.join(', ')}:00`,
        strength: 0.8,
        samples: loginHours.length
      });
    }

    // نمط الأجهزة
    const deviceTypes = sessions.map(s => s.device);
    const commonDevices = this.findMostCommon(deviceTypes);
    if (commonDevices.length > 0) {
      patterns.push({
        type: 'DEVICE_PATTERN',
        description: `الأجهزة الشائعة: ${commonDevices.join(', ')}`,
        strength: 0.7,
        samples: deviceTypes.length
      });
    }

    return patterns;
  }

  private calculateBehaviorRiskScore(profiles: UserBehaviorProfile[], deviations: BehaviorDeviation[]): number {
    const avgUserRisk = profiles.reduce((sum, profile) => sum + profile.riskLevel, 0) / profiles.length;
    const deviationRisk = deviations.reduce((sum, dev) => sum + dev.severity, 0) * 10;
    return Math.min(100, avgUserRisk + deviationRisk);
  }

  private calculatePatternRiskScore(pattern: AccessPattern): number {
    // حساب مخاطر النمط بناء على التكرار والتوقيت
    let score = 0;
    
    // الأنماط النادرة أكثر خطورة
    if (pattern.frequency < 2) score += 30;
    
    // الأنشطة في أوقات غير عادية أكثر خطورة
    const unusualHours = pattern.timePatterns.filter(h => h < 6 || h > 22).length;
    score += (unusualHours / pattern.timePatterns.length) * 50;
    
    return Math.min(100, score);
  }

  private calculateHourlySessionStats(sessions: ExtendedActiveSession[]): number[] {
    const hourlyStats = new Array(24).fill(0);
    sessions.forEach(session => {
      const hour = new Date(session.lastActivity).getHours();
      hourlyStats[hour]++;
    });
    return hourlyStats;
  }

  private calculateLocationStats(sessions: ExtendedActiveSession[]): Map<string, number> {
    const locationStats = new Map<string, number>();
    sessions.forEach(session => {
      locationStats.set(session.location, (locationStats.get(session.location) || 0) + 1);
    });
    return locationStats;
  }

  private findSuspiciousLocations(locationStats: Map<string, number>): string[] {
    // المواقع التي تظهر لأول مرة أو بشكل نادر
    const total = Array.from(locationStats.values()).reduce((a, b) => a + b, 0);
    const suspicious: string[] = [];
    
    // Get authorized city from config
    let authorizedCity = '';
    try {
        const config = JSON.parse(localStorage.getItem('site_config') || '{}');
        authorizedCity = config.city || '';
    } catch {}
    
    locationStats.forEach((count, location) => {
      const percentage = (count / total) * 100;
      // المواقع التي تشكل أقل من 5% ولا تحتوي على المدينة المصرح بها تعتبر مشبوهة
      if (percentage < 5 && (authorizedCity && !location.includes(authorizedCity))) {
        suspicious.push(location);
      }
    });
    
    return suspicious;
  }

  private detectTemporalAnomalies(logs: SecurityLog[]): SecurityAnomaly | null {
    // كشف الشذوذ في توقيت الأحداث
    const recentLogs = logs.filter(log => 
      Date.now() - log.timestamp.getTime() < 60 * 60 * 1000 // آخر ساعة
    );

    if (recentLogs.length > 50) { // عدد كبير من الأحداث في ساعة واحدة
      return {
        id: 'temporal_anomaly',
        type: 'TEMPORAL',
        severity: 0.9,
        description: `عدد كبير من الأحداث الأمنية في آخر ساعة: ${recentLogs.length}`,
        affectedUsers: [...new Set(recentLogs.map(log => log.userId))],
        detectedAt: new Date(),
        confidence: 0.85,
        possibleCauses: [
          'هجوم آلي',
          'خطأ في النظام',
          'تحديث جماعي'
        ]
      };
    }

    return null;
  }

  private getHistoricalSecurityData(): any {
    // محاكاة بيانات تاريخية
    return {
      loginAttempts: [100, 105, 98, 110, 115, 108, 112],
      suspiciousActivities: [5, 8, 3, 12, 15, 7, 9]
    };
  }

  private calculateTrend(data: number[]): { direction: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE', rate: number } {
    if (data.length < 2) return { direction: 'STABLE', rate: 0 };
    
    const recent = data.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const older = data.slice(0, -3).reduce((a, b) => a + b, 0) / (data.length - 3);
    
    const changeRate = ((recent - older) / older) * 100;
    
    if (Math.abs(changeRate) < 5) return { direction: 'STABLE', rate: changeRate };
    if (changeRate > 20) return { direction: 'VOLATILE', rate: changeRate };
    
    return {
      direction: changeRate > 0 ? 'INCREASING' : 'DECREASING',
      rate: Math.round(Math.abs(changeRate))
    };
  }

  private findPeakHours(hours: number[]): number[] {
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const maxCount = Math.max(...Object.values(hourCounts));
    return Object.entries(hourCounts)
      .filter(([, count]) => count === maxCount)
      .map(([hour]) => parseInt(hour));
  }

  private findMostCommon<T>(items: T[]): T[] {
    const counts = items.reduce((acc, item) => {
      acc.set(item, (acc.get(item) || 0) + 1);
      return acc;
    }, new Map<T, number>());

    const maxCount = Math.max(...counts.values());
    return Array.from(counts.entries())
      .filter(([, count]) => count === maxCount)
      .map(([item]) => item);
  }

  private storeAnalysisForLearning(analysis: AISecurityAnalysis): void {
    // حفظ التحليل للتعلم الآلي المستقبلي
    try {
      const learningData = JSON.parse(localStorage.getItem('ai_security_learning') || '[]');
      learningData.push({
        timestamp: new Date().toISOString(),
        securityScore: analysis.securityScore,
        threatLevel: analysis.threatLevel,
        riskFactorCount: analysis.riskFactors.length,
        behaviorDeviationCount: analysis.behaviorAnalysis.deviations.length,
        anomalyCount: analysis.anomalies.length
      });
      
      // الاحتفاظ بآخر 1000 عينة فقط
      if (learningData.length > 1000) {
        learningData.splice(0, learningData.length - 1000);
      }
      
      localStorage.setItem('ai_security_learning', JSON.stringify(learningData));
    } catch (error) {
      console.warn('فشل في حفظ بيانات التعلم:', error);
    }
  }
}

/**
 * تصدير محرك التحليل الذكي
 */
export const aiSecurityEngine = AISecurityEngine.getInstance();