// DB consistency audit — read-only checks against extracted snapshot
import { existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';

const DB_PATH = 'C:/Users/canri/AppData/Local/Temp/claude/C--Users-canri/06cf8aca-9720-4e5e-ab44-052c5df7f91f/scratchpad/restore-drill/extracted/data/taskflow.db';
const UPLOADS = 'C:/Users/canri/AppData/Local/Temp/claude/C--Users-canri/06cf8aca-9720-4e5e-ab44-052c5df7f91f/scratchpad/restore-drill/extracted/data/uploads';

if (!existsSync(DB_PATH)) {
  console.error('Run restore-drill.mjs first to extract the snapshot.');
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });
const findings = [];

function flag(severity, area, msg, detail) {
  findings.push({ severity, area, msg, detail });
  console.log(`${severity} [${area}] ${msg}${detail ? '\n   ' + detail : ''}`);
}
function pass(area, msg) {
  console.log(`PASS [${area}] ${msg}`);
}

console.log('=== DB Consistency Audit ===\n');

// 1. Orphan blobs — file_versions row pointing to missing disk file
console.log('--- 1. File version blob path integrity ---');
try {
  const versions = db.prepare("SELECT id, blob_path, file_id, is_deleted FROM file_versions").all();
  let orphans = 0;
  for (const v of versions) {
    if (!v.blob_path) {
      flag('🔴', 'files', `version ${v.id} has null blob_path`, `is_deleted=${v.is_deleted}`);
      continue;
    }
    const fullPath = join(UPLOADS, '..', v.blob_path);
    if (!existsSync(fullPath)) {
      flag('🟡', 'files', `blob missing on disk for version ${v.id}`, `blob_path=${v.blob_path}, is_deleted=${v.is_deleted}`);
      orphans++;
    }
  }
  if (orphans === 0) pass('files', `${versions.length} file_versions, all blob_paths exist on disk`);
} catch (e) { console.log(`  (file_versions table issue: ${e.message})`); }

