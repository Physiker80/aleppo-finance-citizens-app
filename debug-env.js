// debug-env.js
import dotenv from 'dotenv';
dotenv.config();
console.log('DATABASE_URL starts with:', (process.env.DATABASE_URL || '').substring(0, 15));
console.log('Use Backend:', process.env.VITE_USE_BACKEND_TICKETS);
