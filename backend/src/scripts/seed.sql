-- Cogniq demo seed — run via: bash src/scripts/seed.sh
-- Clears and repopulates all demo data in one shot (~1 second).

BEGIN;

TRUNCATE alerts, risk_events, transactions, devices, users RESTART IDENTITY CASCADE;

-- password123 (pre-computed bcrypt)
INSERT INTO users (name, email, phone, password_hash, is_employee, risk_tier) VALUES
  ('Alice Sharma',   'alice@demo.com',       '+91 9800000001', '$2a$10$P3L6KfYqtFA1YwbhLFe9zOH5mxOhHmCe9HY3bjxied4FT0Cum17D2', false, 'trusted'),
  ('Bob Mehta',      'bob@demo.com',         '+91 9800000002', '$2a$10$P3L6KfYqtFA1YwbhLFe9zOH5mxOhHmCe9HY3bjxied4FT0Cum17D2', false, 'standard'),
  ('Priya Nair',     'priya.nair@demo.com',  '+91 9812345601', '$2a$10$P3L6KfYqtFA1YwbhLFe9zOH5mxOhHmCe9HY3bjxied4FT0Cum17D2', false, 'standard'),
  ('Rahul Kapoor',   'rahul.k@demo.com',     '+91 9812345602', '$2a$10$P3L6KfYqtFA1YwbhLFe9zOH5mxOhHmCe9HY3bjxied4FT0Cum17D2', false, 'standard'),
  ('Sneha Iyer',     'sneha.iyer@demo.com',  '+91 9812345603', '$2a$10$P3L6KfYqtFA1YwbhLFe9zOH5mxOhHmCe9HY3bjxied4FT0Cum17D2', false, 'trusted'),
  ('Vikram Singh',   'vikram.s@demo.com',    '+91 9812345604', '$2a$10$P3L6KfYqtFA1YwbhLFe9zOH5mxOhHmCe9HY3bjxied4FT0Cum17D2', false, 'elevated'),
  ('Ananya Reddy',   'ananya.r@demo.com',    '+91 9812345605', '$2a$10$P3L6KfYqtFA1YwbhLFe9zOH5mxOhHmCe9HY3bjxied4FT0Cum17D2', false, 'standard'),
  ('Karan Malhotra', 'karan.m@demo.com',     '+91 9812345606', '$2a$10$P3L6KfYqtFA1YwbhLFe9zOH5mxOhHmCe9HY3bjxied4FT0Cum17D2', false, 'standard'),
  ('Divya Patel',    'divya.p@demo.com',     '+91 9812345607', '$2a$10$P3L6KfYqtFA1YwbhLFe9zOH5mxOhHmCe9HY3bjxied4FT0Cum17D2', false, 'trusted'),
  ('Arjun Desai',    'arjun.d@demo.com',     '+91 9812345608', '$2a$10$P3L6KfYqtFA1YwbhLFe9zOH5mxOhHmCe9HY3bjxied4FT0Cum17D2', false, 'standard'),
  ('Meera Joshi',    'meera.j@demo.com',     '+91 9812345609', '$2a$10$P3L6KfYqtFA1YwbhLFe9zOH5mxOhHmCe9HY3bjxied4FT0Cum17D2', false, 'standard'),
  ('Nikhil Rao',     'nikhil.r@demo.com',    '+91 9812345610', '$2a$10$P3L6KfYqtFA1YwbhLFe9zOH5mxOhHmCe9HY3bjxied4FT0Cum17D2', false, 'elevated');

INSERT INTO users (name, email, phone, password_hash, is_employee, employee_role, risk_tier)
VALUES ('Ravi Analyst', 'ravi.analyst@bank.com', '+91 9800000099', '$2a$10$P3L6KfYqtFA1YwbhLFe9zOH5mxOhHmCe9HY3bjxied4FT0Cum17D2', true, 'fraud_analyst', 'employee');

INSERT INTO devices (user_id, device_fingerprint, device_name, os, browser, trust_score, is_trusted, last_seen)
SELECT u.id, d.fp, d.name, d.os, d.browser, d.trust, d.trusted, NOW() - (random() * INTERVAL '3 days')
FROM (VALUES
  ('alice@demo.com',       'fp_alice_macbook',  'MacBook Pro 14"',    'macOS 14.4',  'Chrome 124',    0.96, true),
  ('alice@demo.com',       'fp_alice_iphone',   'iPhone 15 Pro',      'iOS 17.4',    'Safari 17',     0.91, true),
  ('bob@demo.com',         'fp_bob_laptop',     'Dell XPS 15',        'Windows 11',  'Firefox 125',   0.78, true),
  ('bob@demo.com',         'fp_bob_android',    'Samsung Galaxy S24', 'Android 14',  'Chrome Mobile', 0.72, false),
  ('priya.nair@demo.com',  'fp_priya_ipad',     'iPad Air',           'iPadOS 17',   'Safari',        0.88, true),
  ('vikram.s@demo.com',    'fp_vikram_win',     'HP Pavilion',        'Windows 11',  'Edge 124',      0.45, false),
  ('nikhil.r@demo.com',    'fp_nikhil_linux',   'ThinkPad X1',        'Ubuntu 22.04','Firefox',       0.55, false)
) AS d(email, fp, name, os, browser, trust, trusted)
JOIN users u ON u.email = d.email;

