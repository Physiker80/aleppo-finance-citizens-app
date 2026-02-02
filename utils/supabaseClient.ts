import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default from environment variables
const defaultSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const defaultSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check localStorage for custom config
const getSupabaseConfig = (): { url: string; anonKey: string } => {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return {
        url: defaultSupabaseUrl || '',
        anonKey: defaultSupabaseAnonKey || '',
      };
    }
    
    const stored = localStorage.getItem('db_configurations');
    if (stored) {
      const configs = JSON.parse(stored);
      const activeSupabase = configs.find((c: any) => 
        c.isActive && c.provider === 'supabase'
      );
      if (activeSupabase) {
        // Get anon key from providerMeta
        const anonKey = activeSupabase.providerMeta?.anonKey;
        
        // Extract project ref from various sources
        let projectRef = activeSupabase.providerMeta?.projectRef;
        
        // Try to extract from host if not in providerMeta
        if (!projectRef && activeSupabase.connection?.host) {
          const hostParts = activeSupabase.connection.host.split('.');
          // Format: db.PROJECT_REF.supabase.co or PROJECT_REF.supabase.co
          if (hostParts.includes('supabase')) {
            if (hostParts[0] === 'db' && hostParts.length >= 3) {
              projectRef = hostParts[1]; // db.PROJECT_REF.supabase.co
            } else if (hostParts.length >= 2) {
              projectRef = hostParts[0]; // PROJECT_REF.supabase.co
            }
          }
        }
        
        if (projectRef && anonKey) {
          return {
            url: `https://${projectRef}.supabase.co`,
            anonKey: anonKey,
          };
        }
        
        // If we have projectRef but no anonKey, try to use fallback anonKey
        if (projectRef && !anonKey) {
          const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodXRtcmJqdnZwbHF1Z29id2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzA0NzgsImV4cCI6MjA4NTQ0NjQ3OH0.bzynb0G41o2c1m35AodyVVgZBNXzPvGbKWJWKpBqGH8';
          console.warn(
            'Supabase تم العثور على Project Ref لكن Anon Key غير موجود. سيتم استخدام المفتاح الافتراضي.'
          );
          return {
            url: `https://${projectRef}.supabase.co`,
            anonKey: defaultSupabaseAnonKey || FALLBACK_ANON_KEY,
          };
        }
      }
    }
  } catch (e) {
    console.error('Error reading Supabase config from localStorage:', e);
  }
  
  // Hardcoded fallback for production
  const FALLBACK_URL = 'https://whutmrbjvvplqugobwbq.supabase.co';
  const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodXRtcmJqdnZwbHF1Z29id2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzA0NzgsImV4cCI6MjA4NTQ0NjQ3OH0.bzynb0G41o2c1m35AodyVVgZBNXzPvGbKWJWKpBqGH8';
  
  return {
    url: defaultSupabaseUrl || FALLBACK_URL,
    anonKey: defaultSupabaseAnonKey || FALLBACK_ANON_KEY,
  };
};

// Lazy client - only create when needed and when config is available
let _supabaseClient: SupabaseClient | null = null;

const getOrCreateClient = (): SupabaseClient | null => {
  const config = getSupabaseConfig();
  
  if (!config.url || !config.anonKey) {
    console.warn(
      'Supabase URL or Anon Key is missing. Please configure database in settings.'
    );
    return null;
  }
  
  if (!_supabaseClient) {
    _supabaseClient = createClient(config.url, config.anonKey);
  }
  
  return _supabaseClient;
};

// Export a proxy that lazily creates the client
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getOrCreateClient();
    if (!client) {
      // Return a mock that throws helpful error
      if (prop === 'from') {
        return () => ({
          select: () => Promise.resolve({ data: null, error: { message: 'لم يتم تكوين اتصال Supabase' } }),
          insert: () => Promise.resolve({ data: null, error: { message: 'لم يتم تكوين اتصال Supabase' } }),
          update: () => Promise.resolve({ data: null, error: { message: 'لم يتم تكوين اتصال Supabase' } }),
          delete: () => Promise.resolve({ data: null, error: { message: 'لم يتم تكوين اتصال Supabase' } }),
        });
      }
      return undefined;
    }
    return (client as any)[prop];
  }
});

/**
 * Get a dynamic Supabase client with current configuration from localStorage
 * This is useful when the config may have changed after initial load
 */
// Cache the dynamic client to avoid creating multiple instances
let _dynamicClient: SupabaseClient | null = null;

export const getDynamicSupabaseClient = (): SupabaseClient | null => {
  // Return cached client if exists
  if (_dynamicClient) {
    return _dynamicClient;
  }
  
  // Hardcoded fallback values - ALWAYS USE THESE FOR NOW
  const FALLBACK_URL = 'https://whutmrbjvvplqugobwbq.supabase.co';
  const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodXRtcmJqdnZwbHF1Z29id2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzA0NzgsImV4cCI6MjA4NTQ0NjQ3OH0.bzynb0G41o2c1m35AodyVVgZBNXzPvGbKWJWKpBqGH8';

  // Force use hardcoded values
  const url = FALLBACK_URL;
  const anonKey = FALLBACK_ANON_KEY;
  
  // Create client - Supabase JS v2 automatically adds apikey header from the second parameter
  _dynamicClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  
  return _dynamicClient;
};

/**
 * Reset the cached client (useful when config changes)
 */
export const resetSupabaseClient = (): void => {
  _supabaseClient = null;
};

// Function to test Supabase connection
export const testSupabaseConnection = async (url?: string, anonKey?: string): Promise<{
  success: boolean;
  latencyMs?: number;
  error?: string;
  version?: string;
}> => {
  const currentConfig = getSupabaseConfig();
  const testUrl = url || currentConfig.url;
  const testKey = anonKey || currentConfig.anonKey;
  
  if (!testUrl || !testKey) {
    return { success: false, error: 'Missing Supabase URL or Anon Key' };
  }
  
  const start = performance.now();
  
  try {
    const testClient = createClient(testUrl, testKey);
    
    // Try a simple query to test connection
    const { data, error } = await testClient.from('_test_connection_').select('*').limit(1);
    
    const latencyMs = Math.round(performance.now() - start);
    
    // Even if table doesn't exist, if we get a proper error response, connection works
    if (error) {
      // If error is "relation does not exist", connection is working
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return { success: true, latencyMs, version: 'Connected' };
      }
      // For other errors, check if it's a network/auth error
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        return { success: false, error: error.message, latencyMs };
      }
    }
    
    return { success: true, latencyMs, version: 'Connected' };
  } catch (e: any) {
    const latencyMs = Math.round(performance.now() - start);
    return { success: false, error: e.message, latencyMs };
  }
};

// Re-export createClient for custom instances
export { createClient };
export type { SupabaseClient };
