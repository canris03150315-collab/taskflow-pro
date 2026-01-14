const db = require('better-sqlite3')('/app/data/taskflow.db');
const { v4: uuidv4 } = require('uuid');

console.log('=== Initialize KOL Test Data ===');

try {
  const now = new Date().toISOString();
  
  // Get departments
  const departments = db.prepare('SELECT id, name FROM departments').all();
  console.log('Departments:', departments.map(d => d.name).join(', '));
  
  if (departments.length < 2) {
    console.log('Need at least 2 departments for testing');
    process.exit(1);
  }
  
  const dept1 = departments[0];
  const dept2 = departments[1];
  
  // Clear existing KOL data
  console.log('\nClearing existing KOL data...');
  db.prepare('DELETE FROM kol_payments').run();
  db.prepare('DELETE FROM kol_contracts').run();
  db.prepare('DELETE FROM kol_profiles').run();
  console.log('Cleared!');
  
  // Insert test profiles
  console.log('\nInserting test profiles...');
  
  const profiles = [
    // Department 1 KOLs
    { platform: 'FACEBOOK', platformId: 'alice.chen', platformAccount: '@alice_lifestyle', contactInfo: 'alice@email.com', status: 'ACTIVE', notes: 'Fashion blogger', deptId: dept1.id },
    { platform: 'INSTAGRAM', platformId: 'bob.travel', platformAccount: '@bob_adventures', contactInfo: '0912345678', status: 'ACTIVE', notes: 'Travel influencer', deptId: dept1.id },
    { platform: 'YOUTUBE', platformId: 'charlie.tech', platformAccount: '@charlie_reviews', contactInfo: 'charlie@gmail.com', status: 'NEGOTIATING', notes: 'Tech reviewer', deptId: dept1.id },
    // Department 2 KOLs
    { platform: 'TIKTOK', platformId: 'diana.dance', platformAccount: '@diana_moves', contactInfo: '0923456789', status: 'ACTIVE', notes: 'Dance content', deptId: dept2.id },
    { platform: 'THREADS', platformId: 'edward.food', platformAccount: '@edward_eats', contactInfo: 'edward@food.com', status: 'STOPPED', notes: 'Food blogger', deptId: dept2.id },
    { platform: 'FACEBOOK', platformId: 'fiona.beauty', platformAccount: '@fiona_glow', contactInfo: '0934567890', status: 'ACTIVE', notes: 'Beauty tips', deptId: dept2.id },
  ];
  
  const insertProfile = db.prepare(`
    INSERT INTO kol_profiles (id, platform, platform_id, facebook_id, platform_account, contact_info, status, notes, created_at, updated_at, created_by, department_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const profileIds = [];
  profiles.forEach(p => {
    const id = uuidv4();
    profileIds.push({ id, deptId: p.deptId });
    insertProfile.run(id, p.platform, p.platformId, p.platformId, p.platformAccount, p.contactInfo, p.status, p.notes, now, now, 'system', p.deptId);
  });
  console.log(`Inserted ${profiles.length} profiles`);
  
  // Insert test contracts
  console.log('\nInserting test contracts...');
  
  const insertContract = db.prepare(`
    INSERT INTO kol_contracts (id, kol_id, start_date, end_date, salary_amount, deposit_amount, unpaid_amount, cleared_amount, total_paid, contract_type, notes, created_at, updated_at, created_by, department_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const contractIds = [];
  profileIds.forEach((profile, i) => {
    const contractId = uuidv4();
    contractIds.push({ id: contractId, deptId: profile.deptId });
    const salary = (i + 1) * 10000;
    const unpaid = salary - (i * 2000);
    const paid = i * 2000;
    insertContract.run(
      contractId,
      profile.id,
      '2026-01-01',
      '2026-12-31',
      salary,
      1000,
      unpaid,
      0,
      paid,
      'MONTHLY',
      'Test contract',
      now,
      now,
      'system',
      profile.deptId
    );
  });
  console.log(`Inserted ${profileIds.length} contracts`);
  
  // Insert test payments
  console.log('\nInserting test payments...');
  
  const insertPayment = db.prepare(`
    INSERT INTO kol_payments (id, contract_id, payment_date, amount, payment_type, notes, created_at, created_by, department_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  contractIds.forEach((contract, i) => {
    if (i > 0) {
      insertPayment.run(
        uuidv4(),
        contract.id,
        '2026-01-10',
        i * 2000,
        'SALARY',
        'Monthly payment',
        now,
        'system',
        contract.deptId
      );
    }
  });
  console.log(`Inserted ${contractIds.length - 1} payments`);
  
  // Verify
  console.log('\n=== Verification ===');
  const totalProfiles = db.prepare('SELECT COUNT(*) as count FROM kol_profiles').get().count;
  const totalContracts = db.prepare('SELECT COUNT(*) as count FROM kol_contracts').get().count;
  const totalPayments = db.prepare('SELECT COUNT(*) as count FROM kol_payments').get().count;
  
  console.log(`Total profiles: ${totalProfiles}`);
  console.log(`Total contracts: ${totalContracts}`);
  console.log(`Total payments: ${totalPayments}`);
  
  // Show by department
  console.log('\nBy Department:');
  departments.forEach(dept => {
    const count = db.prepare('SELECT COUNT(*) as count FROM kol_profiles WHERE department_id = ?').get(dept.id).count;
    console.log(`  ${dept.name}: ${count} KOLs`);
  });
  
  db.close();
  console.log('\n=== Done ===');
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