INSERT INTO transactions (user_id, amount, merchant, category, channel, status, risk_score, flagged, timestamp)
SELECT u.id, t.amt, t.mer, t.cat, t.chan, t.stat, t.risk, t.flag, NOW() - (t.days || ' days')::INTERVAL * random()
FROM (VALUES
  ('alice@demo.com', 2500,    'Swiggy',           'food',     'mobile', 'completed',            11, false, 7),
  ('alice@demo.com', 15000,   'Amazon',           'shopping', 'online', 'completed',            21, false, 6),
  ('alice@demo.com', 5000,    'Netflix',          'utilities','online', 'completed',             8, false, 5),
  ('alice@demo.com', 85000,   'Unknown Vendor',   'crypto',   'online', 'blocked',              94, true,  4),
  ('alice@demo.com', 1200,    'Zomato',           'food',     'mobile', 'completed',             9, false, 4),
  ('alice@demo.com', 50000,   'Wire Transfer',    'general',  'online', 'pending_verification', 74, true,  3),
  ('alice@demo.com', 3200,    'BigBasket',        'shopping', 'online', 'completed',            14, false, 3),
  ('alice@demo.com', 899,     'Airtel',           'utilities','mobile', 'completed',             7, false, 2),
  ('alice@demo.com', 18500,   'MakeMyTrip',       'travel',   'online', 'completed',            28, false, 2),
  ('alice@demo.com', 650,     'BookMyShow',       'general',  'mobile', 'completed',            10, false, 1),
  ('alice@demo.com', 4200,    'Apollo Pharmacy',  'general',  'mobile', 'completed',            12, false, 1),
  ('alice@demo.com', 7800,    'Flipkart',         'shopping', 'online', 'completed',            19, false, 1),
  ('alice@demo.com', 2400,    'Uber',             'travel',   'mobile', 'completed',            11, false, 1),
  ('alice@demo.com', 15000,   'HDFC Bill Pay',    'utilities','online', 'completed',            22, false, 1),
  ('alice@demo.com', 980,     'Spotify',          'utilities','online', 'completed',             6, false, 1),
  ('bob@demo.com',   3000,    'BigBasket',        'shopping', 'online', 'completed',            17, false, 10),
  ('bob@demo.com',   120000,  'Crypto Exchange',  'crypto',   'online', 'blocked',              96, true,  8),
  ('bob@demo.com',   800,     'BookMyShow',       'general',  'mobile', 'completed',            10, false, 7),
  ('bob@demo.com',   4500,    'Swiggy',           'food',     'mobile', 'completed',            13, false, 5),
  ('bob@demo.com',   22000,   'Croma',            'shopping', 'online', 'completed',            31, false, 3),
  ('priya.nair@demo.com',  5400,  'Myntra',        'shopping', 'online', 'completed', 18, false, 12),
  ('rahul.k@demo.com',     8900,  'IRCTC',         'travel',   'online', 'completed', 24, false, 9),
  ('sneha.iyer@demo.com',  3200,  'Swiggy',        'food',     'mobile', 'completed', 11, false, 6),
  ('vikram.s@demo.com',    45000, 'Wire Transfer', 'general',  'online', 'blocked',   89, true,  2),
  ('ananya.r@demo.com',    1200,  'Jio',           'utilities','mobile', 'completed',  8, false, 4),
  ('karan.m@demo.com',     6700,  'Croma',         'shopping', 'online', 'completed', 20, false, 8),
  ('divya.p@demo.com',     2800,  'Zomato',        'food',     'mobile', 'completed', 10, false, 3),
  ('arjun.d@demo.com',     15000, 'MakeMyTrip',    'travel',   'online', 'completed', 27, false, 11),
  ('meera.j@demo.com',     4200,  'BigBasket',     'shopping', 'online', 'completed', 15, false, 5),
  ('nikhil.r@demo.com',    95000, 'Unknown Vendor','crypto',   'online', 'blocked',   92, true,  1)
) AS t(email, amt, mer, cat, chan, stat, risk, flag, days)
JOIN users u ON u.email = t.email;

