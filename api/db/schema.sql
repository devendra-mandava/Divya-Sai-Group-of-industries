CREATE TABLE IF NOT EXISTS parties (
  id            SERIAL PRIMARY KEY,
  company       VARCHAR(20) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  gst           VARCHAR(20),
  street        VARCHAR(255),
  city          VARCHAR(100),
  state         VARCHAR(100),
  pincode       VARCHAR(10),
  ship_street   VARCHAR(255),
  ship_city     VARCHAR(100),
  ship_state    VARCHAR(100),
  ship_pincode  VARCHAR(10),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parties_company ON parties(company);
CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(company, name);

CREATE TABLE IF NOT EXISTS documents (
  id            SERIAL PRIMARY KEY,
  company       VARCHAR(20) NOT NULL,
  doc_type      VARCHAR(20) NOT NULL,
  doc_number    VARCHAR(50) NOT NULL,
  party_id      INTEGER REFERENCES parties(id),
  party_name    VARCHAR(255) NOT NULL,
  party_phone   VARCHAR(20),
  party_json    JSONB,
  doc_date      DATE NOT NULL,
  due_date      DATE,
  grand_total   NUMERIC(12,2),
  received_amount NUMERIC(12,2) DEFAULT 0,
  vehicle_no    VARCHAR(50),
  items_json    JSONB,
  extras_json   JSONB,
  tax_json      JSONB,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_company_type ON documents(company, doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_party_name ON documents(party_name);
CREATE INDEX IF NOT EXISTS idx_documents_doc_number ON documents(company, doc_type, doc_number);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS party_phone VARCHAR(20);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS party_json JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS received_amount NUMERIC(12,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS counters (
  id            SERIAL PRIMARY KEY,
  company       VARCHAR(20) NOT NULL,
  doc_type      VARCHAR(20) NOT NULL,
  fiscal_year   VARCHAR(10) NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  UNIQUE(company, doc_type, fiscal_year)
);