// 2. Orphan disk files — disk blobs with no DB reference
console.log('\n--- 2. Disk blob orphan check ---');
function listBlobs(dir, prefix = '') {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listBlobs(full, prefix + entry.name + '/'));
    else if (entry.isFile()) out.push(prefix + entry.name);
  }
  return out;
}
const allBlobs = listBlobs(UPLOADS);
const referencedBlobs = new Set();
try {
  for (const v of db.prepare("SELECT blob_path FROM file_versions WHERE blob_path IS NOT NULL").all()) {
    referencedBlobs.add(v.blob_path.replace(/^uploads\//, ''));
  }
} catch {}
// Also check work_logs.images for blob refs
try {
  const rows = db.prepare("SELECT images FROM work_logs WHERE images IS NOT NULL AND images != ''").all();
  for (const r of rows) {
    try {
      const parsed = JSON.parse(r.images);
      for (const sec of ['today', 'tomorrow', 'notes']) {
        if (Array.isArray(parsed[sec])) {
          for (const img of parsed[sec]) if (img.blob_path) referencedBlobs.add(img.blob_path.replace(/^uploads\//, ''));
        }
      }
    } catch {}
  }
} catch {}
// Check task_timeline.images
try {
  const rows = db.prepare("SELECT images FROM task_timeline WHERE images IS NOT NULL AND images != ''").all();
  for (const r of rows) {
    try {
      const parsed = JSON.parse(r.images);
      if (Array.isArray(parsed)) for (const img of parsed) if (img.blob_path) referencedBlobs.add(img.blob_path.replace(/^uploads\//, ''));
    } catch {}
  }
} catch {}

let unreferenced = 0;
for (const b of allBlobs) {
  if (!referencedBlobs.has(b)) {
    unreferenced++;
    if (unreferenced <= 3) flag('🟢', 'files', `disk blob with no DB ref: ${b}`);
  }
}
if (unreferenced === 0) pass('files', `All ${allBlobs.length} disk blobs are referenced`);
else flag('🟡', 'files', `${unreferenced} disk blobs unreferenced (orphan)`, `Disk waste — backup includes them`);

// 3. Task FK consistency
console.log('\n--- 3. Task references ---');
try {
  const users = new Set(db.prepare('SELECT id FROM users').all().map(u => u.id));
  const depts = new Set(db.prepare('SELECT id FROM departments').all().map(d => d.id));
  const tasks = db.prepare('SELECT id, created_by, assigned_to_user_id, accepted_by_user_id, assigned_to_department, target_department FROM tasks').all();
  let issues = 0;
  for (const t of tasks) {
    if (t.created_by && !users.has(t.created_by)) {
      flag('🟡', 'tasks', `task ${t.id} created_by points to nonexistent user ${t.created_by}`);
      issues++;
    }
    if (t.assigned_to_user_id && !users.has(t.assigned_to_user_id)) {
      flag('🟡', 'tasks', `task ${t.id} assigned_to_user_id missing user ${t.assigned_to_user_id}`);
      issues++;
    }
    if (t.accepted_by_user_id && !users.has(t.accepted_by_user_id)) {
      flag('🟡', 'tasks', `task ${t.id} accepted_by_user_id missing user ${t.accepted_by_user_id}`);
      issues++;
    }
    if (t.assigned_to_department && !depts.has(t.assigned_to_department)) {
      flag('🟢', 'tasks', `task ${t.id} assigned_to_department ${t.assigned_to_department} doesn't match a dept id`);
      issues++;
    }
  }
  if (issues === 0) pass('tasks', `${tasks.length} tasks, all FKs valid`);
} catch (e) { console.log(`  (tasks issue: ${e.message})`); }

// 4. Work log user_id consistency
console.log('\n--- 4. Work log user references ---');
try {
  const users = new Set(db.prepare('SELECT id FROM users').all().map(u => u.id));
  const orphanLogs = db.prepare('SELECT id, user_id FROM work_logs').all().filter(l => !users.has(l.user_id));
  if (orphanLogs.length === 0) pass('work_logs', `${db.prepare('SELECT COUNT(*) AS c FROM work_logs').get().c} logs, all user_ids exist`);
  else flag('🟡', 'work_logs', `${orphanLogs.length} work_logs reference nonexistent users`, `e.g. ${orphanLogs[0].user_id}`);
} catch (e) { console.log(`  (work_logs issue: ${e.message})`); }

// 5. Attendance user_id consistency
console.log('\n--- 5. Attendance records ---');
try {
  const users = new Set(db.prepare('SELECT id FROM users').all().map(u => u.id));
  const records = db.prepare('SELECT id, user_id, clock_in, clock_out, duration_minutes FROM attendance_records').all();
  const orphan = records.filter(r => !users.has(r.user_id));
  if (orphan.length === 0) pass('attendance', `${records.length} records, all user_ids exist`);
  else flag('🟡', 'attendance', `${orphan.length} attendance records reference nonexistent users`);

  // Logic checks
  const negDur = records.filter(r => r.duration_minutes !== null && r.duration_minutes < 0);
  if (negDur.length > 0) flag('🟡', 'attendance', `${negDur.length} records have negative duration_minutes`, `e.g. ${negDur[0].id}: ${negDur[0].duration_minutes}m`);

  const noClockOut = records.filter(r => !r.clock_out && r.duration_minutes > 0);
  if (noClockOut.length > 0) flag('🟢', 'attendance', `${noClockOut.length} records have duration but no clock_out`);
} catch (e) { console.log(`  (attendance issue: ${e.message})`); }

// 6. Task timeline orphans
console.log('\n--- 6. Task timeline orphans ---');
try {
  const tasks = new Set(db.prepare('SELECT id FROM tasks').all().map(t => t.id));
  const orphan = db.prepare('SELECT id, task_id FROM task_timeline').all().filter(e => !tasks.has(e.task_id));
  if (orphan.length === 0) pass('timeline', `${db.prepare('SELECT COUNT(*) AS c FROM task_timeline').get().c} entries, all task_ids exist`);
  else flag('🟡', 'timeline', `${orphan.length} timeline entries reference deleted tasks`, `cleanup needed`);
} catch (e) { console.log(`  (task_timeline issue: ${e.message})`); }

// 7. File ownership consistency
console.log('\n--- 7. File ownership ---');
try {
  const users = new Set(db.prepare('SELECT id FROM users').all().map(u => u.id));
  const files = db.prepare('SELECT id, owner_id, is_deleted FROM files').all();
  const orphan = files.filter(f => f.owner_id && !users.has(f.owner_id));
  if (orphan.length === 0) pass('files', `${files.length} files, all owner_ids exist`);
  else flag('🟡', 'files', `${orphan.length} files reference nonexistent owner`);
} catch (e) { console.log(`  (files issue: ${e.message})`); }

// 8. Soft-delete consistency
console.log('\n--- 8. Soft-delete consistency ---');
try {
  // If a file is is_deleted=0, at least one version should be is_deleted=0
  const inconsistent = db.prepare(`
    SELECT f.id, f.filename FROM files f
    WHERE f.is_deleted = 0
      AND NOT EXISTS (SELECT 1 FROM file_versions v WHERE v.file_id = f.id AND v.is_deleted = 0)
  `).all();
  if (inconsistent.length === 0) pass('soft-delete', `All active files have at least one active version`);
  else flag('🟡', 'soft-delete', `${inconsistent.length} files are is_deleted=0 but have no active versions`, `e.g. ${inconsistent[0].filename}`);
} catch (e) { console.log(`  (soft-delete issue: ${e.message})`); }

// 9. Duplicate clock-in same day
console.log('\n--- 9. Duplicate attendance same day ---');
try {
  const dupes = db.prepare(`
    SELECT user_id, date, COUNT(*) AS n
    FROM attendance_records
    GROUP BY user_id, date
    HAVING n > 1
  `).all();
  if (dupes.length === 0) pass('attendance', 'No user has duplicate records on same date');
  else flag('🟢', 'attendance', `${dupes.length} (user, date) pairs have multiple records`, `intentional re-clock-in?`);
} catch (e) { console.log(`  (issue: ${e.message})`); }

db.close();

console.log('\n=== Summary ===');
const counts = { '🔴': 0, '🟡': 0, '🟢': 0 };
for (const f of findings) counts[f.severity]++;
console.log(`Findings: ${counts['🔴']} 🔴 critical, ${counts['🟡']} 🟡 high, ${counts['🟢']} 🟢 low`);
