
import dotenv from 'dotenv';
import path from 'path';

// 1. Check what's in process.env BEFORE dotenv
console.log('1. PRE-DOTENV DATABASE_URL:', process.env.DATABASE_URL);

// 2. Run dotenv and capture output
const result = dotenv.config();

if (result.error) {
  console.log('Dotenv error:', result.error);
} else {
  console.log('2. Dotenv parsed keys:', Object.keys(result.parsed));
  console.log('3. Dotenv parsed DATABASE_URL:', result.parsed.DATABASE_URL);
}

// 3. Check process.env AFTER dotenv
console.log('4. POST-DOTENV DATABASE_URL:', process.env.DATABASE_URL);

console.log('CWD:', process.cwd());