INSERT INTO risk_events (user_id, event_type, risk_score, risk_factors, action_taken, ip_address, timestamp)
SELECT u.id, r.evt, r.score, r.factors::jsonb, r.action, r.ip, NOW() - (r.days || ' hours')::INTERVAL
FROM (VALUES
  ('alice@demo.com',          'login_attempt',          11, '["trusted_device","normal_hour"]',                    'allow',    '49.32.10.1',   48),
  ('alice@demo.com',          'transaction_high_value', 94, '["amount_anomaly","crypto_category","new_merchant"]', 'block',    '49.32.10.1',   36),
  ('alice@demo.com',          'login_attempt',          52, '["new_location","unusual_hour"]',                     'mfa_push', '103.21.45.88', 24),
  ('alice@demo.com',          'login_attempt',           9, '["trusted_device","behavioral_match"]',               'allow',    '49.32.10.1',   12),
  ('alice@demo.com',          'transaction',            28, '["known_merchant","normal_amount"]',                'allow',    '49.32.10.1',    6),
  ('bob@demo.com',            'login_attempt',          19, '["trusted_device"]',                                  'allow',    '49.32.20.5',   40),
  ('bob@demo.com',            'transaction_high_value',  96, '["amount_anomaly","crypto_category","velocity_spike"]','block',   '49.32.20.5',   20),
  ('bob@demo.com',            'login_attempt',          62, '["new_device","unusual_hour"]',                       'mfa_otp',  '49.32.20.5',   10),
  ('ravi.analyst@bank.com',   'login_attempt',          16, '["employee_account","trusted_device"]',               'allow',    '10.0.0.50',     2),
  ('vikram.s@demo.com',       'login_attempt',          78, '["untrusted_device","behavioral_deviation"]',         'mfa_otp',  '185.220.101.5', 8),
  ('nikhil.r@demo.com',       'login_attempt',          88, '["tor_exit_node","behavioral_deviation"]',            'block',    '185.220.101.5', 4),
  ('priya.nair@demo.com',     'login_attempt',          14, '["trusted_device"]',                                  'allow',    '103.21.45.88', 16),
  ('sneha.iyer@demo.com',     'transaction',            45, '["new_category"]',                                    'mfa_push', '103.21.45.88', 14),
  ('rahul.k@demo.com',        'transaction',            82, '["amount_anomaly","high_velocity"]',                  'block',    '103.21.45.88',  6),
  ('divya.p@demo.com',        'login_attempt',          12, '["trusted_device","behavioral_match"]',               'allow',    '49.32.30.10',  18)
) AS r(email, evt, score, factors, action, ip, days)
JOIN users u ON u.email = r.email;

-- Feed density for analyst dashboard
INSERT INTO risk_events (user_id, event_type, risk_score, risk_factors, action_taken, ip_address, timestamp)
SELECT u.id,
       CASE WHEN g.i % 3 = 0 THEN 'transaction' ELSE 'login_attempt' END,
       10 + (g.i * 17 % 70),
       '["routine_check"]'::jsonb,
       CASE WHEN g.i % 5 = 0 THEN 'block' WHEN g.i % 3 = 0 THEN 'mfa_otp' WHEN g.i % 2 = 0 THEN 'mfa_push' ELSE 'allow' END,
       '103.21.45.' || (g.i % 200 + 1),
       NOW() - (g.i || ' minutes')::INTERVAL
FROM generate_series(1, 35) g(i)
CROSS JOIN LATERAL (
  SELECT id FROM users WHERE is_employee = false ORDER BY random() LIMIT 1
) u;

INSERT INTO alerts (user_id, severity, status, description, risk_factors)
SELECT u.id, a.sev, a.stat, a.alert_desc, a.factors::jsonb
FROM (VALUES
  ('alice@demo.com',      'critical', 'active',        'High-value crypto transfer blocked — ₹85,000 to Unknown Vendor flagged by AI fusion engine', '["amount_anomaly","crypto_category","new_merchant"]'),
  ('bob@demo.com',        'critical', 'active',        'Repeated blocked transactions — 3 crypto attempts in 24h, velocity spike detected',            '["amount_anomaly","crypto_category","velocity_spike"]'),
  ('alice@demo.com',      'high',     'investigating', 'Login from Bengaluru at 02:14 AM triggered step-up authentication',                          '["new_location","unusual_hour"]'),
  ('vikram.s@demo.com',   'high',     'active',        'Untrusted device login — behavioral deviation score 78%',                                    '["untrusted_device","behavioral_deviation"]'),
  ('nikhil.r@demo.com',   'critical', 'active',        'Account access blocked — TOR exit node + keystroke anomaly cluster',                         '["tor_exit_node","behavioral_deviation"]'),
  ('rahul.k@demo.com',    'high',     'active',        'Transaction velocity spike — 6 transfers in 8 minutes',                                      '["high_velocity","amount_anomaly"]'),
  ('sneha.iyer@demo.com', 'medium',   'investigating', 'New merchant category detected — first travel booking above ₹25,000',                      '["new_category"]'),
  ('meera.j@demo.com',    'medium',   'active',        'Document re-verification pending — KYC expiry in 14 days',                                   '["kyc_expiry"]'),
  ('arjun.d@demo.com',    'low',      'resolved',      'False positive cleared — legitimate device change confirmed by customer',                    '["new_device"]'),
  ('karan.m@demo.com',    'high',     'active',        'Insider graph anomaly — shared IP with flagged account cluster',                             '["entity_graph_link"]')
) AS a(email, sev, stat, alert_desc, factors)
JOIN users u ON u.email = a.email;

COMMIT;

SELECT
  (SELECT count(*) FROM users)        AS users,
  (SELECT count(*) FROM transactions) AS transactions,
  (SELECT count(*) FROM risk_events)  AS risk_events,
  (SELECT count(*) FROM alerts)       AS alerts,
  (SELECT count(*) FROM devices)      AS devices;
