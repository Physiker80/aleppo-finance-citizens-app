/**
 * Storage Mode Service
 * يدير التبديل بين وضع قاعدة البيانات والوضع المحلي
 * Manages switching between database mode and local storage mode
 */

// Note: Direct REST API is used instead of Supabase SDK for reliability

export type StorageMode = 'database' | 'local' | 'hybrid';

export interface StorageModeConfig {
  mode: StorageMode;
  autoSwitch: boolean; // Auto-switch to local when offline
  syncOnReconnect: boolean; // Sync local changes when back online
  lastSyncTime: string | null;
  pendingSyncCount: number;
}

const STORAGE_MODE_KEY = 'app_storage_mode';
const PENDING_SYNC_KEY = 'pending_sync_operations';

// Default configuration
const defaultConfig: StorageModeConfig = {
  mode: 'hybrid', // Default to hybrid (use DB when available, fallback to local)
  autoSwitch: true,
  syncOnReconnect: true,
  lastSyncTime: null,
  pendingSyncCount: 0,
};

/**
 * Get current storage mode configuration
 */
export function getStorageModeConfig(): StorageModeConfig {
  try {
    const stored = localStorage.getItem(STORAGE_MODE_KEY);
    if (stored) {
      return { ...defaultConfig, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error reading storage mode config:', e);
  }
  return defaultConfig;
}

/**
 * Save storage mode configuration
 */
export function saveStorageModeConfig(config: Partial<StorageModeConfig>): void {
  try {
    const current = getStorageModeConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_MODE_KEY, JSON.stringify(updated));
    
    // Dispatch event for listeners
    window.dispatchEvent(new CustomEvent('storageModeChanged', { detail: updated }));
  } catch (e) {
    console.error('Error saving storage mode config:', e);
  }
}

/**
 * Get current storage mode
 */
export function getCurrentMode(): StorageMode {
  return getStorageModeConfig().mode;
}

/**
 * Set storage mode
 */
export function setStorageMode(mode: StorageMode): void {
  saveStorageModeConfig({ mode });
}

/**
 * Check if currently using local storage
 */
export function isLocalMode(): boolean {
  const config = getStorageModeConfig();
  if (config.mode === 'local') return true;
  if (config.mode === 'hybrid' && !navigator.onLine) return true;
  return false;
}

/**
 * Check if should use database
 */
export function shouldUseDatabase(): boolean {
  const config = getStorageModeConfig();
  if (config.mode === 'database') return true;
  if (config.mode === 'hybrid' && navigator.onLine) return true;
  return false;
}

// ============= Attachment Handling =============

/**
 * Interface for attachment metadata (stored in database)
 */
export interface AttachmentMeta {
  name: string;
  size: number;
  type: string;
  url?: string;        // URL from Supabase Storage
  base64?: string;     // Base64 data for small files
  uploadedAt?: string;
}

/**
 * Convert File to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Convert base64 string back to File
 */
export function base64ToFile(base64: string, filename: string, mimeType: string): File {
  // Extract base64 data from data URL
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new File([byteArray], filename, { type: mimeType });
}

/**
 * Convert File array to AttachmentMeta array (with base64 for small files)
 * Files larger than 5MB are skipped (too large for database storage)
 */
export async function filesToAttachmentMeta(files: File[]): Promise<AttachmentMeta[]> {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit for base64 storage
  const attachments: AttachmentMeta[] = [];
  
  for (const file of files) {
    if (file.size <= MAX_SIZE) {
      try {
        const base64 = await fileToBase64(file);
        attachments.push({
          name: file.name,
          size: file.size,
          type: file.type,
          base64,
          uploadedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Error converting file to base64:', file.name, e);
      }
    } else {
      // For large files, store metadata only (no base64)
      attachments.push({
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      });
    }
  }
  
  return attachments;
}

/**
 * Convert AttachmentMeta array back to File array
 */
export function attachmentMetaToFiles(attachments: AttachmentMeta[]): File[] {
  const files: File[] = [];
  
  for (const att of attachments) {
    if (att.base64) {
      try {
        const file = base64ToFile(att.base64, att.name, att.type);
        files.push(file);
      } catch (e) {
        console.error('Error converting base64 to file:', att.name, e);
      }
    }
  }
  
  return files;
}

// ============= End Attachment Handling =============

// Pending sync operations interface
export interface PendingSyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'ticket' | 'contactMessage' | 'employee' | 'notification';
  data: any;
  timestamp: string;
  retryCount: number;
}

/**
 * Get pending sync operations
 */
export function getPendingSyncOperations(): PendingSyncOperation[] {
  try {
    const stored = localStorage.getItem(PENDING_SYNC_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading pending sync operations:', e);
  }
  return [];
}

/**
 * Add a pending sync operation
 */
export function addPendingSyncOperation(operation: Omit<PendingSyncOperation, 'id' | 'timestamp' | 'retryCount'>): void {
  try {
    const operations = getPendingSyncOperations();
    const newOp: PendingSyncOperation = {
      ...operation,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    operations.push(newOp);
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(operations));
    
    // Update pending count
    const config = getStorageModeConfig();
    saveStorageModeConfig({ pendingSyncCount: operations.length });
  } catch (e) {
    console.error('Error adding pending sync operation:', e);
  }
}

/**
 * Remove a pending sync operation
 */
export function removePendingSyncOperation(id: string): void {
  try {
    const operations = getPendingSyncOperations().filter(op => op.id !== id);
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(operations));
    saveStorageModeConfig({ pendingSyncCount: operations.length });
  } catch (e) {
    console.error('Error removing pending sync operation:', e);
  }
}

/**
 * Clear all pending sync operations
 */
export function clearPendingSyncOperations(): void {
  try {
    localStorage.removeItem(PENDING_SYNC_KEY);
    saveStorageModeConfig({ pendingSyncCount: 0 });
  } catch (e) {
    console.error('Error clearing pending sync operations:', e);
  }
}

/**
 * Update last sync time
 */
export function updateLastSyncTime(): void {
  saveStorageModeConfig({ lastSyncTime: new Date().toISOString() });
}

/**
 * Export local data for backup
 */
export function exportLocalData(): Record<string, any> {
  const data: Record<string, any> = {};
  const keysToExport = [
    'tickets',
    'employees',
    'contactMessages',
    'notifications',
    'departmentsList',
    'internalMessages',
    'surveys',
  ];
  
  for (const key of keysToExport) {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        data[key] = JSON.parse(stored);
      }
    } catch (e) {
      console.error(`Error exporting ${key}:`, e);
    }
  }
  
  data._exportedAt = new Date().toISOString();
  data._version = '1.0';
  
  return data;
}

