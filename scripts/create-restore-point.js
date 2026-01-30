// Create a timestamped restore point of the workspace under RESTORE_POINTS/<timestamp>
// Excludes heavyweight/transient folders (node_modules, dist, build, .git, existing RESTORE_POINTS, android build output)
// ESM script (package.json has type: module)

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const toPosix = (p) => p.replace(/\\/g, '/');

const EXCLUDES = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'RESTORE_POINTS',
  '.vite',
  '.cache',
  'android/build',
  'android/app/build',
  'android/capacitor-cordova-android-plugins/build',
];

function isExcluded(rel) {
  const r = toPosix(rel);
  for (const e of EXCLUDES) {
    if (r === e || r.startsWith(e + '/')) return true;
  }
  // Generic Android build folder exclusion
  if (r.startsWith('android/') && (r.endsWith('/build') || r.includes('/build/'))) return true;
  return false;
}

function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function copyFileSafe(src, dest, errors) {
  try {
    await ensureDir(path.dirname(dest));
    await fs.copyFile(src, dest);
  } catch (e) {
    errors.push({ type: 'copy', src, dest, message: e?.message || String(e) });
  }
}

async function walkAndCopy(srcRoot, destRoot) {
  let fileCount = 0;
  let dirCount = 0;
  let bytes = 0;
  const errors = [];

  async function walk(current) {
    const rel = path.relative(srcRoot, current);
    if (rel && isExcluded(rel)) return;

    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (e) {
      errors.push({ type: 'readdir', path: current, message: e?.message || String(e) });
      return;
    }
    dirCount += 1;
    for (const ent of entries) {
      const abs = path.join(current, ent.name);
      const relChild = path.relative(srcRoot, abs);
      if (isExcluded(relChild)) continue;
      const dest = path.join(destRoot, relChild);
      if (ent.isDirectory()) {
        await walk(abs);
      } else if (ent.isFile()) {
        try {
          const st = await fs.stat(abs);
          bytes += st.size || 0;
        } catch (e) {
          errors.push({ type: 'stat', path: abs, message: e?.message || String(e) });
        }
        await copyFileSafe(abs, dest, errors);
        fileCount += 1;
      }
    }
  }

  await walk(srcRoot);
  return { fileCount, dirCount, bytes, errors };
}

async function main() {
  const stamp = ts();
  const dest = path.join(ROOT, 'RESTORE_POINTS', stamp);
  await ensureDir(dest);

  // Read project metadata
  let projectName = 'project';
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf-8'));
    if (pkg && pkg.name) projectName = pkg.name;
  } catch {}

  console.log(`[restore] Creating restore point at ${dest}`);
  const stats = await walkAndCopy(ROOT, dest);

  const manifest = {
    createdAt: new Date().toISOString(),
    project: projectName,
    root: ROOT,
    destination: dest,
    excludes: EXCLUDES,
    files: stats.fileCount,
    directories: stats.dirCount,
    sizeBytes: stats.bytes,
    errors: stats.errors?.length || 0,
  };
  await fs.writeFile(path.join(dest, 'MANIFEST.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  const readme = `Restore Point\n============\n\nCreated: ${manifest.createdAt}\nProject: ${projectName}\n\nHow to restore (manual):\n- Make a backup of current workspace.\n- Copy the contents of this folder back to the project root, excluding MANIFEST.json.\n\nNotes:\n- Excluded directories: ${EXCLUDES.join(', ')}\n- Total files: ${stats.fileCount}, directories: ${stats.dirCount}, size: ${stats.bytes} bytes.\n`;
  await fs.writeFile(path.join(dest, 'RESTORE_README.txt'), readme, 'utf-8');
  if (stats.errors && stats.errors.length) {
    const log = stats.errors.map(e => `[${e.type}] ${e.path || e.src} -> ${e.dest || ''} :: ${e.message}`).join('\n');
    await fs.writeFile(path.join(dest, 'ERRORS.log'), log, 'utf-8');
  }

  console.log(`[restore] Done. Files: ${stats.fileCount}, Dirs: ${stats.dirCount}, Size: ${stats.bytes} bytes.`);
}

main().catch((e) => {
  console.error('[restore] Failed:', e?.message || e);
  process.exit(1);
});
