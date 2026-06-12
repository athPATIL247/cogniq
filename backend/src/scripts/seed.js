// filename: backend/src/scripts/seed.js
// Seeds the database with demo users and synthetic data.
// Usage: node src/scripts/seed.js
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

const HASH = await bcrypt.hash('password123', 10);

async function seed() {
  const client = await pool.connect();
  try {
    console.log('[seed] Clearing existing demo data...');
    // Clear in dependency order
    await client.query(`DELETE FROM alerts`);
    await client.query(`DELETE FROM risk_events`);
    await client.query(`DELETE FROM transactions`);
    await client.query(`DELETE FROM devices`);
    await client.query(`DELETE FROM users`);

    console.log('[seed] Inserting demo users...');
    // ── Customer User ──────────────────────────────────────────
    const aliceRes = await client.query(
      `INSERT INTO users (name, email, phone, password_hash, is_employee, risk_tier)
       VALUES ($1, $2, $3, $4, false, 'standard')
       RETURNING id`,
      ['Alice Sharma', 'alice@demo.com', '+91 9800000001', HASH]
    );
    const aliceId = aliceRes.rows[0].id;

    const bobRes = await client.query(
      `INSERT INTO users (name, email, phone, password_hash, is_employee, risk_tier)
       VALUES ($1, $2, $3, $4, false, 'standard')
       RETURNING id`,
      ['Bob Mehta', 'bob@demo.com', '+91 9800000002', HASH]
    );
    const bobId = bobRes.rows[0].id;

    // ── Analyst User ───────────────────────────────────────────
    const raviRes = await client.query(
      `INSERT INTO users (name, email, phone, password_hash, is_employee, employee_role, risk_tier)
       VALUES ($1, $2, $3, $4, true, 'fraud_analyst', 'employee')
       RETURNING id`,
      ['Ravi Analyst', 'ravi.analyst@bank.com', '+91 9800000099', HASH]
    );
    const raviId = raviRes.rows[0].id;

    console.log('[seed] Inserting demo devices...');
    await client.query(
      `INSERT INTO devices (user_id, device_fingerprint, device_name, os, browser, trust_score, is_trusted)
       VALUES ($1, 'fp_alice_macbook', 'MacBook Pro', 'macOS 14', 'Chrome 124', 0.95, true)`,
      [aliceId]
    );
    await client.query(
      `INSERT INTO devices (user_id, device_fingerprint, device_name, os, browser, trust_score, is_trusted)
       VALUES ($1, 'fp_alice_iphone', 'iPhone 15', 'iOS 17', 'Safari 17', 0.85, true)`,
      [aliceId]
    );
    await client.query(
      `INSERT INTO devices (user_id, device_fingerprint, device_name, os, browser, trust_score, is_trusted)
       VALUES ($1, 'fp_bob_laptop', 'Dell XPS', 'Windows 11', 'Firefox 123', 0.7, true)`,
      [bobId]
    );

    console.log('[seed] Inserting demo transactions...');
    const txData = [
      [aliceId, 2500.00,  'Swiggy',           'food',     'mobile', 'completed', 12.0, false],
      [aliceId, 15000.00, 'Amazon',            'shopping', 'online', 'completed', 22.5, false],
      [aliceId, 5000.00,  'Netflix',           'utilities','online', 'completed', 8.0,  false],
      [aliceId, 85000.00, 'Unknown Vendor',    'crypto',   'online', 'blocked',   91.0, true ],
      [aliceId, 1200.00,  'Zomato',            'food',     'mobile', 'completed', 9.5,  false],
      [aliceId, 50000.00, 'Wire Transfer',     'general',  'online', 'pending_verification', 72.0, true],
      [bobId,   3000.00,  'BigBasket',         'shopping', 'online', 'completed', 18.0, false],
      [bobId,   120000.00,'Crypto Exchange',   'crypto',   'online', 'blocked',   94.0, true ],
      [bobId,   800.00,   'BookMyShow',        'general',  'mobile', 'completed', 11.0, false],
    ];
    for (const [uid, amt, mer, cat, chan, stat, risk, flag] of txData) {
      await client.query(
        `INSERT INTO transactions (user_id, amount, merchant, category, channel, status, risk_score, flagged, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - (random() * INTERVAL '7 days'))`,
        [uid, amt, mer, cat, chan, stat, risk, flag]
      );
    }

    console.log('[seed] Inserting demo risk events...');
    const riskData = [
      [aliceId, 'login_attempt',         12.0, ['trusted_device','normal_hour'],          'allow'],
      [aliceId, 'transaction_high_value', 91.0, ['amount_anomaly','crypto_category','new_merchant'], 'block'],
      [aliceId, 'login_attempt',         55.0, ['new_location','unusual_hour'],            'mfa_push'],
      [bobId,   'login_attempt',         20.0, ['trusted_device'],                         'allow'],
      [bobId,   'transaction_high_value', 94.0, ['amount_anomaly','crypto_category','velocity_spike'], 'block'],
      [raviId,  'login_attempt',         18.0, ['employee_account','trusted_device'],      'allow'],
    ];
    for (const [uid, evt, score, factors, action] of riskData) {
      await client.query(
        `INSERT INTO risk_events (user_id, event_type, risk_score, risk_factors, action_taken, ip_address, timestamp)
         VALUES ($1, $2, $3, $4, $5, '49.32.10.1', NOW() - (random() * INTERVAL '3 days'))`,
        [uid, evt, score, JSON.stringify(factors), action]
      );
    }

    console.log('[seed] Inserting demo alerts...');
    await client.query(
      `INSERT INTO alerts (user_id, severity, status, description, risk_factors)
       VALUES ($1, 'critical', 'active', 'High-value crypto transaction blocked — amount anomaly detected', $2)`,
      [aliceId, JSON.stringify(['amount_anomaly','crypto_category','new_merchant'])]
    );
    await client.query(
      `INSERT INTO alerts (user_id, severity, status, description, risk_factors)
       VALUES ($1, 'critical', 'active', 'Repeated blocked transactions — velocity spike detected', $2)`,
      [bobId, JSON.stringify(['amount_anomaly','crypto_category','velocity_spike'])]
    );
    await client.query(
      `INSERT INTO alerts (user_id, severity, status, description, risk_factors)
       VALUES ($1, 'medium', 'investigating', 'Login from new location triggered MFA push', $2)`,
      [aliceId, JSON.stringify(['new_location','unusual_hour'])]
    );

    console.log('\n[seed] Done! Demo credentials:');
    console.log('  Customer : alice@demo.com   / password123');
    console.log('  Customer : bob@demo.com     / password123');
    console.log('  Analyst  : ravi.analyst@bank.com / password123\n');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error('[seed] Fatal:', err.message); process.exit(1); });