/**
 * Import data to local storage
 */
export function importLocalData(data: Record<string, any>): { success: boolean; imported: string[]; errors: string[] } {
  const imported: string[] = [];
  const errors: string[] = [];
  
  const keysToImport = [
    'tickets',
    'employees',
    'contactMessages',
    'notifications',
    'departmentsList',
    'internalMessages',
    'surveys',
  ];
  
  for (const key of keysToImport) {
    if (data[key]) {
      try {
        localStorage.setItem(key, JSON.stringify(data[key]));
        imported.push(key);
      } catch (e: any) {
        errors.push(`${key}: ${e.message}`);
      }
    }
  }
  
  return { 
    success: errors.length === 0, 
    imported, 
    errors 
  };
}

/**
 * Get storage statistics
 */
export function getStorageStats(): {
  localSize: string;
  itemCount: number;
  pendingSync: number;
  lastSync: string | null;
  mode: StorageMode;
  isOnline: boolean;
} {
  let totalSize = 0;
  let itemCount = 0;
  
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += value.length * 2; // UTF-16
        itemCount++;
      }
    }
  }
  
  const config = getStorageModeConfig();
  
  return {
    localSize: formatBytes(totalSize),
    itemCount,
    pendingSync: config.pendingSyncCount,
    lastSync: config.lastSyncTime,
    mode: config.mode,
    isOnline: navigator.onLine,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const config = getStorageModeConfig();
    if (config.autoSwitch && config.mode === 'hybrid') {
      console.log('🌐 Back online - switching to database mode');
      window.dispatchEvent(new CustomEvent('storageModeChanged', { 
        detail: { ...config, effectiveMode: 'database' } 
      }));
    }
  });
  
  window.addEventListener('offline', () => {
    const config = getStorageModeConfig();
    if (config.autoSwitch && config.mode === 'hybrid') {
      console.log('📴 Offline - switching to local mode');
      window.dispatchEvent(new CustomEvent('storageModeChanged', { 
        detail: { ...config, effectiveMode: 'local' } 
      }));
    }
  });
}

/**
 * Storage Mode Service - centralized service for sync operations
 */
