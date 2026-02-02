/**
 * تكوين قواعد البيانات المتعددة - Multi-Database Configuration
 * نظام الاستعلامات والشكاوى
 * 
 * يدعم: PostgreSQL, Supabase, Oracle, Azure SQL, MySQL
 */

import fs from 'fs';
import path from 'path';

// أنواع قواعد البيانات المدعومة
export type DatabaseProvider = 'postgresql' | 'supabase' | 'oracle' | 'azure' | 'mysql' | 'sqlite';

// واجهة تكوين قاعدة البيانات
export interface DatabaseConfig {
  id: string;
  name: string;
  provider: DatabaseProvider;
  isActive: boolean;
  createdAt: string;
  lastTestedAt?: string;
  lastTestSuccess?: boolean;
  connection: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string; // يجب تشفيرها في الإنتاج
    ssl: boolean;
    poolSize?: number;
    connectionTimeout?: number;
    // خيارات خاصة بكل مزود
    options?: Record<string, any>;
  };
  // معلومات إضافية للمزود
  providerMeta?: {
    // Supabase
    projectRef?: string;
    anonKey?: string;
    serviceRoleKey?: string;
    // Oracle
    serviceName?: string;
    tnsName?: string;
    // Azure
    resourceGroup?: string;
    serverName?: string;
  };
}

// قوالب التكوين لكل مزود
export const providerTemplates: Record<DatabaseProvider, Partial<DatabaseConfig>> = {
  postgresql: {
    provider: 'postgresql',
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'complaints_db',
      username: 'postgres',
      password: '',
      ssl: false,
      poolSize: 10,
      connectionTimeout: 30000,
    },
  },
  supabase: {
    provider: 'supabase',
    connection: {
      host: 'db.xxxxxxxxxxxx.supabase.co',
      port: 5432,
      database: 'postgres',
      username: 'postgres',
      password: '',
      ssl: true,
      poolSize: 10,
      connectionTimeout: 30000,
      options: {
        schema: 'public',
      },
    },
    providerMeta: {
      projectRef: '',
      anonKey: '',
      serviceRoleKey: '',
    },
  },
  oracle: {
    provider: 'oracle',
    connection: {
      host: 'localhost',
      port: 1521,
      database: 'ORCL',
      username: 'system',
      password: '',
      ssl: false,
      poolSize: 5,
      connectionTimeout: 60000,
    },
    providerMeta: {
      serviceName: 'ORCL',
      tnsName: '',
    },
  },
  azure: {
    provider: 'azure',
    connection: {
      host: 'server.database.windows.net',
      port: 1433,
      database: 'complaints_db',
      username: 'admin',
      password: '',
      ssl: true,
      poolSize: 10,
      connectionTimeout: 30000,
      options: {
        encrypt: true,
        trustServerCertificate: false,
      },
    },
    providerMeta: {
      resourceGroup: '',
      serverName: '',
    },
  },
  mysql: {
    provider: 'mysql',
    connection: {
      host: 'localhost',
      port: 3306,
      database: 'complaints_db',
      username: 'root',
      password: '',
      ssl: false,
      poolSize: 10,
      connectionTimeout: 30000,
    },
  },
  sqlite: {
    provider: 'sqlite',
    connection: {
      host: '',
      port: 0,
      database: './data/complaints.db',
      username: '',
      password: '',
      ssl: false,
    },
  },
};

