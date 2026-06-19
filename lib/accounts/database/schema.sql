-- Dharitri Sutra ERP — Accounts Module Database Schema (PostgreSQL)
-- Hierarchy: Primary Head (L1) → Account Group (L2) → Sub-Group (L3) → Ledger (L4) → Sub-Ledger (L5)
-- Levels 1–3 are system-locked. Users create Ledgers and Sub-Ledgers only.

-- ── Organisation scope ────────────────────────────────────────────────────────
CREATE TABLE organisations (
  id            BIGSERIAL PRIMARY KEY,
  code          VARCHAR(32) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  gstin         VARCHAR(15),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Financial Years ───────────────────────────────────────────────────────────
CREATE TABLE financial_years (
  id            BIGSERIAL PRIMARY KEY,
  org_id        BIGINT NOT NULL REFERENCES organisations(id),
  name          VARCHAR(64) NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  lock_date     DATE,
  is_active     BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    VARCHAR(128) NOT NULL,
  updated_by    VARCHAR(128) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, name),
  CHECK (end_date > start_date)
);

CREATE UNIQUE INDEX uq_one_active_fy_per_org ON financial_years (org_id) WHERE is_active;

-- ── Chart of Accounts ─────────────────────────────────────────────────────────
CREATE TYPE coa_node_level AS ENUM (
  'primary_head', 'account_group', 'sub_group', 'ledger', 'sub_ledger'
);

CREATE TYPE account_type AS ENUM ('Asset', 'Liability', 'Income', 'Expense', 'Equity');
CREATE TYPE balance_side AS ENUM ('Debit', 'Credit');
CREATE TYPE record_status AS ENUM ('active', 'inactive');

CREATE TABLE chart_of_accounts (
  id                    BIGSERIAL PRIMARY KEY,
  org_id                BIGINT NOT NULL REFERENCES organisations(id),
  account_code          VARCHAR(32) NOT NULL,
  account_name          VARCHAR(255) NOT NULL,
  alias                 VARCHAR(128) DEFAULT '',
  account_type          account_type NOT NULL,
  node_level            coa_node_level NOT NULL,
  parent_id             BIGINT REFERENCES chart_of_accounts(id),
  description           TEXT DEFAULT '',
  status                record_status NOT NULL DEFAULT 'active',
  is_system             BOOLEAN NOT NULL DEFAULT FALSE,
  opening_balance       NUMERIC(18,2) NOT NULL DEFAULT 0,
  balance_type          balance_side NOT NULL DEFAULT 'Debit',
  gst_applicable        BOOLEAN NOT NULL DEFAULT FALSE,
  tds_applicable        BOOLEAN NOT NULL DEFAULT FALSE,
  cost_center_applicable BOOLEAN NOT NULL DEFAULT FALSE,
  bank_account_flag     BOOLEAN NOT NULL DEFAULT FALSE,
  erp_party_type        VARCHAR(32),  -- customer | vendor | employee | bank | none
  erp_party_id          BIGINT,
  created_by            VARCHAR(128) NOT NULL,
  updated_by            VARCHAR(128) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, account_code),
  UNIQUE (org_id, parent_id, account_name)
);

CREATE INDEX idx_coa_parent ON chart_of_accounts (parent_id);
CREATE INDEX idx_coa_level ON chart_of_accounts (org_id, node_level);
CREATE INDEX idx_coa_party ON chart_of_accounts (org_id, erp_party_type, erp_party_id);

-- ── Voucher Types ─────────────────────────────────────────────────────────────
CREATE TYPE voucher_type_code AS ENUM (
  'journal', 'payment', 'receipt', 'contra',
  'sales', 'purchase', 'debit_note', 'credit_note'
);

CREATE TABLE voucher_types (
  id              BIGSERIAL PRIMARY KEY,
  org_id          BIGINT NOT NULL REFERENCES organisations(id),
  code            voucher_type_code NOT NULL,
  name            VARCHAR(64) NOT NULL,
  prefix          VARCHAR(16) NOT NULL,
  numbering_type  VARCHAR(16) NOT NULL DEFAULT 'auto',
  starting_number INT NOT NULL DEFAULT 1,
  status          record_status NOT NULL DEFAULT 'active',
  is_system       BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (org_id, code)
);

-- ── Vouchers ──────────────────────────────────────────────────────────────────
CREATE TYPE voucher_status AS ENUM ('draft', 'approved', 'rejected', 'posted');

CREATE TABLE vouchers (
  id                  BIGSERIAL PRIMARY KEY,
  org_id              BIGINT NOT NULL REFERENCES organisations(id),
  financial_year_id   BIGINT REFERENCES financial_years(id),
  voucher_type        voucher_type_code NOT NULL,
  voucher_number      VARCHAR(32) NOT NULL,
  voucher_date        DATE NOT NULL,
  reference_no        VARCHAR(64) DEFAULT '',
  narration           TEXT DEFAULT '',
  total_debit         NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_credit        NUMERIC(18,2) NOT NULL DEFAULT 0,
  status              voucher_status NOT NULL DEFAULT 'draft',
  source_module       VARCHAR(64),   -- procurement | sales | hr | warehouse | manual
  source_document_id  BIGINT,
  source_document_no  VARCHAR(64),
  posted_at           TIMESTAMPTZ,
  posted_by           VARCHAR(128),
  created_by          VARCHAR(128) NOT NULL,
  updated_by          VARCHAR(128) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, voucher_type, voucher_number)
);

