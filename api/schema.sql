-- Termwise SQLite Schema

CREATE TABLE IF NOT EXISTS negotiations (
    id TEXT PRIMARY KEY,
    buyer_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    order_value REAL NOT NULL,
    status TEXT NOT NULL,
    final_proposal_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Append-only audit trail table per ARCHITECTURE.md and AGENT.md
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    negotiation_id TEXT NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    payload_summary TEXT NOT NULL,
    decision TEXT NOT NULL,
    reason TEXT NOT NULL
);
