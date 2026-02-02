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
};