// معلومات المزودين
export const providerInfo: Record<DatabaseProvider, { 
  name: string; 
  nameAr: string; 
  description: string; 
  icon: string;
  connectionStringFormat: string;
  features: string[];
}> = {
  postgresql: {
    name: 'PostgreSQL',
    nameAr: 'بوستجريس',
    description: 'قاعدة بيانات علائقية مفتوحة المصدر قوية',
    icon: '🐘',
    connectionStringFormat: 'postgresql://{user}:{password}@{host}:{port}/{database}',
    features: ['JSON', 'Full-text Search', 'Extensions', 'Replication'],
  },
  supabase: {
    name: 'Supabase',
    nameAr: 'سوبابيس',
    description: 'منصة Backend-as-a-Service مبنية على PostgreSQL',
    icon: '⚡',
    connectionStringFormat: 'postgresql://postgres:{password}@db.{projectRef}.supabase.co:5432/postgres',
    features: ['Real-time', 'Auth', 'Storage', 'Edge Functions', 'REST API'],
  },
  oracle: {
    name: 'Oracle Database',
    nameAr: 'أوراكل',
    description: 'قاعدة بيانات مؤسسية من أوراكل',
    icon: '🔶',
    connectionStringFormat: 'oracle://{user}:{password}@{host}:{port}/{serviceName}',
    features: ['Enterprise', 'Partitioning', 'RAC', 'Data Guard'],
  },
  azure: {
    name: 'Azure SQL',
    nameAr: 'أزور SQL',
    description: 'قاعدة بيانات سحابية من مايكروسوفت',
    icon: '☁️',
    connectionStringFormat: 'sqlserver://{user}:{password}@{host}:{port};database={database};encrypt=true',
    features: ['Cloud', 'Auto-scaling', 'Geo-replication', 'AI Insights'],
  },
  mysql: {
    name: 'MySQL',
    nameAr: 'ماي إس كيو إل',
    description: 'قاعدة بيانات مفتوحة المصدر شائعة',
    icon: '🐬',
    connectionStringFormat: 'mysql://{user}:{password}@{host}:{port}/{database}',
    features: ['InnoDB', 'Replication', 'Partitioning'],
  },
  sqlite: {
    name: 'SQLite',
    nameAr: 'إس كيو لايت',
    description: 'قاعدة بيانات ملف محلية خفيفة',
    icon: '📦',
    connectionStringFormat: 'file:{database}',
    features: ['Serverless', 'Zero-config', 'Self-contained'],
  },
};

// مسار ملف التكوين
const CONFIG_FILE_PATH = path.join(process.cwd(), 'config', 'databases.json');

// التكوين الافتراضي
const defaultConfigurations: DatabaseConfig[] = [
  {
    id: 'default-postgresql',
    name: 'قاعدة البيانات الرئيسية',
    provider: 'postgresql',
    isActive: true,
    createdAt: new Date().toISOString(),
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'complaints_db',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true',
      poolSize: 10,
      connectionTimeout: 30000,
    },
  },
];

// كاش التكوينات
let configurationsCache: DatabaseConfig[] | null = null;

/**
 * تحميل التكوينات من الملف
 */
export const loadConfigurations = (): DatabaseConfig[] => {
  if (configurationsCache) {
    return configurationsCache;
  }

  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      configurationsCache = JSON.parse(data);
      return configurationsCache || defaultConfigurations;
    }
  } catch (error) {
    console.error('خطأ في تحميل تكوينات قواعد البيانات:', error);
  }

  // إنشاء الملف الافتراضي
  saveConfigurations(defaultConfigurations);
  configurationsCache = defaultConfigurations;
  return defaultConfigurations;
};

/**
 * حفظ التكوينات في الملف
 */
export const saveConfigurations = (configs: DatabaseConfig[]): boolean => {
  try {
    const configDir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configs, null, 2), 'utf8');
    configurationsCache = configs;
    return true;
  } catch (error) {
    console.error('خطأ في حفظ تكوينات قواعد البيانات:', error);
    return false;
  }
};

/**
 * الحصول على التكوين النشط
 */
export const getActiveConfiguration = (): DatabaseConfig | null => {
  const configs = loadConfigurations();
  return configs.find(c => c.isActive) || configs[0] || null;
};

/**
 * إضافة تكوين جديد
 */
