const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'admin';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  
  console.log('\n=================================');
  console.log('Password Hash Generator');
  console.log('=================================');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('=================================\n');
  
  // Test the hash
  const isValid = await bcrypt.compare(password, hash);
  console.log('Verification test:', isValid ? '✓ Valid' : '✗ Invalid');
  
  // Test with the old hash from SQL
  const oldHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
  const isOldValid = await bcrypt.compare(password, oldHash);
  console.log('Old hash test:', isOldValid ? '✓ Valid' : '✗ Invalid');
  console.log('\n');
}

generateHash();
