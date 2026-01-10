#!/usr/bin/env node

// Script to check what signers exist in the database
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

console.log('Checking neynar_signers table...\n');

sql`SELECT * FROM neynar_signers ORDER BY created_at DESC LIMIT 10`
  .then(rows => {
    if (rows.length === 0) {
      console.log('No signers found in database');
    } else {
      console.log(`Found ${rows.length} signer(s):\n`);
      rows.forEach((row, i) => {
        console.log(`${i + 1}. FID: ${row.fid}`);
        console.log(`   Signer UUID: ${row.signer_uuid}`);
        console.log(`   Status: ${row.status}`);
        console.log(`   Created: ${row.created_at}`);
        console.log(`   Updated: ${row.updated_at}`);
        console.log('');
      });
    }
  })
  .catch(err => {
    console.error('Error querying database:', err.message);
    if (err.message.includes('does not exist')) {
      console.error('\nTable does not exist! Run: bun drizzle-kit push');
    }
  });
