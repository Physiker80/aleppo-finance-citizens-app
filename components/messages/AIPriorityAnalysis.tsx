import React, { useState } from 'react';
import Card from '../ui/Card';
import { MessagesTimeStats } from '../../types/internalMessageTypes';
import { GeminiAnalysisService } from '../../utils/geminiAnalysis';

interface AIPriorityAnalysisProps {
  stats: MessagesTimeStats;
  onToggleAnalysis: (enabled: boolean) => void;
  onRefreshAnalysis: () => void;
}

const AIPriorityAnalysis: React.FC<AIPriorityAnalysisProps> = ({
  stats,
  onToggleAnalysis,
  onRefreshAnalysis
}) => {
  const [isAnalysisEnabled, setIsAnalysisEnabled] = useState(
    GeminiAnalysisService.isAnalysisEnabled()
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleAnalysis = () => {
    const newState = !isAnalysisEnabled;
    setIsAnalysisEnabled(newState);
    GeminiAnalysisService.setAnalysisEnabled(newState);
    onToggleAnalysis(newState);
  };

  const handleRefresh = async () => {
    if (!isAnalysisEnabled) return;
    
    setIsLoading(true);
    try {
      await onRefreshAnalysis();
    } catch (error) {
      console.error('خطأ في تحديث التحليل:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'منخفض': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'متوسط': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'عالي': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'حرج': return 'text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-800/30';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* عنوان وإعدادات التحليل الذكي */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">🤖</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                تحليل الأولويات بالذكاء الصناعي
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                مدعوم من Gemini 2.5 Pro
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={!isAnalysisEnabled || isLoading}
              className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'جاري التحليل...' : 'تحديث التحليل'}
            </button>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnalysisEnabled}
                onChange={handleToggleAnalysis}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                تفعيل التحليل الذكي
              </span>
            </label>
          </div>
        </div>

        {!isAnalysisEnabled && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border-l-4 border-gray-400">
            <p className="text-gray-700 dark:text-gray-300">
              تم إيقاف تحليل الذكاء الصناعي. قم بتفعيله لرؤية رؤى متقدمة حول أنماط الأولويات.
            </p>
          </div>
        )}
      </Card>

      {/* التحليل الشامل */}
      {isAnalysisEnabled && stats.overallAIAnalysis && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            📊 التحليل الشامل للنظام
          </h4>
          
          {/* نقاط الأداء */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-4 rounded-lg">
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">النقاط الإجمالية</div>
              <div className={`text-2xl font-bold ${getScoreColor(stats.overallAIAnalysis.performanceScore.overall)}`}>
                {stats.overallAIAnalysis.performanceScore.overall}/100
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 p-4 rounded-lg">
              <div className="text-sm text-green-600 dark:text-green-400 font-medium">سرعة الاستجابة</div>
              <div className={`text-2xl font-bold ${getScoreColor(stats.overallAIAnalysis.performanceScore.responsiveness)}`}>
                {stats.overallAIAnalysis.performanceScore.responsiveness}/100
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 p-4 rounded-lg">
              <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">التنظيم</div>
              <div className={`text-2xl font-bold ${getScoreColor(stats.overallAIAnalysis.performanceScore.organization)}`}>
                {stats.overallAIAnalysis.performanceScore.organization}/100
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 p-4 rounded-lg">
              <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">إدارة الأولويات</div>
              <div className={`text-2xl font-bold ${getScoreColor(stats.overallAIAnalysis.performanceScore.priority_handling)}`}>
                {stats.overallAIAnalysis.performanceScore.priority_handling}/100
              </div>
            </div>
          </div>

          {/* تقييم المخاطر */}
          <div className="mb-6">
            <h5 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">⚠️ تقييم المخاطر</h5>
            <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${getRiskColor(stats.overallAIAnalysis.riskAssessment.level)}`}>
              مستوى الخطر: {stats.overallAIAnalysis.riskAssessment.level}
            </div>
            
            <div className="mt-4 space-y-2">
              <div>
                <strong className="text-gray-900 dark:text-gray-100">عوامل الخطر:</strong>
                <ul className="mt-2 list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                  {stats.overallAIAnalysis.riskAssessment.factors.map((factor, index) => (
                    <li key={index}>{factor}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <strong className="text-gray-900 dark:text-gray-100">إجراءات التخفيف:</strong>
                <ul className="mt-2 list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                  {stats.overallAIAnalysis.riskAssessment.mitigation.map((action, index) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* الرؤى العامة */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h5 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">🔍 الرؤى العامة</h5>
              <div className="space-y-3 text-sm">
                <div>
                  <strong className="text-blue-600 dark:text-blue-400">اتجاهات العبء:</strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    {stats.overallAIAnalysis.generalInsights.workloadTrends}
                  </p>
                </div>
                
                <div>
                  <strong className="text-green-600 dark:text-green-400">كفاءة الأقسام:</strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    {stats.overallAIAnalysis.generalInsights.departmentEfficiency}
                  </p>
                </div>
                
                <div>
                  <strong className="text-purple-600 dark:text-purple-400">أنماط التواصل:</strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    {stats.overallAIAnalysis.generalInsights.communicationPatterns}
                  </p>
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">💡 التوصيات</h5>
              <div className="space-y-3">
                <div>
                  <strong className="text-red-600 dark:text-red-400">فورية:</strong>
                  <ul className="mt-1 list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                    {stats.overallAIAnalysis.recommendations.immediate.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <strong className="text-orange-600 dark:text-orange-400">قصيرة المدى:</strong>
                  <ul className="mt-1 list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                    {stats.overallAIAnalysis.recommendations.shortTerm.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <strong className="text-blue-600 dark:text-blue-400">طويلة المدى:</strong>
                  <ul className="mt-1 list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                    {stats.overallAIAnalysis.recommendations.longTerm.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* مستوى الثقة */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                آخر تحديث: {new Date(stats.overallAIAnalysis.analysisTimestamp).toLocaleDateString('ar-SY')}
              </span>
              <span>
                مستوى الثقة: {Math.round(stats.overallAIAnalysis.analysisConfidence * 100)}%
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* تحليل كل أولوية على حدة */}
      {isAnalysisEnabled && (
        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(stats.priorityBreakdown).map(([priority, data]: [string, any]) => (
            <Card key={priority} className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
                  priority === 'عاجل' ? 'bg-red-500' :
                  priority === 'هام' ? 'bg-orange-500' :
                  priority === 'سري' ? 'bg-purple-500' :
                  'bg-gray-500'
                }`}>
                  {priority === 'عاجل' ? '!' : priority === 'هام' ? '⚠' : priority === 'سري' ? '🔒' : '○'}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {priority}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {data.count} رسالة ({data.averageResponseTime?.toFixed(1) || '0.0'} ساعة متوسط الرد)
                  </p>
                </div>
              </div>

              {data.aiAnalysis && (
                <div className="space-y-3">
                  <div>
                    <strong className="text-blue-600 dark:text-blue-400 text-sm">تحليل الأولوية:</strong>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      {data.aiAnalysis.priorityInsight}
                    </p>
                  </div>

                  <div>
                    <strong className="text-green-600 dark:text-green-400 text-sm">الإجراءات المقترحة:</strong>
                    <ul className="mt-1 list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                      {data.aiAnalysis.recommendedActions.map((action, index) => (
                        <li key={index}>{action}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <strong className="text-purple-600 dark:text-purple-400 text-sm">نصائح الكفاءة:</strong>
                    <ul className="mt-1 list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                      {data.aiAnalysis.efficiencyTips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(data.aiAnalysis.riskLevel)}`}>
                      خطر {data.aiAnalysis.riskLevel}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ثقة: {Math.round(data.aiAnalysis.analysisConfidence * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIPriorityAnalysis;