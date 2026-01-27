const fs = require('fs');

console.log('=== Fix Reports Field Mapping ===\n');

const reportsPath = '/app/dist/routes/reports.js';
let content = fs.readFileSync(reportsPath, 'utf8');

console.log('Adding field mapping for reports...');

// Find the GET / route and add field mapping
const getRoutePattern = /(for \(const r of reports\) \{[\s\S]*?try \{ r\.content = JSON\.parse\(r\.content \|\| '\{\}'\); \} catch\(e\) \{ r\.content = \{\}; \}[\s\S]*?\})/;

const replacement = `for (const r of reports) {
      try { r.content = JSON.parse(r.content || '{}'); } catch(e) { r.content = {}; }
      // Map snake_case to camelCase for frontend
      r.userId = r.user_id;
      r.createdAt = r.created_at;
    }`;

if (getRoutePattern.test(content)) {
  content = content.replace(getRoutePattern, replacement);
  console.log('  [OK] GET route updated');
} else {
  console.log('  [SKIP] GET route pattern not found');
}

// Also fix POST route response
const postRoutePattern = /(const report = await dbCall\(db, 'get', 'SELECT \* FROM reports WHERE id = \?', \[id\]\);[\s\S]*?if \(report\) \{[\s\S]*?try \{ report\.content = JSON\.parse\(report\.content \|\| '\{\}'\); \} catch\(e\) \{ report\.content = \{\}; \}[\s\S]*?\})/;

const postReplacement = `const report = await dbCall(db, 'get', 'SELECT * FROM reports WHERE id = ?', [id]);
    if (report) {
      try { report.content = JSON.parse(report.content || '{}'); } catch(e) { report.content = {}; }
      // Map snake_case to camelCase for frontend
      report.userId = report.user_id;
      report.createdAt = report.created_at;
    }`;

if (postRoutePattern.test(content)) {
  content = content.replace(postRoutePattern, postReplacement);
  console.log('  [OK] POST route updated');
} else {
  console.log('  [SKIP] POST route pattern not found');
}

// Fix PUT route response
const putRoutePattern = /(const updated = await dbCall\(db, 'get', 'SELECT \* FROM reports WHERE id = \?', \[id\]\);[\s\S]*?if \(updated\) \{[\s\S]*?try \{ updated\.content = JSON\.parse\(updated\.content \|\| '\{\}'\); \} catch\(e\) \{ updated\.content = \{\}; \}[\s\S]*?\})/;

const putReplacement = `const updated = await dbCall(db, 'get', 'SELECT * FROM reports WHERE id = ?', [id]);
    if (updated) {
      try { updated.content = JSON.parse(updated.content || '{}'); } catch(e) { updated.content = {}; }
      // Map snake_case to camelCase for frontend
      updated.userId = updated.user_id;
      updated.createdAt = updated.created_at;
    }`;

if (putRoutePattern.test(content)) {
  content = content.replace(putRoutePattern, putReplacement);
  console.log('  [OK] PUT route updated');
} else {
  console.log('  [SKIP] PUT route pattern not found');
}

fs.writeFileSync(reportsPath, content, 'utf8');

console.log('\n=== Fix Complete ===');