export const addConfiguration = (config: Omit<DatabaseConfig, 'id' | 'createdAt'>): DatabaseConfig => {
  const configs = loadConfigurations();
  
  const newConfig: DatabaseConfig = {
    ...config,
    id: `db-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  
  // إذا كان نشطاً، إلغاء تنشيط الآخرين
  if (newConfig.isActive) {
    configs.forEach(c => c.isActive = false);
  }
  
  configs.push(newConfig);
  saveConfigurations(configs);
  
  return newConfig;
};

/**
 * تحديث تكوين موجود
 */
export const updateConfiguration = (id: string, updates: Partial<DatabaseConfig>): DatabaseConfig | null => {
  const configs = loadConfigurations();
  const index = configs.findIndex(c => c.id === id);
  
  if (index === -1) {
    return null;
  }
  
  // إذا تم تنشيط هذا التكوين، إلغاء تنشيط الآخرين
  if (updates.isActive) {
    configs.forEach(c => c.isActive = false);
  }
  
  configs[index] = { ...configs[index], ...updates };
  saveConfigurations(configs);
  
  return configs[index];
};

/**
 * حذف تكوين
 */
export const deleteConfiguration = (id: string): boolean => {
  const configs = loadConfigurations();
  const index = configs.findIndex(c => c.id === id);
  
  if (index === -1) {
    return false;
  }
  
  // لا يمكن حذف التكوين النشط الوحيد
  if (configs[index].isActive && configs.length === 1) {
    throw new Error('لا يمكن حذف التكوين النشط الوحيد');
  }
  
  configs.splice(index, 1);
  
  // تنشيط أول تكوين إذا لم يكن هناك نشط
  if (!configs.some(c => c.isActive) && configs.length > 0) {
    configs[0].isActive = true;
  }
  
  saveConfigurations(configs);
  return true;
};

/**
 * تبديل التكوين النشط
 */
export const switchActiveConfiguration = (id: string): DatabaseConfig | null => {
  return updateConfiguration(id, { isActive: true });
};

/**
 * إنشاء CONNECTION_STRING من التكوين
 */
export const buildConnectionString = (config: DatabaseConfig): string => {
  const { provider, connection, providerMeta } = config;
  const { host, port, database, username, password, ssl, options } = connection;
  
  const sslParam = ssl ? '?sslmode=require' : '';
  
  switch (provider) {
    case 'postgresql':
      return `postgresql://${username}:${encodeURIComponent(password)}@${host}:${port}/${database}${sslParam}`;
    
    case 'supabase':
      const projectRef = providerMeta?.projectRef || host.split('.')[1];
      return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;
    
    case 'oracle':
      const serviceName = providerMeta?.serviceName || database;
      return `oracle://${username}:${encodeURIComponent(password)}@${host}:${port}/${serviceName}`;
    
    case 'azure':
      const encryptOption = options?.encrypt !== false ? ';encrypt=true' : '';
      return `sqlserver://${username}:${encodeURIComponent(password)}@${host}:${port};database=${database}${encryptOption}`;
    
    case 'mysql':
      return `mysql://${username}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
    
    case 'sqlite':
      return `file:${database}`;
    
    default:
      throw new Error(`مزود غير مدعوم: ${provider}`);
  }
};

/**
 * تحليل CONNECTION_STRING إلى تكوين
 */
export const parseConnectionString = (connectionString: string): Partial<DatabaseConfig['connection']> | null => {
  try {
    const url = new URL(connectionString);
    
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.replace('/', ''),
      username: url.username,
      password: decodeURIComponent(url.password),
      ssl: url.searchParams.get('sslmode') === 'require' || url.searchParams.get('ssl') === 'true',
    };
  } catch {
    return null;
  }
};

/**
 * تحديث ملف .env بالتكوين الجديد
 */
export const updateEnvFile = (config: DatabaseConfig): boolean => {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const connectionString = buildConnectionString(config);
    
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // تحديث أو إضافة DATABASE_URL
    if (envContent.includes('DATABASE_URL=')) {
      envContent = envContent.replace(/DATABASE_URL=.*/g, `DATABASE_URL="${connectionString}"`);
    } else {
      envContent += `\nDATABASE_URL="${connectionString}"\n`;
    }
    
    // إضافة متغيرات إضافية حسب المزود
    const updates: Record<string, string> = {
      DB_PROVIDER: config.provider,
      DB_HOST: config.connection.host,
      DB_PORT: config.connection.port.toString(),
      DB_NAME: config.connection.database,
      DB_USER: config.connection.username,
    };
    
    for (const [key, value] of Object.entries(updates)) {
      if (envContent.includes(`${key}=`)) {
        envContent = envContent.replace(new RegExp(`${key}=.*`, 'g'), `${key}="${value}"`);
      } else {
        envContent += `${key}="${value}"\n`;
      }
    }
    
    fs.writeFileSync(envPath, envContent, 'utf8');
    return true;
  } catch (error) {
    console.error('خطأ في تحديث ملف .env:', error);
    return false;
  }
};

/**
 * تصدير التكوينات (بدون كلمات المرور)
 */
export const exportConfigurations = (): DatabaseConfig[] => {
  const configs = loadConfigurations();
  return configs.map(config => ({
    ...config,
    connection: {
      ...config.connection,
      password: '***HIDDEN***',
    },
  }));
};

/**
 * استيراد تكوينات من ملف
 */
export const importConfigurations = (configs: DatabaseConfig[]): number => {
  const existingConfigs = loadConfigurations();
  let imported = 0;
  
  for (const config of configs) {
    // تخطي التكوينات الموجودة بنفس الاسم
    if (!existingConfigs.some(c => c.name === config.name)) {
      addConfiguration({
        ...config,
        isActive: false, // لا تنشيط المستوردة تلقائياً
        connection: {
          ...config.connection,
          password: '', // يجب إدخال كلمة المرور يدوياً
        },
      });
      imported++;
    }
  }
  
  return imported;
};
