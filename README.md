# Penta Chool Works — Gold Cutting & Engraving Ledger

Production-ready web application built specifically for jewellery **Chool / Cutting / Engraving** workers.

The software is designed around the core business principle:
$$\textbf{Customer} \longrightarrow \textbf{Karat Account} \longrightarrow \textbf{Transactions} \longrightarrow \textbf{Running Balance} \longrightarrow \textbf{Settlement}$$

Every customer's work is tracked independently by karat (e.g., 92K, 75K, 24K, custom hallmark grades) without mixing weights or requiring rigid traditional order workflows.

---

## 💎 Features Built

1. **Authentication & RBAC**:
   - Secure username/email + password authentication
   - JWT sessions in HTTP-only cookies (`jose`)
   - `ADMIN` and `STAFF` roles with strict route protection
   - Forgot Password & Reset Password token flow
   - Pre-seeded users:
     - **Admin**: `admin` / `admin123` (or `admin@pentachool.com`)
     - **Staff**: `staff` / `staff123` (or `staff@pentachool.com`)

2. **Decimal-Safe Calculations**:
   - Strict `0.001g` gold weight precision using `decimal.js` and PostgreSQL `DECIMAL(15,3)`
   - Never uses JavaScript native floating-point math for gold calculations
   - Making charge money precision in `DECIMAL(15,2)`

3. **Core Running Ledger**:
   - Running balance derived directly from active transactions:
     $$\text{Current Balance} = \sum \text{IN} - \sum \text{OUT} - \sum \text{Settlement Adjustments}$$
   - Bank-statement style ledger table with running balance per entry
   - Same-day multiple transactions with exact timestamps
   - Accidental negative balance protection with admin override reason modal

4. **Settlement & Making Charge Engine**:
   - Flexible remaining gold handling:
     - **Return to Customer**: Generates `SETTLEMENT_RETURN` ledger transaction
     - **Adjust (Loss/Dust)**: Generates `SETTLEMENT_ADJUSTMENT` ledger transaction
     - **Carry Forward**: Keeps remaining balance intact in ledger for future transactions
   - Flexible Making Charges calculation bases:
     - Total Received Weight ($\text{IN} \times \text{Rate}$)
     - Total Finished Returned Weight ($\text{OUT} \times \text{Rate}$)
     - Manual Chargeable Weight
   - Partial, full, and multi-installment payment tracking (`CASH`, `UPI`, `BANK_TRANSFER`, `CHEQUE`)
   - Professional printable A4 portrait Settlement Receipt with signatures

5. **Customer Management**:
   - Searchable by customer name, shop name, and phone
   - Overview of active karat accounts, total pending gold weight, and pending making charges
   - Opening balance support with immutable ledger record generation

6. **Quick Transaction Modal & Mobile Bar**:
   - Sticky mobile bottom bar with large touch targets: `+ IN`, `− OUT`, `Settle`
   - Pre-submission confirmation: shows previous balance $\rightarrow$ new balance preview

7. **Reports & Audit Trail**:
   - Customer Balance Report (with grand totals)
   - Outstanding Work Report (only accounts where $\text{Balance} > 0\text{g}$)
   - Daily Transaction Journal
   - Making Charges Billed & Payment Status Report
   - Complete printable Customer Statement
   - Immutable Audit Log tracking every creation, update, void, and settlement

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Docker / Neon / Supabase)
- **ORM**: Prisma ORM 6.4.1
- **Icons**: Lucide React
- **Math**: Decimal.js

---

## 🚀 Getting Started

### 1. Database Configuration
Ensure PostgreSQL is running. If using Docker:
```bash
docker run --name chool-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=chool_db -p 5432:5432 -d postgres:16-alpine
```

Check `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chool_db?schema=public"
JWT_SECRET="chool_super_secret_jwt_key_2026_jewellery_worker_secure_session_token_key"
NEXT_PUBLIC_APP_NAME="Penta Chool Ledger"
```

### 2. Push Database Schema & Seed Demo Data
```bash
npx prisma db push
npm run seed
```

### 3. Run Scenario Verification Tests
To run all 12 mathematical test scenarios:
```bash
npx tsx test-scenarios.ts
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Demo Data Preloaded

- **Business**: Penta Chool Works, Rajkot
- **Customer 1**: Rahul Jewellers
  - **92K Ledger**: Fully demonstrates Batch 1 history (470g IN, 464g OUT, 6g Return Settlement with ₹11,750 making charge paid via UPI) + Batch 2 new IN 100g after settlement.
  - **75K Ledger**: Separate independent ledger (200g IN, 80g OUT $\rightarrow$ 120g balance).
- **Customer 2**: Shree Gold
  - **75K Ledger**: Opening balance 50g, IN 150g, OUT 60g, IN 40g, OUT 50g $\rightarrow$ 130g current pending balance.
