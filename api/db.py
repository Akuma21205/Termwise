import sqlite3
import os
from typing import List, Dict, Any

DB_PATH = os.getenv("DATABASE_PATH", "termwise.db")


def get_db():
    """Returns a SQLite connection with row factory configured."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes the database schema from api/schema.sql."""
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    if os.path.exists(schema_path):
        with open(schema_path, "r", encoding="utf-8") as f:
            sql = f.read()
        conn = get_db()
        conn.executescript(sql)
        conn.commit()
        conn.close()


def log_audit_entry(
    negotiation_id: str,
    actor: str,
    action: str,
    payload_summary: str,
    decision: str,
    reason: str
):
    """
    Append-only audit trail entry writer per AGENT.md / ARCHITECTURE.md.
    Never mutates or updates existing rows.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO audit_log (negotiation_id, actor, action, payload_summary, decision, reason)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (negotiation_id, actor, action, payload_summary, decision, reason)
    )
    conn.commit()
    conn.close()


def get_audit_trail(negotiation_id: str) -> List[Dict[str, Any]]:
    """
    Fetches the chronological audit trail for a specific negotiation.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, timestamp, actor, action, payload_summary, decision, reason FROM audit_log WHERE negotiation_id = ? ORDER BY id ASC",
        (negotiation_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]
