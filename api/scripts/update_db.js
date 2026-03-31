const { execSync } = require('child_process');

const targetColumns = [
  { name: 'total_xp', type: 'INTEGER DEFAULT 0' },
  { name: 'level', type: 'INTEGER DEFAULT 1' },
  { name: 'last_login_reward_date', type: 'TEXT' },
  { name: 'arena_points', type: 'INTEGER DEFAULT 0' }
];

function checkAndAdd(remote = false) {
  const envFlag = remote ? '--remote' : '--local';
  console.log(`Checking ${remote ? 'REMOTE' : 'LOCAL'} database...`);
  
  const output = execSync(`npx wrangler d1 execute zenith-db ${envFlag} --command="PRAGMA table_info(users);" --json`, { encoding: 'utf-8' });
  const data = JSON.parse(output);
  const existingColumns = data[0].results.map(r => r.name);
  
  for (const col of targetColumns) {
    if (!existingColumns.includes(col.name)) {
      console.log(`Adding ${col.name} to ${envFlag}...`);
      execSync(`npx wrangler d1 execute zenith-db ${envFlag} --command="ALTER TABLE users ADD COLUMN ${col.name} ${col.type};" --y`);
    } else {
      console.log(`${col.name} already exists in ${envFlag}.`);
    }
  }
}

try {
  checkAndAdd(false); // Local
  checkAndAdd(true);  // Remote
  console.log("Database update complete!");
} catch (e) {
  console.error("Update failed:", e.message);
}
