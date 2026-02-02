/**
 * خدمة التحكم بقاعدة البيانات - Database Control Service
 * نظام الاستعلامات والشكاوى
 */

import { PrismaClient } from '@prisma/client';

// Singleton Prisma client
let prisma: PrismaClient | null = null;
let lastError: { message: string; code?: string; hint?: string; timestamp: string } | null = null;
let connectionHistory: Array<{ status: 'success' | 'error'; timestamp: string; latencyMs?: number; error?: string }> = [];

export const getDbClient = (): PrismaClient => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });
  }
  return prisma;
};

/**
 * فحص صحة الاتصال بقاعدة البيانات
 */
export const checkHealth = async (): Promise<{
  connected: boolean;
  latencyMs: number;
  error?: { message: string; code?: string; hint?: string };
  databaseName?: string;
  serverVersion?: string;
}> => {
  const startTime = Date.now();
  try {
    const client = getDbClient();
    
    // Execute a simple query to test connection
    const result = await client.$queryRaw<Array<{ version: string; current_database: string }>>`
      SELECT version(), current_database()
    `;
    
    const latencyMs = Date.now() - startTime;
    
    // Log success
    connectionHistory.unshift({ status: 'success', timestamp: new Date().toISOString(), latencyMs });
    if (connectionHistory.length > 50) connectionHistory.pop();
    lastError = null;
    
    return {
      connected: true,
      latencyMs,
      databaseName: result[0]?.current_database,
      serverVersion: result[0]?.version?.split(' ')[1] || 'Unknown',
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    
    const errorInfo = {
      message: err.message || 'خطأ غير معروف',
      code: err.code || err.errorCode || 'UNKNOWN',
      hint: getErrorHint(err),
    };
    
    lastError = { ...errorInfo, timestamp: new Date().toISOString() };
    connectionHistory.unshift({ status: 'error', timestamp: new Date().toISOString(), latencyMs, error: errorInfo.message });
    if (connectionHistory.length > 50) connectionHistory.pop();
    
    return {
      connected: false,
      latencyMs,
      error: errorInfo,
    };
  }
};

/**
 * قياس زمن الاستجابة (latency) مع إحصائيات
 */
export const measureLatency = async (iterations: number = 5): Promise<{
  min: number;
  max: number;
  avg: number;
  samples: number[];
  timestamp: string;
}> => {
  const samples: number[] = [];
  const client = getDbClient();
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    try {
      await client.$queryRaw`SELECT 1`;
      samples.push(Date.now() - start);
    } catch {
      samples.push(-1); // Error indicator
    }
  }
  
  const validSamples = samples.filter(s => s >= 0);
  const min = validSamples.length > 0 ? Math.min(...validSamples) : -1;
  const max = validSamples.length > 0 ? Math.max(...validSamples) : -1;
  const avg = validSamples.length > 0 ? Math.round(validSamples.reduce((a, b) => a + b, 0) / validSamples.length) : -1;
  
  return {
    min,
    max,
    avg,
    samples,
    timestamp: new Date().toISOString(),
  };
};

/**
 * تنفيذ استعلام تجريبي
 */
export const runTestQuery = async (query: string = 'SELECT NOW() as server_time, pg_database_size(current_database()) as db_size'): Promise<{
  success: boolean;
  data?: any;
  rowCount?: number;
  executionMs: number;
  error?: { message: string; code?: string; hint?: string };
}> => {
  const startTime = Date.now();
  const client = getDbClient();
  
  try {
    // Only allow SELECT queries for safety
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
      throw new Error('يُسمح فقط باستعلامات SELECT للأمان');
    }
    
    const result = await client.$queryRawUnsafe(query);
    const executionMs = Date.now() - startTime;
    
    return {
      success: true,
      data: result,
      rowCount: Array.isArray(result) ? result.length : 1,
      executionMs,
    };
  } catch (err: any) {
    return {
      success: false,
      executionMs: Date.now() - startTime,
      error: {
        message: err.message || 'خطأ في تنفيذ الاستعلام',
        code: err.code || 'QUERY_ERROR',
        hint: getErrorHint(err),
      },
    };
  }
};

/**
 * الحصول على إحصائيات الاتصال
 */