CREATE INDEX idx_vouchers_date ON vouchers (org_id, voucher_date);
CREATE INDEX idx_vouchers_source ON vouchers (org_id, source_module, source_document_id);

CREATE TABLE voucher_lines (
  id              BIGSERIAL PRIMARY KEY,
  voucher_id      BIGINT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  line_no         INT NOT NULL,
  coa_account_id  BIGINT NOT NULL REFERENCES chart_of_accounts(id),
  debit           NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit          NUMERIC(18,2) NOT NULL DEFAULT 0,
  cost_center_id  BIGINT,
  remarks         TEXT DEFAULT '',
  CHECK (debit >= 0 AND credit >= 0),
  CHECK (NOT (debit > 0 AND credit > 0))
);

CREATE INDEX idx_voucher_lines_account ON voucher_lines (coa_account_id);

-- ── Cost Centers ──────────────────────────────────────────────────────────────
CREATE TABLE cost_centers (
  id          BIGSERIAL PRIMARY KEY,
  org_id      BIGINT NOT NULL REFERENCES organisations(id),
  code        VARCHAR(32) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  parent_id   BIGINT REFERENCES cost_centers(id),
  status      record_status NOT NULL DEFAULT 'active',
  created_by  VARCHAR(128) NOT NULL,
  updated_by  VARCHAR(128) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, code)
);

-- ── Bank Accounts (operational link to COA ledger) ────────────────────────────
CREATE TABLE bank_accounts (
  id              BIGSERIAL PRIMARY KEY,
  org_id          BIGINT NOT NULL REFERENCES organisations(id),
  coa_ledger_id   BIGINT NOT NULL REFERENCES chart_of_accounts(id),
  bank_name       VARCHAR(128) NOT NULL,
  account_number  VARCHAR(64) NOT NULL,
  ifsc            VARCHAR(16),
  branch          VARCHAR(128),
  account_type    VARCHAR(32) DEFAULT 'Current',
  status          record_status NOT NULL DEFAULT 'active',
  created_by      VARCHAR(128) NOT NULL,
  updated_by      VARCHAR(128) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, account_number)
);

-- ── Ledger Mappings (ERP integration defaults) ────────────────────────────────
CREATE TYPE erp_module AS ENUM (
  'procurement', 'sales', 'hr', 'warehouse', 'payments', 'journal'
);

CREATE TABLE ledger_mappings (
  id              BIGSERIAL PRIMARY KEY,
  org_id          BIGINT NOT NULL REFERENCES organisations(id),
  module          erp_module NOT NULL,
  mapping_key     VARCHAR(64) NOT NULL,  -- e.g. purchase_inventory, sales_revenue
  coa_account_id  BIGINT NOT NULL REFERENCES chart_of_accounts(id),
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (org_id, module, mapping_key)
);

-- ── Accounting Settings ───────────────────────────────────────────────────────
CREATE TABLE accounting_settings (
  id                    BIGSERIAL PRIMARY KEY,
  org_id                BIGINT NOT NULL REFERENCES organisations(id) UNIQUE,
  default_cash_ledger_id    BIGINT REFERENCES chart_of_accounts(id),
  default_bank_ledger_id    BIGINT REFERENCES chart_of_accounts(id),
  round_off_ledger_id       BIGINT REFERENCES chart_of_accounts(id),
  auto_post_sales           BOOLEAN NOT NULL DEFAULT TRUE,
  auto_post_purchase        BOOLEAN NOT NULL DEFAULT TRUE,
  auto_post_hr_claims       BOOLEAN NOT NULL DEFAULT TRUE,
  auto_post_stock_adj       BOOLEAN NOT NULL DEFAULT TRUE,
  require_voucher_approval  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by            VARCHAR(128) NOT NULL,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Bank Reconciliation ───────────────────────────────────────────────────────
CREATE TABLE bank_statements (
  id              BIGSERIAL PRIMARY KEY,
  org_id          BIGINT NOT NULL REFERENCES organisations(id),
  bank_account_id BIGINT NOT NULL REFERENCES bank_accounts(id),
  statement_date  DATE NOT NULL,
  reference       VARCHAR(64),
  description     TEXT,
  debit           NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit          NUMERIC(18,2) NOT NULL DEFAULT 0,
  balance         NUMERIC(18,2),
  is_reconciled   BOOLEAN NOT NULL DEFAULT FALSE,
  voucher_line_id BIGINT REFERENCES voucher_lines(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Permissions (RBAC) ────────────────────────────────────────────────────────
CREATE TABLE permissions (
  id    BIGSERIAL PRIMARY KEY,
  code  VARCHAR(128) NOT NULL UNIQUE,
  module VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  description TEXT
);

CREATE TABLE role_permissions (
  role_id       BIGINT NOT NULL,
  permission_id BIGINT NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

-- Seed permission codes (run once)
-- accounts.coa.view | accounts.coa.ledger.create | accounts.coa.sub_ledger.create
-- accounts.voucher.create | accounts.voucher.post | accounts.voucher.approve
-- accounts.report.view | accounts.settings.manage | accounts.bank.reconcile
