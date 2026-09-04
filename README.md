# Termwise — AI-to-AI B2B Payment Negotiator

Built for the **Razorpay AI Buildathon 2026 — Track 1 (AI Growth & Agentic Commerce)**.

> **LLM proposes. Policy decides. Razorpay executes. Data learns.**

---

## The Problem

SMEs selling to large enterprise buyers are routinely forced into unfavorable payment terms (Net-60, Net-90) because they lack negotiating leverage — and because nobody on the sales side actually quantifies what that term *costs* before agreeing to it.

## What This Is

A **Buyer AI Agent** and a **Seller AI Agent** negotiate B2B payment terms (price, discount, credit days, delivery deadline) inside hard financial guardrails set by the merchant. The moment an agreement is reached:

1. A **deterministic Policy Engine** validates it (never the LLM).
2. It becomes a structured **Contract** object.
3. **Razorpay** (test mode) creates an Order + Payment Link with `expire_by = due date`.
4. Every step — proposals, decisions, overrides, webhooks — is written to an **append-only SQLite audit trail**.

This is **not** two LLMs chatting. The negotiation is bounded, every money-relevant decision is policy-gated, and every step is auditable. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Demo Story (~90 seconds)

1. SME gets a ₹10L order. Buyer agent opens with Net-60 + 4.5% discount.
2. Seller agent reasons over buyer reliability + seller cash pressure and counters: Net-45 + 3%.
3. Policy Engine visibly validates the final proposal against merchant-configured bounds.
4. Razorpay Order + Payment Link (expiry = due date) is created live in test mode.
5. If the order exceeds the auto-approval ceiling → **Supervisor Gate** activates (human-in-the-loop).
6. Full audit trail and 3-strategy benchmark comparison visible in the dashboard.

---

## Architecture (4 Non-Negotiable Components)

```
Buyer Agent  ──┐
               ├──► Policy Engine ──► Contract ──► Razorpay
Seller Agent ──┘         ▲
                    Economic Model
```

| Component | Type | Role |
|:---|:---|:---|
| Buyer Agent | LLM (Gemini 2.5 Flash) | Proposes payment terms — no execution rights |
| Seller Agent | LLM + Economic Model tool | Counter-proposes using EV formula — no execution rights |
| Policy Engine | Pure Python, deterministic | Validates every proposal → APPROVE / REJECT / ESCALATE |
| Economic Model | Pure Python math | Calculates expected financial value (financing cost + default risk + discount) |

---

## Repo Layout

```
/core          policy_engine.py, economic_model.py — deterministic, unit-tested, LLM-free
/agents        buyer_agent.py, seller_agent.py — LLM proposal engines (no execution authority)
/razorpay      order + payment-link + webhook integration (Razorpay test mode)
/api           FastAPI backend — negotiation endpoint, audit trail, supervisor override, SPA serving
/simulator     synthetic dataset generator + baseline strategy comparisons
/web           React 19 + Vite + TailwindCSS 4 frontend (production dashboard)
/docs          ARCHITECTURE.md, AGENT.md, CONTRIBUTING.md
/tests         21 tests, 100% passing (core, agents, razorpay, e2e)
```

---

## Quickstart

### Prerequisites
- Python 3.10+ (3.12 recommended)
- Node.js 20+ (for frontend)

### 1. Clone & Install

```bash
git clone https://github.com/Akuma21205/Termwise.git
cd Termwise
pip install -r requirements.txt
cp .env.example .env   # fill in API keys
```

### 2. Environment Variables (`.env`)

```env
GEMINI_API_KEY=your_google_gemini_api_key
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Run Tests

```bash
pytest -v   # 21/21 passing
```

### 4. Development Mode

**Backend (FastAPI):**
```bash
uvicorn api.main:app --reload --port 8000
# OpenAPI docs: http://localhost:8000/docs
```

**Frontend (Vite dev server — proxies API calls to port 8000):**
```bash
cd web
npm install
npm run dev
# Dashboard: http://localhost:5173
```

### 5. Production Mode (Single Process)

```bash
cd web && npm run build && cd ..
uvicorn api.main:app --host 0.0.0.0 --port 8080
# Full app (API + React SPA): http://localhost:8080
```

### 6. Docker

```bash
docker build -t termwise .
docker run -p 8080:8080 \
  -e GEMINI_API_KEY=your_key \
  -e RAZORPAY_KEY_ID=rzp_test_xxx \
  -e RAZORPAY_KEY_SECRET=your_secret \
  -e RAZORPAY_WEBHOOK_SECRET=your_secret \
  termwise
```

---

## Key API Endpoints

| Method | Path | Description |
|:---|:---|:---|
| `POST` | `/negotiate/run` | Run full AI-to-AI negotiation |
| `POST` | `/negotiate/override-approval` | Human supervisor override (escalated deals) |
| `GET` | `/audit?negotiation_id=<id>` | Fetch append-only audit trail |
| `POST` | `/evaluate?count=50` | Run 50-negotiation benchmark evaluation |
| `POST` | `/webhooks/razorpay` | Receive Razorpay payment webhook events |
| `GET` | `/api/health` | Service health check |

---

## Benchmark Results (50 Synthetic Negotiations)

| Strategy | Avg Expected Value | Policy Pass Rate | Avg Rounds | vs Baseline |
|:---|:---|:---|:---|:---|
| **Termwise Agentic AI** | ₹9,85,400 | 92% | 2.1 | **+14.8%** |
| Static Net-30 | ₹8,90,000 | 65% | 1.0 | 0.0% |
| Naive Discount | ₹8,45,000 | 78% | 1.0 | -6.5% |

---

## Handled Failure Modes

| # | Scenario | Response |
|:---|:---|:---|
| 1 | Policy violation (excessive discount / term) | `REJECT` — seller counter-proposes or terminates |
| 2 | High-value deal exceeds auto-approval ceiling | `ESCALATE` — Supervisor Gate blocks execution |
| 3 | Payment link expires unpaid | Razorpay webhook → audit logged as `OVERDUE_EXPIRED` |
| 4 | LLM returns malformed JSON | Pydantic catches it → deterministic rule-based fallback |
| 5 | Buyer/seller bounds irreconcilable | 5-round cap → `MAX_ROUNDS_EXCEEDED` |
| 6 | Forged webhook signature | HMAC SHA256 check fails → HTTP 400 |
| 7 | Concurrent DB write contention | SQLite WAL mode eliminates file lock hangs |
| 8 | Backend unreachable from UI | React client-side simulation fallback |

---

## Deploy to Render.com

`render.yaml` is included. Push to GitHub, create a Render Web Service, and connect the repo.
Set env vars in the Render dashboard. Health check runs on `GET /api/health`.

---

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 4-component design & invariants
- [`docs/AGENT.md`](docs/AGENT.md) — AI behavioral guidelines & scope guardrails
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — developer setup guide
- [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) — exhaustive technical deep-dive

---

## Track Fit

Razorpay's Track 1 bar: every money action explainable, bounded, gated; audit trail visible; at least one failure handled gracefully. That bar drives every architectural decision here — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §"Design principle".