export const storageModeService = {
  /**
   * Get current mode
   */
  getMode(): StorageMode {
    return getCurrentMode();
  },
  
  /**
   * Set storage mode
   */
  setMode(mode: StorageMode): void {
    saveStorageModeConfig({ mode });
  },
  
  /**
   * Check if using database mode
   */
  isOnlineMode(): boolean {
    const mode = getCurrentMode();
    return mode === 'database' || (mode === 'hybrid' && navigator.onLine);
  },
  
  /**
   * Get pending sync operations
   */
  getPendingSync(): PendingSyncOperation[] {
    return getPendingSyncOperations();
  },
  
  /**
   * Clear pending sync
   */
  clearPendingSync(): void {
    clearPendingSyncOperations();
  },
  
  /**
   * Sync data from Supabase to localStorage
   */
  async syncToLocal(): Promise<{ success: boolean; error?: string; syncedCounts?: Record<string, number> }> {
    console.log('[syncToLocal] Starting sync from Supabase...');
    
    // Use direct fetch instead of Supabase client
    const SUPABASE_URL = 'https://whutmrbjvvplqugobwbq.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodXRtcmJqdnZwbHF1Z29id2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzA0NzgsImV4cCI6MjA4NTQ0NjQ3OH0.bzynb0G41o2c1m35AodyVVgZBNXzPvGbKWJWKpBqGH8';
    
    const syncedCounts: Record<string, number> = {};
    
    try {
      // Fetch tickets directly via REST API
      console.log('[syncToLocal] Fetching tickets via REST...');
      const ticketsResponse = await fetch(`${SUPABASE_URL}/rest/v1/tickets?select=*`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      });
      
      const ticketsText = await ticketsResponse.text();
      
      if (ticketsResponse.ok) {
        const tickets = JSON.parse(ticketsText);
        // Convert Supabase schema to localStorage schema
        const convertedTickets = tickets.map((t: any) => ({
          id: t.id,
          status: t.status || 'جديد',
          fullName: t.name || t.fullName || '',
          phone: t.phone || '',
          email: t.email || '',
          nationalId: t.national_id || t.nationalId || '',
          requestType: t.type || t.requestType || 'استعلام',
          department: t.department || '',
          details: t.description || t.details || '',
          submissionDate: t.date || t.created_at || t.submissionDate || new Date().toISOString(),
          response: t.response || '',
          answeredAt: t.answered_at || t.answeredAt,
          closedAt: t.closed_at || t.closedAt,
          startedAt: t.started_at || t.startedAt,
          forwardedTo: t.forwarded_to || t.forwardedTo || [],
          source: t.source || 'web',
          notes: t.notes || '',
          // بيانات توثيق الديوان
          diwanNumber: t.diwan_number || t.diwanNumber || null,
          diwanDate: t.diwan_date || t.diwanDate || null,
          // بيانات المرفقات (للتزامن)
          attachments_data: t.attachments_data || null,
          response_attachments_data: t.response_attachments_data || null,
        }));
        localStorage.setItem('tickets', JSON.stringify(convertedTickets));
        syncedCounts.tickets = convertedTickets.length;
      } else {
        console.error('Error fetching tickets:', ticketsText);
        return { success: false, error: `فشل جلب التذاكر: ${ticketsResponse.status} - ${ticketsText}` };
      }
      
      // Fetch employees
      const employeesResponse = await fetch(`${SUPABASE_URL}/rest/v1/employees?select=*`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (employeesResponse.ok) {
        const employees = await employeesResponse.json();
        const convertedEmployees = employees.map((e: any) => ({
          username: e.username,
          password: e.password,
          name: e.full_name || e.name || e.username,
          department: e.department || '',
          role: e.role || 'موظف',
          employeeNumber: e.employee_number || e.employeeNumber || '',
          nationalId: e.national_id || e.nationalId || '',
        }));
        localStorage.setItem('employees', JSON.stringify(convertedEmployees));
        syncedCounts.employees = convertedEmployees.length;
      }
      
      return { success: true, syncedCounts };
    } catch (error: any) {
      console.error('Sync error:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Sync data from localStorage to Supabase
   * Uses direct REST API calls instead of Supabase SDK
   */
  async syncToCloud(): Promise<{ success: boolean; error?: string; syncedCounts?: Record<string, number> }> {
    // Hardcoded Supabase credentials for direct REST API
    const SUPABASE_URL = 'https://whutmrbjvvplqugobwbq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodXRtcmJqdnZwbHF1Z29id2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzA0NzgsImV4cCI6MjA4NTQ0NjQ3OH0.bzynb0G41o2c1m35AodyVVgZBNXzPvGbKWJWKpBqGH8';
    
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };
    
    const syncedCounts: Record<string, number> = {};
    const errors: string[] = [];
    
    try {
      // Get pending operations
      const pendingOps = getPendingSyncOperations();
      
      for (const op of pendingOps) {
        try {
          const tableName = op.entity === 'ticket' ? 'tickets' 
            : op.entity === 'employee' ? 'employees'
            : op.entity === 'contactMessage' ? 'contact_messages'
            : op.entity === 'notification' ? 'notifications'
            : null;
          
          if (!tableName) continue;
          
          let response: Response;
          
          if (op.type === 'create') {
            response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}`, {
              method: 'POST',
              headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
              body: JSON.stringify(op.data)
            });
          } else if (op.type === 'update') {
            response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?id=eq.${op.data.id}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify(op.data)
            });
          } else if (op.type === 'delete') {
            response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?id=eq.${op.data.id}`, {
              method: 'DELETE',
              headers
            });
          } else {
            continue;
          }
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
          }
          
          syncedCounts[op.entity] = (syncedCounts[op.entity] || 0) + 1;
          removePendingSyncOperation(op.id);
        } catch (opError: any) {
          errors.push(`${op.entity}: ${opError.message}`);
          // Increment retry count
          const ops = getPendingSyncOperations();
          const idx = ops.findIndex(o => o.id === op.id);
          if (idx >= 0) {
            ops[idx].retryCount++;
            localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(ops));
          }
        }
      }
      
      // Update last sync time
      updateLastSyncTime();
      
      if (errors.length > 0) {
        return { success: false, error: errors.join('\n'), syncedCounts };
      }
      
      return { success: true, syncedCounts };
    } catch (err: any) {
      return { success: false, error: err.message || 'خطأ غير معروف' };
    }
  },
  
  /**
   * Add operation to pending sync queue
   */
  addToPendingSync(operation: Omit<PendingSyncOperation, 'id' | 'timestamp' | 'retryCount'>): void {
    addPendingSyncOperation(operation);
  },

  /**
   * Migrate all local data to Supabase (full sync from localStorage to cloud)
   * This is for initial migration when local data needs to be pushed to cloud
   * Uses direct REST API calls instead of Supabase SDK for reliability
   */
  async migrateToCloud(): Promise<{ 
    success: boolean; 
    error?: string; 
    syncedCounts?: Record<string, number>;
    errors?: string[];
  }> {
    // Hardcoded Supabase credentials for direct REST API
    const SUPABASE_URL = 'https://whutmrbjvvplqugobwbq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodXRtcmJqdnZwbHF1Z29id2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzA0NzgsImV4cCI6MjA4NTQ0NjQ3OH0.bzynb0G41o2c1m35AodyVVgZBNXzPvGbKWJWKpBqGH8';
    
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    };
    
    const syncedCounts: Record<string, number> = {};
    const errors: string[] = [];
    
    // Helper function to upsert data using REST API
    // onConflict: specify the column(s) for conflict resolution (e.g., 'username' or 'id')
    const upsertData = async (table: string, data: any[], onConflict?: string): Promise<{ success: boolean; error?: string }> => {
      try {
        // Build URL with on_conflict parameter if specified
        let url = `${SUPABASE_URL}/rest/v1/${table}`;
        if (onConflict) {
          url += `?on_conflict=${onConflict}`;
        }
        
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          return { success: false, error: errorText };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    };
    
    try {
      // Migrate tickets
      const ticketsRaw = localStorage.getItem('tickets');
      if (ticketsRaw) {
        const tickets = JSON.parse(ticketsRaw);
        if (Array.isArray(tickets) && tickets.length > 0) {
          // Clean data for Supabase - map to columns that exist in the database
          // IMPORTANT: All objects MUST have the same keys for Supabase REST API (PGRST102)
          const cleanTickets = tickets.map((t: any) => ({
            id: t.id || `ticket_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            type: t.requestType || t.type || 'استعلام',
            name: t.name || t.fullName || '',
            phone: t.phone || '',
            email: t.email || '',
            national_id: t.nationalId || t.national_id || '',
            department: t.department || '',
            description: t.details || t.subject || t.message || t.description || '',
            status: t.status || 'جديد',
            response: t.response || null,
            notes: t.notes || null,
            source: t.source || 'web',
            date: t.createdAt || t.submissionDate || t.date || new Date().toISOString(),
            answered_at: t.answeredAt || t.answered_at || null,
            started_at: t.startedAt || t.started_at || null,
            closed_at: t.closedAt || t.closed_at || null,
            forwarded_to: t.forwardedTo || t.forwarded_to || [],
            // بيانات توثيق الديوان
            diwan_number: t.diwanNumber || t.diwan_number || null,
            diwan_date: t.diwanDate || t.diwan_date || null,
            // بيانات المرفقات (JSON)
            attachments_data: t.attachments_data || null,
            response_attachments_data: t.response_attachments_data || null,
          }));
          
          // Use REST API with upsert - 'id' as conflict column
          const result = await upsertData('tickets', cleanTickets, 'id');
          
          if (!result.success) {
            errors.push(`tickets: ${result.error}`);
          } else {
            syncedCounts.tickets = cleanTickets.length;
          }
        }
      }
      
      // Migrate employees
      const employeesRaw = localStorage.getItem('employees');
      if (employeesRaw) {
        const employees = JSON.parse(employeesRaw);
        if (Array.isArray(employees) && employees.length > 0) {
          const cleanEmployees = employees.map((e: any) => ({
            id: e.id || `emp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            username: e.username,
            password: e.password, // Note: In production, this should be hashed
            role: e.role,
            department: e.department,
            created_at: e.createdAt || new Date().toISOString(),
          }));
          
          // Use 'username' as conflict column to handle duplicates
          const result = await upsertData('employees', cleanEmployees, 'username');
          
          if (!result.success) {
            errors.push(`employees: ${result.error}`);
          } else {
            syncedCounts.employees = cleanEmployees.length;
          }
        }
      }
      
      // Migrate contact messages
      const contactMessagesRaw = localStorage.getItem('contactMessages');
      if (contactMessagesRaw) {
        const contactMessages = JSON.parse(contactMessagesRaw);
        if (Array.isArray(contactMessages) && contactMessages.length > 0) {
          // Only include columns that exist in Supabase contact_messages table
          const cleanMessages = contactMessages.map((m: any) => ({
            id: m.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            name: m.name,
            email: m.email,
            phone: m.phone,
            message: m.message || m.subject || '', // Fallback to subject if message is empty
            created_at: m.createdAt || new Date().toISOString(),
          }));
          
          // Use 'id' as conflict column
          const result = await upsertData('contact_messages', cleanMessages, 'id');
          
          if (!result.success) {
            errors.push(`contact_messages: ${result.error}`);
          } else {
            syncedCounts.contactMessages = cleanMessages.length;
          }
        }
      }
      
      // Migrate notifications
      const notificationsRaw = localStorage.getItem('notifications');
      if (notificationsRaw) {
        const notifications = JSON.parse(notificationsRaw);
        if (Array.isArray(notifications) && notifications.length > 0) {
          const cleanNotifications = notifications.map((n: any) => ({
            id: n.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            // Map 'kind' from local to 'type' column in Supabase Notification table
            type: n.kind || n.type || 'ticket-new',
            department: n.department,
            ticket_id: n.ticketId,
            message: n.message,
            is_read: n.isRead || n.read || false,
            created_at: n.createdAt || new Date().toISOString(),
          }));
          
          // Use 'id' as conflict column
          const result = await upsertData('notifications', cleanNotifications, 'id');
          
          if (!result.success) {
            errors.push(`notifications: ${result.error}`);
          } else {
            syncedCounts.notifications = cleanNotifications.length;
          }
        }
      }
      
      // Migrate appointments - ترحيل المواعيد
      const appointmentsRaw = localStorage.getItem('appointments');
      if (appointmentsRaw) {
        const appointments = JSON.parse(appointmentsRaw);
        if (Array.isArray(appointments) && appointments.length > 0) {
          const cleanAppointments = appointments.map((a: any) => ({
            id: a.id || `appt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            citizen_id: a.citizenId || a.citizen_id || '',
            full_name: a.fullName || a.full_name || '',
            phone_number: a.phoneNumber || a.phone_number || '',
            email: a.email || null,
            date: a.date,
            start_time: a.timeSlot?.startTime || a.start_time || '08:00',
            end_time: a.timeSlot?.endTime || a.end_time || '08:15',
            service_category: a.serviceCategory || a.service_category || 'other',
            service_description: a.serviceDescription || a.service_description || null,
            status: a.status || 'pending',
            priority: a.priority || 'normal',
            assigned_counter: a.assignedCounter || a.assigned_counter || null,
            assigned_employee: a.assignedEmployee || a.assigned_employee || null,
            is_verified: a.isVerified || a.is_verified || false,
            verification_code: a.verificationCode || a.verification_code || null,
            qr_code: a.qrCode || a.qr_code || null,
            created_at: a.createdAt || a.created_at || new Date().toISOString(),
            confirmed_at: a.confirmedAt || a.confirmed_at || null,
            checked_in_at: a.checkedInAt || a.checked_in_at || null,
            started_at: a.startedAt || a.started_at || null,
            completed_at: a.completedAt || a.completed_at || null,
            cancelled_at: a.cancelledAt || a.cancelled_at || null,
            notes: a.notes || null,
            cancellation_reason: a.cancellationReason || a.cancellation_reason || null,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          }));
          
          // Use 'id' as conflict column
          const result = await upsertData('appointments', cleanAppointments, 'id');
          
          if (!result.success) {
            errors.push(`appointments: ${result.error}`);
          } else {
            syncedCounts.appointments = cleanAppointments.length;
          }
        }
      }
      
      // Update last sync time
      updateLastSyncTime();
      
      if (errors.length > 0) {
        return { success: false, error: 'بعض البيانات لم تُرحّل', syncedCounts, errors };
      }
      
      return { success: true, syncedCounts };
    } catch (err: any) {
      return { success: false, error: err.message || 'خطأ غير معروف', errors };
    }
  },

  /**
   * Sync appointments from Supabase to localStorage
   * مزامنة المواعيد من السحابة إلى المحلي
   */
  async syncAppointmentsToLocal(): Promise<{ success: boolean; error?: string; count?: number }> {
    console.log('[syncAppointmentsToLocal] Starting sync from Supabase...');
    
    const SUPABASE_URL = 'https://whutmrbjvvplqugobwbq.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodXRtcmJqdnZwbHF1Z29id2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzA0NzgsImV4cCI6MjA4NTQ0NjQ3OH0.bzynb0G41o2c1m35AodyVVgZBNXzPvGbKWJWKpBqGH8';
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/appointments?select=*&order=created_at.desc`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `فشل جلب المواعيد: ${response.status} - ${errorText}` };
      }
      
      const data = await response.json();
      
      // Convert from Supabase format to localStorage format
      const convertedAppointments = data.map((a: any) => ({
        id: a.id,
        citizenId: a.citizen_id,
        fullName: a.full_name,
        phoneNumber: a.phone_number,
        email: a.email,
        date: a.date,
        timeSlot: {
          id: `slot_${a.date}_${a.start_time}`,
          startTime: a.start_time,
          endTime: a.end_time,
          maxCapacity: 5,
          currentBookings: 0,
          isAvailable: true
        },
        serviceCategory: a.service_category,
        serviceDescription: a.service_description,
        status: a.status,
        priority: a.priority,
        assignedCounter: a.assigned_counter,
        assignedEmployee: a.assigned_employee,
        isVerified: a.is_verified,
        verificationCode: a.verification_code,
        qrCode: a.qr_code,
        createdAt: a.created_at,
        confirmedAt: a.confirmed_at,
        checkedInAt: a.checked_in_at,
        startedAt: a.started_at,
        completedAt: a.completed_at,
        cancelledAt: a.cancelled_at,
        notes: a.notes,
        cancellationReason: a.cancellation_reason,
        syncStatus: 'synced',
        lastSyncedAt: a.last_synced_at,
      }));
      
      localStorage.setItem('appointments', JSON.stringify(convertedAppointments));
      localStorage.setItem('appointments_last_sync', new Date().toISOString());
      
      return { success: true, count: convertedAppointments.length };
    } catch (error: any) {
      console.error('Appointments sync error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get appointment sync status
   * الحصول على حالة مزامنة المواعيد
   */
  getAppointmentSyncStatus(): { lastSync: string | null; pendingCount: number; isOnline: boolean } {
    try {
      const appointmentsRaw = localStorage.getItem('appointments');
      const appointments = appointmentsRaw ? JSON.parse(appointmentsRaw) : [];
      const pendingCount = appointments.filter((a: any) => a.syncStatus === 'pending').length;
      const lastSync = localStorage.getItem('appointments_last_sync');
      
      return {
        lastSync,
        pendingCount,
        isOnline: navigator.onLine
      };
    } catch {
      return {
        lastSync: null,
        pendingCount: 0,
        isOnline: navigator.onLine
      };
    }
  },

  // ============= Internal Messages Sync =============
  
  /**
   * Sync internal messages from localStorage to Supabase
   * مزامنة الرسائل الداخلية من المحلي إلى السحابة
   */
  async syncInternalMessagesToCloud(): Promise<{ success: boolean; error?: string; count?: number }> {
    console.log('[syncInternalMessagesToCloud] Starting sync...');
    
    const SUPABASE_URL = 'https://whutmrbjvvplqugobwbq.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodXRtcmJqdnZwbHF1Z29id2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzA0NzgsImV4cCI6MjA4NTQ0NjQ3OH0.bzynb0G41o2c1m35AodyVVgZBNXzPvGbKWJWKpBqGH8';
    
    try {
      const messagesRaw = localStorage.getItem('internalMessages');
      if (!messagesRaw) {
        return { success: true, count: 0 };
      }
      
      const messages = JSON.parse(messagesRaw);
      if (!Array.isArray(messages) || messages.length === 0) {
        return { success: true, count: 0 };
      }
      
      // Convert to database format
      const dbMessages = messages.map((m: any) => ({
        id: m.id,
        kind: m.kind || null,
        doc_ids: m.docIds || [],
        subject: m.subject || '',
        title: m.title || null,
        body: m.body || '',
        priority: m.priority || 'عادي',
        source: m.source || 'نظام داخلي',
        from_employee: m.fromEmployee || null,
        from_department: m.fromDepartment || null,
        to_employee: m.toEmployee || null,
        to_department: m.toDepartment || null,
        to_departments: m.toDepartments || [],
        template_name: m.templateName || null,
        attachments: m.attachments || null,
        read: m.read || false,
        created_at: m.createdAt || new Date().toISOString(),
        updated_at: m.updatedAt || new Date().toISOString(),
      }));
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/internal_messages?on_conflict=id`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(dbMessages)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[syncInternalMessagesToCloud] Error:', errorText);
        return { success: false, error: `فشل المزامنة: ${response.status} - ${errorText}` };
      }
      
      localStorage.setItem('internalMessages_last_sync', new Date().toISOString());
      console.log('[syncInternalMessagesToCloud] ✅ Synced', dbMessages.length, 'messages');
      return { success: true, count: dbMessages.length };
    } catch (error: any) {
      console.error('[syncInternalMessagesToCloud] Error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Sync internal messages from Supabase to localStorage
   * تحميل الرسائل الداخلية من السحابة إلى المحلي
   */
  async syncInternalMessagesToLocal(): Promise<{ success: boolean; error?: string; count?: number }> {
    console.log('[syncInternalMessagesToLocal] Starting sync from Supabase...');
    
    const SUPABASE_URL = 'https://whutmrbjvvplqugobwbq.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodXRtcmJqdnZwbHF1Z29id2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzA0NzgsImV4cCI6MjA4NTQ0NjQ3OH0.bzynb0G41o2c1m35AodyVVgZBNXzPvGbKWJWKpBqGH8';
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/internal_messages?select=*&order=created_at.desc`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `فشل جلب الرسائل: ${response.status} - ${errorText}` };
      }
      
      const data = await response.json();
      
      // Convert from database format to localStorage format
      const localMessages = data.map((m: any) => ({
        id: m.id,
        kind: m.kind,
        docIds: m.doc_ids || [],
        subject: m.subject,
        title: m.title,
        body: m.body,
        priority: m.priority,
        source: m.source,
        fromEmployee: m.from_employee,
        fromDepartment: m.from_department,
        toEmployee: m.to_employee,
        toDepartment: m.to_department,
        toDepartments: m.to_departments || [],
        templateName: m.template_name,
        attachments: m.attachments,
        read: m.read,
        replies: [], // Replies fetched separately if needed
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      }));
      
      localStorage.setItem('internalMessages', JSON.stringify(localMessages));
      localStorage.setItem('internalMessages_last_sync', new Date().toISOString());
      
      console.log('[syncInternalMessagesToLocal] ✅ Loaded', localMessages.length, 'messages from cloud');
      return { success: true, count: localMessages.length };
    } catch (error: any) {
      console.error('[syncInternalMessagesToLocal] Error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Sync a single internal message to cloud (for real-time sync on create/update)
   * مزامنة رسالة واحدة إلى السحابة
   */
  async syncSingleInternalMessage(message: any): Promise<{ success: boolean; error?: string }> {
    const SUPABASE_URL = 'https://whutmrbjvvplqugobwbq.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodXRtcmJqdnZwbHF1Z29id2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzA0NzgsImV4cCI6MjA4NTQ0NjQ3OH0.bzynb0G41o2c1m35AodyVVgZBNXzPvGbKWJWKpBqGH8';
    
    try {
      const dbMessage = {
        id: message.id,
        kind: message.kind || null,
        doc_ids: message.docIds || [],
        subject: message.subject || '',
        title: message.title || null,
        body: message.body || '',
        priority: message.priority || 'عادي',
        source: message.source || 'نظام داخلي',
        from_employee: message.fromEmployee || null,
        from_department: message.fromDepartment || null,
        to_employee: message.toEmployee || null,
        to_department: message.toDepartment || null,
        to_departments: message.toDepartments || [],
        template_name: message.templateName || null,
        attachments: message.attachments || null,
        read: message.read || false,
        created_at: message.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/internal_messages?on_conflict=id`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(dbMessage)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }
      
      console.log('[syncSingleInternalMessage] ✅ Synced message:', message.id);
      return { success: true };
    } catch (error: any) {
      console.error('[syncSingleInternalMessage] Error:', error);
      return { success: false, error: error.message };
    }
  },

  // ============= Employee Profiles Sync =============
  
  /**
   * Sync employee profiles from localStorage to Supabase
   * مزامنة الملفات الشخصية للموظفين من المحلي إلى السحابة
   */
  async syncEmployeeProfilesToCloud(): Promise<{ success: boolean; error?: string; count?: number }> {
    console.log('[syncEmployeeProfilesToCloud] Starting sync...');
    
    const SUPABASE_URL = 'https://whutmrbjvvplqugobwbq.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodXRtcmJqdnZwbHF1Z29id2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzA0NzgsImV4cCI6MjA4NTQ0NjQ3OH0.bzynb0G41o2c1m35AodyVVgZBNXzPvGbKWJWKpBqGH8';
    
    try {
      const employeesRaw = localStorage.getItem('employees');
      if (!employeesRaw) {
        return { success: true, count: 0 };
      }
      
      const employees = JSON.parse(employeesRaw);
      if (!Array.isArray(employees) || employees.length === 0) {
        return { success: true, count: 0 };
      }
      
      // Convert to database format
      const dbProfiles = employees.map((e: any) => ({
        id: e.id || `emp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        username: e.username,
        employee_number: e.employeeNumber || null,
        national_id: e.nationalId || null,
        full_name: e.name || e.fullName || null,
        email: e.email || null,
        phone: e.phone || null,
        birth_date: e.birthDate || null,
        hire_date: e.hireDate || null,
        department: e.department || null,
        role: e.role || 'موظف',
        job_title: e.jobTitle || null,
        address: e.address || null,
        avatar_url: e.avatarUrl || null,
        bio: e.bio || null,
        skills: e.skills || [],
        emergency_contact_name: e.emergencyContact?.name || null,
        emergency_contact_phone: e.emergencyContact?.phone || null,
        preferences: e.preferences || null,
        is_active: e.isActive !== false,
        last_login: e.lastLogin || null,
        created_at: e.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/employee_profiles?on_conflict=username`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(dbProfiles)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[syncEmployeeProfilesToCloud] Error:', errorText);
        return { success: false, error: `فشل المزامنة: ${response.status} - ${errorText}` };
      }
      
      localStorage.setItem('employeeProfiles_last_sync', new Date().toISOString());
      console.log('[syncEmployeeProfilesToCloud] ✅ Synced', dbProfiles.length, 'profiles');
      return { success: true, count: dbProfiles.length };
    } catch (error: any) {
      console.error('[syncEmployeeProfilesToCloud] Error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Sync employee profiles from Supabase to localStorage
   * تحميل الملفات الشخصية من السحابة إلى المحلي
   */
  async syncEmployeeProfilesToLocal(): Promise<{ success: boolean; error?: string; count?: number }> {
    console.log('[syncEmployeeProfilesToLocal] Starting sync from Supabase...');
    
    const SUPABASE_URL = 'https://whutmrbjvvplqugobwbq.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodXRtcmJqdnZwbHF1Z29id2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzA0NzgsImV4cCI6MjA4NTQ0NjQ3OH0.bzynb0G41o2c1m35AodyVVgZBNXzPvGbKWJWKpBqGH8';
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/employee_profiles?select=*`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `فشل جلب الملفات الشخصية: ${response.status} - ${errorText}` };
      }
      
      const data = await response.json();
      
      // Get existing employees to preserve passwords
      const existingEmployeesRaw = localStorage.getItem('employees');
      const existingEmployees = existingEmployeesRaw ? JSON.parse(existingEmployeesRaw) : [];
      const passwordMap = new Map(existingEmployees.map((e: any) => [e.username, e.password]));
      
      // Convert from database format to localStorage format
      // Merge with existing employees to preserve passwords
      const mergedEmployees = data.map((p: any) => ({
        id: p.id,
        username: p.username,
        password: passwordMap.get(p.username) || '', // Preserve existing password
        employeeNumber: p.employee_number,
        nationalId: p.national_id,
        name: p.full_name,
        fullName: p.full_name,
        email: p.email,
        phone: p.phone,
        birthDate: p.birth_date,
        hireDate: p.hire_date,
        department: p.department,
        role: p.role,
        jobTitle: p.job_title,
        address: p.address,
        avatarUrl: p.avatar_url,
        bio: p.bio,
        skills: p.skills || [],
        emergencyContact: p.emergency_contact_name ? {
          name: p.emergency_contact_name,
          phone: p.emergency_contact_phone
        } : null,
        preferences: p.preferences,
        isActive: p.is_active,
        lastLogin: p.last_login,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
      
      // Add employees that exist locally but not in cloud
      const cloudUsernames = new Set(data.map((p: any) => p.username));
      const localOnly = existingEmployees.filter((e: any) => !cloudUsernames.has(e.username));
      
      const finalEmployees = [...mergedEmployees, ...localOnly];
      localStorage.setItem('employees', JSON.stringify(finalEmployees));
      localStorage.setItem('employeeProfiles_last_sync', new Date().toISOString());
      
      console.log('[syncEmployeeProfilesToLocal] ✅ Loaded', mergedEmployees.length, 'profiles from cloud');
      return { success: true, count: mergedEmployees.length };
    } catch (error: any) {
      console.error('[syncEmployeeProfilesToLocal] Error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Sync single employee profile to cloud
   * مزامنة ملف شخصي واحد إلى السحابة
   */
  async syncSingleEmployeeProfile(employee: any): Promise<{ success: boolean; error?: string }> {
    const SUPABASE_URL = 'https://whutmrbjvvplqugobwbq.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodXRtcmJqdnZwbHF1Z29id2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzA0NzgsImV4cCI6MjA4NTQ0NjQ3OH0.bzynb0G41o2c1m35AodyVVgZBNXzPvGbKWJWKpBqGH8';
    
    try {
      const dbProfile = {
        id: employee.id || `emp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        username: employee.username,
        employee_number: employee.employeeNumber || null,
        national_id: employee.nationalId || null,
        full_name: employee.name || employee.fullName || null,
        email: employee.email || null,
        phone: employee.phone || null,
        birth_date: employee.birthDate || null,
        hire_date: employee.hireDate || null,
        department: employee.department || null,
        role: employee.role || 'موظف',
        job_title: employee.jobTitle || null,
        address: employee.address || null,
        avatar_url: employee.avatarUrl || null,
        bio: employee.bio || null,
        skills: employee.skills || [],
        emergency_contact_name: employee.emergencyContact?.name || null,
        emergency_contact_phone: employee.emergencyContact?.phone || null,
        preferences: employee.preferences || null,
        is_active: employee.isActive !== false,
        last_login: employee.lastLogin || null,
        updated_at: new Date().toISOString(),
      };
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/employee_profiles?on_conflict=username`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(dbProfile)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }
      
      console.log('[syncSingleEmployeeProfile] ✅ Synced profile:', employee.username);
      return { success: true };
    } catch (error: any) {
      console.error('[syncSingleEmployeeProfile] Error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Full bidirectional sync for all data types
   * المزامنة الكاملة ثنائية الاتجاه
   */
  async fullSync(direction: 'toCloud' | 'toLocal' | 'both' = 'both'): Promise<{
    success: boolean;
    results: Record<string, { success: boolean; count?: number; error?: string }>;
  }> {
    console.log('[fullSync] Starting full sync, direction:', direction);
    const results: Record<string, { success: boolean; count?: number; error?: string }> = {};
    
    try {
      if (direction === 'toCloud' || direction === 'both') {
        // Sync to cloud
        results.internalMessagesToCloud = await this.syncInternalMessagesToCloud();
        results.employeeProfilesToCloud = await this.syncEmployeeProfilesToCloud();
      }
      
      if (direction === 'toLocal' || direction === 'both') {
        // Sync from cloud
        results.internalMessagesToLocal = await this.syncInternalMessagesToLocal();
        results.employeeProfilesToLocal = await this.syncEmployeeProfilesToLocal();
        results.ticketsToLocal = await this.syncToLocal();
        results.appointmentsToLocal = await this.syncAppointmentsToLocal();
      }
      
      updateLastSyncTime();
      
      const allSuccess = Object.values(results).every(r => r.success);
      return { success: allSuccess, results };
    } catch (error: any) {
      console.error('[fullSync] Error:', error);
      return { 
        success: false, 
        results: { error: { success: false, error: error.message } }
      };
    }
  },

  /**
   * Get sync status for all data types
   * الحصول على حالة المزامنة لجميع البيانات
   */
  getAllSyncStatus(): {
    internalMessages: { lastSync: string | null; count: number };
    employeeProfiles: { lastSync: string | null; count: number };
    tickets: { lastSync: string | null; count: number };
    appointments: { lastSync: string | null; count: number };
    isOnline: boolean;
  } {
    const getCount = (key: string): number => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return 0;
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data.length : 0;
      } catch { return 0; }
    };
    
    return {
      internalMessages: {
        lastSync: localStorage.getItem('internalMessages_last_sync'),
        count: getCount('internalMessages')
      },
      employeeProfiles: {
        lastSync: localStorage.getItem('employeeProfiles_last_sync'),
        count: getCount('employees')
      },
      tickets: {
        lastSync: localStorage.getItem('lastSyncTime_tickets'),
        count: getCount('tickets')
      },
      appointments: {
        lastSync: localStorage.getItem('appointments_last_sync'),
        count: getCount('appointments')
      },
      isOnline: navigator.onLine
    };
  },
};