export const getPoolStats = async (): Promise<{
  activeConnections: number;
  idleConnections: number;
  maxConnections: number;
  waitingRequests: number;
  databaseSize: string;
  tableCount: number;
  uptime: string;
}> => {
  const client = getDbClient();
  
  try {
    // Get connection stats from PostgreSQL
    const connectionStats = await client.$queryRaw<Array<{ active: bigint; idle: bigint; total: bigint }>>`
      SELECT 
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle,
        count(*) as total
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;
    
    // Get max connections
    const maxConns = await client.$queryRaw<Array<{ max_connections: string }>>`
      SHOW max_connections
    `;
    
    // Get database size
    const dbSize = await client.$queryRaw<Array<{ size: string }>>`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    
    // Get table count
    const tableCount = await client.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    
    // Get server uptime
    const uptime = await client.$queryRaw<Array<{ uptime: string }>>`
      SELECT 
        EXTRACT(days FROM (now() - pg_postmaster_start_time())) || ' يوم ' ||
        EXTRACT(hours FROM (now() - pg_postmaster_start_time())) || ' ساعة' as uptime
    `;
    
    return {
      activeConnections: Number(connectionStats[0]?.active || 0),
      idleConnections: Number(connectionStats[0]?.idle || 0),
      maxConnections: Number(maxConns[0]?.max_connections || 100),
      waitingRequests: 0, // Prisma doesn't expose this directly
      databaseSize: dbSize[0]?.size || 'غير معروف',
      tableCount: Number(tableCount[0]?.count || 0),
      uptime: uptime[0]?.uptime || 'غير معروف',
    };
  } catch (err: any) {
    throw new Error(`فشل الحصول على إحصائيات الاتصال: ${err.message}`);
  }
};

/**
 * إعادة الاتصال بقاعدة البيانات
 */
export const reconnectPool = async (): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
}> => {
  const startTime = Date.now();
  
  try {
    // Disconnect existing connection
    if (prisma) {
      await prisma.$disconnect();
      prisma = null;
    }
    
    // Wait a moment before reconnecting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Create new connection
    const client = getDbClient();
    await client.$connect();
    
    // Verify connection works
    await client.$queryRaw`SELECT 1`;
    
    const latencyMs = Date.now() - startTime;
    lastError = null;
    
    return {
      success: true,
      message: 'تم إعادة الاتصال بنجاح',
      latencyMs,
    };
  } catch (err: any) {
    lastError = {
      message: err.message,
      code: err.code,
      hint: getErrorHint(err),
      timestamp: new Date().toISOString(),
    };
    
    return {
      success: false,
      message: `فشل إعادة الاتصال: ${err.message}`,
    };
  }
};

/**
 * الحصول على آخر الأخطاء
 */
export const getErrors = (): {
  lastError: typeof lastError;
  connectionHistory: typeof connectionHistory;
} => {
  return {
    lastError,
    connectionHistory: connectionHistory.slice(0, 20),
  };
};

/**
 * الحصول على تلميح للخطأ بناءً على الكود
 */
function getErrorHint(err: any): string {
  const code = err.code || '';
  const message = err.message || '';
  
  // PostgreSQL error codes
  if (code === 'P1001' || message.includes('Can\'t reach database server')) {
    return 'تأكد من أن خادم قاعدة البيانات يعمل وأن عنوان الاتصال صحيح';
  }
  if (code === 'P1002' || message.includes('timed out')) {
    return 'انتهت مهلة الاتصال - قد يكون الخادم مشغولاً أو غير متاح';
  }
  if (code === 'P1003') {
    return 'قاعدة البيانات غير موجودة - تأكد من إنشائها';
  }
  if (code === '28P01' || message.includes('password authentication failed')) {
    return 'فشل التحقق من كلمة المرور - تحقق من بيانات الاعتماد';
  }
  if (code === '3D000') {
    return 'قاعدة البيانات غير موجودة';
  }
  if (code === '42P01') {
    return 'الجدول غير موجود - قد تحتاج لتشغيل التهجيرات';
  }
  if (code === '42501') {
    return 'صلاحيات غير كافية للمستخدم';
  }
  if (code === '53300' || message.includes('too many connections')) {
    return 'عدد الاتصالات الحالية أكثر من المسموح - جرب إعادة تشغيل التطبيق';
  }
  if (code === '57P01') {
    return 'الخادم يتم إيقافه للصيانة';
  }
  if (code === 'ECONNREFUSED') {
    return 'رفض الاتصال - تأكد من تشغيل خادم PostgreSQL';
  }
  if (code === 'ENOTFOUND') {
    return 'لم يتم العثور على المضيف - تحقق من عنوان الخادم';
  }
  
  return 'حاول مراجعة إعدادات الاتصال في ملف .env (DATABASE_URL)';
}

/**
 * تنظيف الموارد عند إغلاق التطبيق
 */
export const cleanup = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
};
