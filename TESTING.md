# Testing Guide: Cogniq Identity Trust System

## Prerequisites
- Docker running
- Bun installed
- Python 3.10+ with venv available
- All three terminals ready

---

## Step 1: Start Infrastructure

```bash
cd /FDrive/E_Drive/Dev/cogniq
docker compose up -d
```

Expected: PostgreSQL (port 5433), Redis (port 6379), MongoDB (port 27017) all running.

---

## Step 2: Migrate & Seed the Database

```bash
cd /FDrive/E_Drive/Dev/cogniq/backend
bun install
bun run migrate    # Creates all tables (users, transactions, risk_events, alerts, devices)
bun run seed       # Inserts demo users, transactions, risk events, and alerts
```

**Seeded Credentials:**

| Role     | Email                      | Password    |
|----------|----------------------------|-------------|
| Customer | alice@demo.com             | password123 |
| Customer | bob@demo.com               | password123 |
| Analyst  | ravi.analyst@bank.com      | password123 |

---

## Step 3: Start All Services

Open 3 separate terminal windows:

**Terminal 1 — Backend API:**
```bash
cd /FDrive/E_Drive/Dev/cogniq/backend
bun run dev
# Starts on http://localhost:3001
```

**Terminal 2 — Risk Engine:**
```bash
cd /FDrive/E_Drive/Dev/cogniq/risk-engine
# First time only:
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Every time:
uvicorn app.main:app --reload --port 8000
# Starts on http://localhost:8000
```

**Terminal 3 — Frontend UI:**
```bash
cd /FDrive/E_Drive/Dev/cogniq/frontend
bun install
bun run dev
# Opens on http://localhost:5173
```

---

## Step 4: Verify Backend is Alive

```bash
curl http://localhost:3001/health
# Expected: { "success": true, "service": "Cogniq Backend", ... }
```

---

## Demo Flow Testing

Open **http://localhost:5173** in your browser.

### Flow 1: The Normal User (Zero Friction)
1. Log in as `alice@demo.com` / `password123`
2. You should land directly on the Customer Dashboard with no MFA prompt
3. Verify seeded transactions appear in the table

### Flow 2: High-Risk Transaction Block
1. Still as Alice, click **Send Money**
2. Enter: Amount = `85000`, Merchant = `Unknown Vendor`, Category = `Crypto`, Channel = `Online`
3. Observe the transaction getting **blocked** with a high risk score returned
4. Open a new browser tab → `http://localhost:5173/analyst` (as Ravi) to see the real-time WebSocket alert drop in

### Flow 3: Insider Threat Graph
1. Log in as `ravi.analyst@bank.com` / `password123`
2. Go to the Analyst Dashboard
3. Click the **Graph** or entity view to see Ravi's node with anomalous access patterns to multiple accounts

### Flow 4: Risk Factor Explainability
1. From the Analyst Dashboard, check the **Alerts** tab
2. Click on a critical alert
3. The Risk Breakdown panel shows weighted factors: Amount Anomaly, Crypto Category, New Merchant

### Flow 5: KYC Synthetic ID Detection
1. Navigate to `http://localhost:5173/onboard`
2. Fill out the personal info form
3. Upload a file named exactly `fake_id.jpg` during the KYC step
4. The AI flags it as a synthetic document and blocks onboarding
