/**
 * Script to migrate localStorage data to Supabase
 * Run with: node scripts/migrate-to-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const SUPABASE_URL = 'https://whutmrbjvvplqugobwbq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodXRtcmJqdnZwbHF1Z29id2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzA0NzgsImV4cCI6MjA4NTQ0NjQ3OH0.bzynb0G41o2c1m35AodyVVgZBNXzPvGbKWJWKpBqGH8';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sample data to test connection
async function testConnection() {
  console.log('🔄 Testing Supabase connection...');
  console.log('URL:', SUPABASE_URL);
  console.log('Key length:', SUPABASE_ANON_KEY.length);
  
  try {
    const { data, error } = await supabase.from('tickets').select('count').limit(1);
    
    if (error) {
      console.log('⚠️ Query error (table may not exist):', error.message);
      // This is expected if table doesn't exist yet
      if (error.message.includes('does not exist')) {
        console.log('✅ Connection works but table needs to be created');
        return true;
      }
      return false;
    }
    
    console.log('✅ Connection successful!');
    return true;
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    return false;
  }
}

// Read localStorage export file if exists
function readLocalStorageExport() {
  // Try to read from a JSON export file
  const exportPath = path.join(__dirname, '..', 'localStorage-export.json');
  
  if (fs.existsSync(exportPath)) {
    console.log('📁 Found localStorage export file');
    const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    return data;
  }
  
  console.log('⚠️ No localStorage export file found at:', exportPath);
  console.log('');
  console.log('To export your localStorage data:');
  console.log('1. Open browser console (F12) on localhost:3000');
  console.log('2. Run this command:');
  console.log('');
  console.log('   copy(JSON.stringify({tickets: JSON.parse(localStorage.getItem("tickets") || "[]"), employees: JSON.parse(localStorage.getItem("employees") || "[]"), contactMessages: JSON.parse(localStorage.getItem("contactMessages") || "[]")}))');
  console.log('');
  console.log('3. Paste into a file: scripts/../localStorage-export.json');
  console.log('4. Run this script again');
  
  return null;
}

// Migrate tickets
async function migrateTickets(tickets) {
  if (!tickets || tickets.length === 0) {
    console.log('⏭️ No tickets to migrate');
    return 0;
  }
  
  console.log(`📋 Migrating ${tickets.length} tickets...`);
  
  // Map localStorage fields to database schema
  const cleanTickets = tickets.map(t => ({
    id: t.id,
    type: t.requestType || t.type || 'استعلام',
    status: t.status || 'جديد',
    name: t.fullName || t.name,
    phone: t.phone,
    email: t.email,
    national_id: t.nationalId || t.national_id,
    department: t.department,
    description: t.details || t.description || t.message,
    response: t.response,
    notes: t.notes,
    date: t.submissionDate || t.date || t.createdAt || new Date().toISOString(),
    created_at: t.submissionDate || t.createdAt || t.created_at || new Date().toISOString(),
    answered_at: t.answeredAt || t.answered_at,
    closed_at: t.closedAt || t.closed_at,
    started_at: t.startedAt || t.started_at,
    forwarded_to: t.forwardedTo || t.forwarded_to || [],
  }));
  
  console.log('📤 Sending tickets to Supabase...');
  
  // Insert one by one to see detailed errors
  let success = 0;
  let failed = 0;
  
  for (const ticket of cleanTickets) {
    const { error } = await supabase.from('tickets').upsert(ticket, {
      onConflict: 'id',
      ignoreDuplicates: false
    });
    
    if (error) {
      console.error(`   ❌ Failed: ${ticket.id} - ${error.message}`);
      failed++;
    } else {
      console.log(`   ✅ OK: ${ticket.id}`);
      success++;
    }
  }
  
  console.log(`✅ Migrated ${success} tickets (${failed} failed)`);
  return success;
}

// Migrate employees
async function migrateEmployees(employees) {
  if (!employees || employees.length === 0) {
    console.log('⏭️ No employees to migrate');
    return 0;
  }
  
  console.log(`👥 Migrating ${employees.length} employees...`);
  
  // Map to match database schema
  const cleanEmployees = employees.map((e, idx) => ({
    id: e.id || e.username || `emp_${Date.now()}_${idx}`,
    username: e.username,
    password: e.password,
    role: e.role || 'موظف',
    department: e.department,
    full_name: e.name || e.fullName || e.username,
    created_at: e.createdAt || e.created_at || new Date().toISOString(),
  }));
  
  let success = 0;
  let failed = 0;
  
  for (const emp of cleanEmployees) {
    const { error } = await supabase.from('employees').upsert(emp, {
      onConflict: 'username',
      ignoreDuplicates: false
    });
    
    if (error) {
      console.error(`   ❌ Failed: ${emp.username} - ${error.message}`);
      failed++;
    } else {
      console.log(`   ✅ OK: ${emp.username}`);
      success++;
    }
  }
  
  console.log(`✅ Migrated ${success} employees (${failed} failed)`);
  return success;
}

// Main migration function
async function main() {
  console.log('========================================');
  console.log('  Supabase Data Migration Tool');
  console.log('========================================');
  console.log('');
  
  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.log('');
    console.log('❌ Cannot proceed without database connection');
    process.exit(1);
  }
  
  console.log('');
  
  // Read data
  const data = readLocalStorageExport();
  if (!data) {
    process.exit(1);
  }
  
  console.log('');
  console.log('📊 Data summary:');
  console.log(`   - Tickets: ${data.tickets?.length || 0}`);
  console.log(`   - Employees: ${data.employees?.length || 0}`);
  console.log(`   - Contact Messages: ${data.contactMessages?.length || 0}`);
  console.log('');
  
  // Migrate
  let totalMigrated = 0;
  
  totalMigrated += await migrateTickets(data.tickets);
  totalMigrated += await migrateEmployees(data.employees);
  
  console.log('');
  console.log('========================================');
  console.log(`  ✅ Migration complete: ${totalMigrated} records`);
  console.log('========================================');
}

main().catch(console.error);
