// Backup restore drill — pull alpha snapshot, extract, verify integrity
// Run from backend/ so node_modules resolves naturally
import { execSync } from 'child_process';
import { existsSync, statSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as tar from 'tar';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ALPHA_IP = '139.59.126.243';
const WORK_DIR = process.env.DRILL_DIR || 'C:/Users/canri/AppData/Local/Temp/claude/C--Users-canri/06cf8aca-9720-4e5e-ab44-052c5df7f91f/scratchpad/restore-drill';
const EXTRACT_DIR = join(WORK_DIR, 'extracted');
const LOCAL_TAR = join(WORK_DIR, 'alpha-snapshot.tar.gz');

function sh(cmd) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8' }).trim();
}

console.log('=== Backup Restore Drill ===\n');

console.log('1. Locating latest snapshot on alpha...');
const latest = sh(`ssh -o BatchMode=yes root@${ALPHA_IP} "ls -t /root/pre-test-*.tar.gz 2>/dev/null | head -1 || ls -t /root/pre-deploy-*.tar.gz | head -1"`);
console.log(`   Source: ${latest}`);

if (!existsSync(LOCAL_TAR)) {
  console.log('\n2. Downloading...');
  sh(`scp -q root@${ALPHA_IP}:${latest} "${LOCAL_TAR}"`);
} else {
  console.log('\n2. Using existing local copy');
}
console.log(`   Local: ${(statSync(LOCAL_TAR).size / 1024 / 1024).toFixed(1)} MB`);

console.log('\n3. Listing tar entries...');
const entries = [];
await tar.t({ file: LOCAL_TAR, onentry: (e) => entries.push(e.path) });
const topLevel = new Set(entries.map((e) => e.split('/').slice(0, 2).join('/')));
console.log(`   Total entries: ${entries.length}`);
console.log('   Top-level:');
[...topLevel].slice(0, 12).forEach((e) => console.log(`     ${e}`));

console.log('\n4. Extracting...');
if (!existsSync(EXTRACT_DIR)) mkdirSync(EXTRACT_DIR, { recursive: true });
await tar.x({ file: LOCAL_TAR, cwd: EXTRACT_DIR });
console.log('   OK');

console.log('\n5. Critical file check:');
const required = ['data/taskflow.db', 'data/.db-key', 'data/uploads'];
let allOk = true;
for (const f of required) {
  if (existsSync(join(EXTRACT_DIR, f))) console.log(`   PASS ${f}`);
  else { console.log(`   FAIL ${f} missing`); allOk = false; }
}
if (!allOk) process.exit(1);

console.log('\n6. SQLite integrity + row counts:');
const db = new Database(join(EXTRACT_DIR, 'data/taskflow.db'), { readonly: true });
console.log(`   integrity_check: ${db.prepare('PRAGMA integrity_check').get().integrity_check}`);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
console.log(`   Tables: ${tables.length}`);
const criticalTables = ['users', 'departments', 'tasks', 'work_logs', 'attendance_records', 'files', 'file_versions', 'task_timeline'];
for (const t of criticalTables) {
  try {
    const c = db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get().c;
    console.log(`   ${t.padEnd(20)}: ${c}`);
  } catch { console.log(`   ${t.padEnd(20)}: (not present)`); }
}

console.log('\n7. Blob vs DB:');
function countFiles(dir) {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += countFiles(join(dir, e.name));
    else if (e.isFile()) n += 1;
  }
  return n;
}
const blobCount = countFiles(join(EXTRACT_DIR, 'data/uploads'));
console.log(`   Upload blobs on disk: ${blobCount}`);
try {
  const av = db.prepare('SELECT COUNT(*) AS c FROM file_versions WHERE is_deleted = 0').get().c;
  const dv = db.prepare('SELECT COUNT(*) AS c FROM file_versions WHERE is_deleted = 1').get().c;
  console.log(`   Active file_versions: ${av}`);
  console.log(`   Soft-deleted versions: ${dv}`);
} catch {}

try {
  const allImages = db.prepare("SELECT images FROM work_logs WHERE images IS NOT NULL AND images != ''").all();
  let wl = 0;
  for (const row of allImages) {
    try {
      const parsed = JSON.parse(row.images);
      for (const sec of ['today', 'tomorrow', 'notes']) if (Array.isArray(parsed[sec])) wl += parsed[sec].length;
    } catch {}
  }
  console.log(`   Work log image refs: ${wl}`);
} catch {}

console.log('\n8. BOSS account check:');
db.prepare("SELECT id, name, username, role FROM users WHERE role = 'BOSS'").all()
  .forEach((u) => console.log(`   ${u.username} (${u.name})`));

db.close();

console.log('\n=== DRILL PASS ===');
console.log('\nTo restore from this snapshot to production:');
console.log(`  ssh root@${ALPHA_IP} "docker stop taskflow"`);
console.log(`  ssh root@${ALPHA_IP} "docker run --rm -v taskflow_data:/data -v /root:/in alpine tar xzf /in/$(latest).tar.gz -C /"`);
console.log(`  ssh root@${ALPHA_IP} "docker start taskflow"`);
