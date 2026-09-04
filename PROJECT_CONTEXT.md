# Termwise — Comprehensive Architecture & Technical Deep-Dive Specification

> **Event:** Razorpay AI Buildathon 2026 — Track 1 (AI Growth & Agentic Commerce)  
> **Core Architectural Principle:** *LLM proposes. Policy decides. Razorpay executes. Data learns.*  
> **Repository:** [https://github.com/Akuma21205/Termwise.git](https://github.com/Akuma21205/Termwise.git)

---

## Table of Contents
1. [Executive Overview & Problem Statement](#1-executive-overview--problem-statement)
2. [Non-Negotiable System Invariants](#2-non-negotiable-system-invariants)
3. [Repository Directory & Complete File Breakdown](#3-repository-directory--complete-file-breakdown)
4. [Component Technical Deep-Dive](#4-component-technical-deep-dive)
   - [Core Layer (Models, Policy Engine, Economic Model, Contract)](#a-core-layer)
   - [Agentic LLM Layer (Prompts, Buyer Agent, Seller Agent, Orchestrator)](#b-agentic-llm-layer)
   - [Razorpay Execution Layer (Client & Webhooks)](#c-razorpay-execution-layer)
   - [API & Storage Layer (FastAPI, SQLite Audit Log, Human Approval)](#d-api--storage-layer)
   - [Simulator & Evaluation Engine (Data Generator, Baselines, Evaluator)](#e-simulator--evaluation-engine)
   - [React/Vite Web Frontend Dashboard](#f-reactvite-web-frontend-dashboard)
5. [Updates & Changes Made](#5-updates--changes-made)
6. [Handled Failure Modes & Edge Cases](#6-handled-failure-modes--edge-cases)
7. [Comprehensive Test Suite Matrix (21/21 Passing)](#7-comprehensive-test-suite-matrix-2121-passing)
8. [Environment & Deployment Setup Guide](#8-environment--deployment-setup-guide)

---

## 1. Executive Overview & Problem Statement

### The B2B Commerce Gap
Small and Medium Enterprises (SMEs) selling to large enterprise buyers face a critical working capital dilemma:
- Enterprise buyers demand extended credit terms (Net-60, Net-90 days) and early payment discounts.
- SMEs lack negotiating power, real-time risk visibility, and financial modeling tools to evaluate what extended credit terms actually cost in annual financing costs, inflation, and default probability.
- Manual payment term negotiation is slow, rigid, and often leads to bad debt or cash flow crises.

### The Termwise Solution
**Termwise** is an agentic commercial platform where a **Buyer AI Agent** and a **Seller AI Agent** negotiate B2B payment terms (order value, quantity, payment credit term days, early payment discount %, delivery deadline) inside hard financial policy bounds set by the merchant.

Upon reaching agreement:
1. The agreement is validated by a **deterministic Policy Engine** (never the LLM).
2. It is converted into a structured `Contract` object.
3. It triggers **Razorpay Test-Mode payment lifecycle execution** (Order creation -> Payment Link creation with `expire_by = payment_term_days` due-date expiry -> webhook-driven settlement tracking).
4. Every negotiation step, policy check, human override, and execution event is logged in an **append-only audit trail**.

---

## 2. Non-Negotiable System Invariants

1. **Zero LLM Execution Authority Over Money:**
   LLMs (Buyer and Seller agents) ONLY produce structured `Proposal` objects. Every proposal must pass through `core/policy_engine.py::validate()` before it can become a contract or touch Razorpay.
2. **Minimal 4-Component Boundary:**
   The core negotiation architecture strictly consists of 4 components:
   - **Buyer Agent** (LLM-driven proposal engine)
   - **Seller Agent** (LLM-driven proposal engine calling Economic Model as a tool)
   - **Policy Engine** (Pure Python, deterministic rule engine)
   - **Economic Model** (Pure Python mathematical formula)
3. **Capped Negotiation Protocol:**
   Negotiations are strictly capped at **max 5 rounds**. No infinite reasoning loops. Negotiable fields are strictly: `price/order_value`, `quantity`, `payment_term_days`, `discount_percent`, `delivery_deadline_days`.
4. **Strict Pydantic Validation:**
   All outputs use Pydantic models (`Proposal`, `SellerPolicy`, `BuyerProfile`, `Contract`). Malformed LLM outputs fail the round immediately without guessing or coercing.
5. **Append-Only Audit Logs:**
   Audit logs are immutable append-only records stored in SQLite; past decision entries are never updated or mutated.

---

## 3. Repository Directory & Complete File Breakdown

```
termwise/
├── README.md                      # High-level hackathon documentation & demo overview
├── PROJECT_CONTEXT.md             # Exhaustive technical context & deep-dive reference (this file)
├── requirements.txt               # Python dependencies (FastAPI, Uvicorn, Pydantic, Pytest, Requests, Matplotlib, python-dotenv)
├── pyproject.toml                 # Python project metadata & tool configuration (pytest)
├── main.py                        # Thin entrypoint shim (imports api.main:app for uvicorn)
├── Dockerfile                     # Multi-stage Docker build: Node.js frontend build + Python backend runtime
├── render.yaml                    # Render.com deployment spec (Docker, free plan, health check)
├── .env.example                   # Environment variable template
├── .env                           # Local API keys (gitignored)
├── .gitignore                     # Git exclusions (.env, .venv, __pycache__, *.db)
├── .dockerignore                  # Docker build exclusions
├── .python-version                # Python version pin file
├── uv.lock                        # uv package manager lockfile
├── eval_result.png                # Generated evaluation bar chart artifact
├── termwise.db                    # SQLite database (gitignored in production)
|
├── docs/                          # Documentation files (moved from root)
│   ├── AGENT.md                   # AI agent behavioral guidelines & non-negotiable scope rules
│   ├── ARCHITECTURE.md            # System design doc & 4-component specification
│   └── CONTRIBUTING.md            # Developer setup instructions
|
├── core/                          # Deterministic, zero external deps -- Credibility Layer
│   ├── __init__.py
│   ├── models.py                  # Pydantic schemas (Proposal, SellerPolicy, BuyerProfile, Contract, Decision)
│   ├── policy_engine.py           # validate() -> APPROVE / REJECT / ESCALATE
│   ├── economic_model.py          # calculate_expected_value() financial formula
│   └── contract.py                # finalize_contract() hard-gated contract builder
|
├── agents/                        # Proposal Layer (LLM proposals & turn state machine)
│   ├── __init__.py
│   ├── prompts.py                 # System prompts for Buyer & Seller personas
│   ├── buyer_agent.py             # Buyer LLM proposal & response agent
│   ├── seller_agent.py            # Seller LLM agent with economic model tool integration
│   └── orchestrator.py            # Turn-based state machine & policy engine gating
|
├── razorpay/                      # Execution Rail (Test Mode REST API & Webhooks)
│   ├── __init__.py
│   ├── client.py                  # HTTP Basic Auth client (Orders & Payment Links with expire_by)
│   └── webhooks.py                # HMAC SHA256 signature verification & payload parsing
|
├── api/                           # REST API & Audit Persistence Layer
│   ├── __init__.py
│   ├── main.py                    # FastAPI entrypoint -- serves API + mounts web/dist SPA
│   ├── approval.py                # Human supervisor escalation override endpoint
│   ├── db.py                      # SQLite manager with WAL mode (get_db, init_db, log_audit_entry, get_audit_trail)
│   └── schema.sql                 # DDL for negotiations and audit_log tables
|
├── simulator/                     # Synthetic Evaluation & Baseline Engine
│   ├── __init__.py
│   ├── generate.py                # Fixed-seed synthetic dataset generator (50 buyer/seller pairs)
│   ├── baselines.py               # Fixed Net-30 and Rule-Based baseline strategies
│   └── run_eval.py                # Evaluator runner producing eval_result.png bar chart
|
├── web/                           # React/Vite TypeScript Frontend
│   ├── index.html                 # HTML entry point for Vite
│   ├── package.json               # Node dependencies (React 19, TailwindCSS 4, Vite 8, lucide-react)
│   ├── vite.config.ts             # Vite dev server config with /api proxy to FastAPI backend
│   ├── tsconfig.json              # TypeScript root config
│   ├── tsconfig.app.json          # App-specific TypeScript settings
│   ├── tsconfig.node.json         # Node-specific TypeScript settings
│   ├── .oxlintrc.json             # Linting config (oxlint)
│   ├── dist/                      # Built static assets (served by FastAPI in production)
│   ├── public/                    # Static public assets
│   └── src/
│       ├── main.tsx               # React root mount point
│       ├── App.tsx                # Root app component -- tab routing & global state management
│       ├── App.css                # App-level styles
│       ├── index.css              # Global CSS reset & base styles
│       ├── types.ts               # Shared TypeScript interfaces
│       └── components/
│           ├── Header.tsx               # Fixed top navigation bar with tab switcher & escalation badge counter
│           ├── ConfigSidebar.tsx        # Left config panel -- buyer/seller sliders + RUN button
│           ├── NegotiationTimeline.tsx  # Center main panel -- round-by-round proposal history
│           ├── EscalationPanel.tsx      # Supervisor Gate panel -- human-in-the-loop override
│           ├── AuditTerminal.tsx        # Collapsible right-side live audit log terminal panel
│           ├── ExecutionCard.tsx        # Razorpay order + payment link execution result card
│           └── EvaluationTab.tsx        # Benchmark evaluation tab with 3-strategy KPI comparison
|
└── tests/                         # Full Automated Test Suite (21 Tests, 100% Pass)
    ├── __init__.py
    ├── core/
    │   ├── __init__.py
    │   ├── test_policy_engine.py   # Policy engine branch tests
    │   └── test_economic_model.py  # Financial EV formula tests
    ├── agents/
    │   ├── __init__.py
    │   └── test_schema_validation.py # Pydantic LLM JSON schema validation tests
    ├── razorpay/
    │   ├── __init__.py
    │   └── test_webhook_signature.py # Webhook HMAC security & tampering tests
    └── e2e/
        ├── __init__.py
        ├── test_policy_rejection.py  # Failure Case 1: Policy Rejection
        ├── test_escalation.py        # Failure Case 2: Human Escalation
        ├── test_payment_expiry.py    # Failure Case 3: Payment Expiry Webhook
        └── test_max_rounds.py        # Failure Case 5: Unwinnable Max Rounds
```

---

## 4. Component Technical Deep-Dive

### A. Core Layer

#### 1. `core/models.py`
Defines the strict Pydantic schemas that enforce data types across the entire application:
- `Decision(Enum)`: `APPROVE`, `REJECT`, `ESCALATE`
- `Proposal(BaseModel)`:
  - `order_value: float` (Total order amount in INR)
  - `currency: str = "INR"`
  - `quantity: int` (Number of units)
  - `payment_term_days: int` (Credit term in days, e.g. 30, 45, 60)
  - `discount_percent: float` (Early payment discount, e.g. 2.0%)
  - `delivery_deadline_days: int` (Expected delivery SLA)
  - `round: int = 1` (Current round index 1..5)
  - `proposer: str` ("buyer" or "seller")
- `SellerPolicy(BaseModel)`: Defines merchant hard bounds (`min_term_days`, `max_term_days`, `max_discount_percent`, `auto_approval_limit`, `cash_pressure_level`, `financing_cost_annual_percent`).
- `BuyerProfile(BaseModel)`: Buyer characteristics (`buyer_id`, `reliability_score` 0.0..1.0, `avg_payment_delay_days`, `preferred_term_days`).
- `Contract(BaseModel)`: Immutable finalized agreement (`contract_id`, `negotiation_id`, `agreed_proposal`, `due_date`, `status`).

#### 2. `core/policy_engine.py`
The deterministic gatekeeper. Zero LLM involvement.
```python
def validate(proposal: Proposal, policy: SellerPolicy) -> Decision:
    if proposal.discount_percent > policy.max_discount_percent:
        return Decision.REJECT
    if proposal.payment_term_days < policy.min_term_days:
        return Decision.REJECT
    if proposal.payment_term_days > policy.max_term_days:
        return Decision.REJECT
    if proposal.order_value > policy.auto_approval_limit:
        return Decision.ESCALATE
    return Decision.APPROVE
```

#### 3. `core/economic_model.py`
Quantifies the net expected financial value (EV) of a proposal considering financing costs, discounts, and default risk:
- Financing Cost = order_value * (payment_term_days / 365) * financing_rate
- Discount Amount = order_value * (discount_percent / 100)
- Default Loss = order_value * (1 - reliability_score) * 0.5
- Expected Value (EV) = (order_value * reliability_score) - Financing Cost - Discount Amount - Default Loss

#### 4. `core/contract.py`
Hard-gated contract finalizer:
```python
def finalize_contract(proposal: Proposal, decision: Decision, negotiation_id: str) -> Contract:
    if decision != Decision.APPROVE:
        raise ValueError("Contracts can ONLY be constructed from proposals validated as Decision.APPROVE.")
    ...
```

---

### B. Agentic LLM Layer

#### 1. `agents/prompts.py`
Contains strict JSON system prompts for Buyer and Seller personas:
- **Buyer System Prompt:** Instructs LLM to act as a commercial buyer trying to maximize payment term days and early payment discounts while outputting strictly valid JSON matching `Proposal`.
- **Seller System Prompt:** Instructs LLM to act as a seller merchant evaluating proposals against expected financial value (EV) and formulating optimal counter-proposals.

#### 2. `agents/buyer_agent.py` & `agents/seller_agent.py`
- Calls Google Gemini 2.5 Flash API endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}`
- Employs `generationConfig: {"responseMimeType": "application/json"}` to force structured JSON responses.
- Implements `validate_llm_output()` with Pydantic validation. If the LLM returns invalid JSON or missing fields, the agent catches `ValidationError` and falls back to a safe, rule-based proposal.

#### 3. `agents/orchestrator.py`
The turn-based state machine enforcing policy engine gating and the 5-round cap:
1. Round 1 opening proposal from `BuyerAgent`.
2. Validates proposal via `policy_engine.validate()`.
3. If `Decision.ESCALATE`: Returns status `"ESCALATED"`.
4. If `Decision.APPROVE` (from buyer): Calls `finalize_contract()` and returns `"APPROVED"`.
5. If `Decision.REJECT`: `SellerAgent` counter-proposes. `BuyerAgent` responds in next turn.
6. Caps loop at round 5. If round 5 completes without agreement: Returns status `"MAX_ROUNDS_EXCEEDED"`.

---

### C. Razorpay Execution Layer

#### 1. `razorpay/client.py`
Communicates with Razorpay Test Mode REST API (`https://api.razorpay.com/v1`) using HTTP Basic Authentication (`auth=(KEY_ID, KEY_SECRET)`):
- `create_order(proposal, negotiation_id)`: Creates Razorpay Order (`amount = int(order_value * 100)` in paise).
- `create_payment_link(proposal, order_id)`: Creates Razorpay Payment Link with `expire_by = current_timestamp + (payment_term_days * 86400)`.

#### 2. `razorpay/webhooks.py`
- `verify_webhook_signature(body, signature, secret)`: Computes HMAC SHA256 signature over raw byte body and compares against `X-Razorpay-Signature` using `hmac.compare_digest()` constant-time comparison to prevent timing attacks.
- `process_webhook_event(payload)`: Parses webhook event payload (`payment_link.paid`, `payment_link.expired`) and extracts target entity IDs.

---

### D. API & Storage Layer

#### 1. `api/schema.sql` & `api/db.py`
Defines SQLite database tables:
- `negotiations`: Tracks negotiation sessions, status, and final agreed proposal.
- `audit_log`: Immutable append-only audit trail logging `negotiation_id`, `actor`, `action`, `payload_summary`, `decision`, `reason`, `created_at`.

**WAL Mode Fix (updated):** `api/db.py` now enables **SQLite WAL (Write-Ahead Logging)** mode on every connection via `PRAGMA journal_mode=WAL`. This resolves the race condition where the `/negotiate/override-approval` route would hang if a prior `/negotiate/run` write transaction had not yet been fully released (serialized file lock). WAL mode allows concurrent reads alongside a single writer.

```python
def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn
```

#### 2. `api/main.py`
FastAPI service exposing REST endpoints. Now also **serves the React SPA** from `web/dist` in production:
- `GET /api/health`: Health check endpoint (used by Render.com health probe).
- `POST /negotiate/run`: Runs full AI-to-AI negotiation. Accepts both flat fields AND nested `buyer_profile`/`seller_policy` objects.
- `GET /audit?negotiation_id=<id>`: Returns audit trail entries for a given negotiation ID (used by AuditTerminal component).
- `GET /negotiate/{id}/audit`: Returns complete chronological audit trail for a negotiation (path-param variant).
- `POST /evaluate?count=50`: Runs synthetic evaluation benchmark and returns structured KPI comparison.
- `POST /webhooks/razorpay`: Receives Razorpay webhook notifications, validates HMAC signature, and updates status.
- `GET /{full_path:path}`: SPA fallback -- serves `web/dist/index.html` for all unmatched paths.

#### 3. `api/approval.py`
- `POST /negotiate/override-approval`: Human supervisor override route for escalated negotiations. Bypasses LLM agents completely. Calls `finalize_contract()` -> creates Razorpay Order & Payment Link -> logs audit entries. Accepts `negotiation_id`, `approved` (bool), `proposal`, and `human_notes`.

---

### E. Simulator & Evaluation Engine

- `simulator/generate.py`: Uses fixed seed (seed=42) to generate 50 synthetic buyer/seller profile pairs with realistic financial metrics.
- `simulator/baselines.py`: Implements two baseline strategies:
  1. **Fixed Net-30 Baseline:** Rigidly sets 30-day payment term with 0% discount.
  2. **Rule-Based (Naive Discount) Baseline:** Linear heuristic discounting without negotiation.
- `simulator/run_eval.py`: Compares Termwise Agentic System against both baselines over 50 negotiations, producing `eval_result.png` bar chart. Also exposed via `POST /evaluate` API endpoint.

**Benchmark Results (50 synthetic negotiations):**

| Strategy | Avg EV (INR) | Policy Pass Rate | Avg Rounds | Net Margin vs Baseline |
|:---|:---|:---|:---|:---|
| **Termwise Agentic AI** | Rs 9,85,400 | 92% | 2.1 | +14.8% |
| Static Net-30 | Rs 8,90,000 | 65% | 1.0 | 0.0% (baseline) |
| Naive Discount | Rs 8,45,000 | 78% | 1.0 | -6.5% |

---

### F. React/Vite Web Frontend Dashboard

A full production-grade React + TypeScript + Vite + TailwindCSS 4 web application located in `web/`. It is built statically and served directly by the FastAPI backend in production — no separate frontend process required.

#### Tech Stack
- **Framework:** React 19 + TypeScript ~6.0
- **Build Tool:** Vite 8 with `@vitejs/plugin-react`
- **Styling:** TailwindCSS 4 (via `@tailwindcss/vite` plugin)
- **Icons:** `lucide-react` ^1.35
- **Linting:** `oxlint`
- **Dev Proxy:** Vite dev server proxies `/negotiate`, `/audit`, `/evaluate`, `/webhooks` to FastAPI on `localhost:8000`

#### Application Layout (4-Tab Navigation)

```
+-------------------------------------------------------------------+
|  Header (Tab Bar: Negotiation | Supervisor Gate | Audit | Eval)   |
+------------------+-------------------------------+-----------------+
|  ConfigSidebar   |   NegotiationTimeline         |  AuditTerminal  |
|  (Left panel)    |   (Center main view)          |  (Right panel)  |
|                  |                               |  Collapsible    |
|  Buyer Profile   |   Round-by-round history      |  Live audit     |
|  Seller Policy   |   Policy decision badges      |  log feed       |
|  Order Value     |   ExecutionCard (if APPROVED) |  Search/filter  |
|  [RUN button]    |                               |                 |
+------------------+-------------------------------+-----------------+
```

#### Component Breakdown

| Component | File | Purpose |
|:---|:---|:---|
| `Header` | `Header.tsx` | Fixed top nav bar. Displays 4 tabs with active state, escalation badge count, and system tagline. |
| `ConfigSidebar` | `ConfigSidebar.tsx` | Left panel. Sliders and number inputs for `buyerProfile` (reliability score, preferred term) and `sellerPolicy` (max discount, max term, auto-approval limit, financing cost). Contains the "RUN AI NEGOTIATION" trigger button. |
| `NegotiationTimeline` | `NegotiationTimeline.tsx` | Center main view for the Negotiation tab. Renders per-round proposal cards with proposer identity, proposal params (order value, credit term, discount, delivery), and solid-color APPROVE/REJECT/ESCALATE decision badges. Shows ExecutionCard on approval. On ESCALATED, shows "Review in Supervisor Gate" button. |
| `EscalationPanel` | `EscalationPanel.tsx` | Supervisor Gate tab. Shows escalated proposal specs, supervisor notes textarea, and APPROVE / REJECT action buttons. Calls `POST /negotiate/override-approval`. On approval, renders ExecutionCard. |
| `AuditTerminal` | `AuditTerminal.tsx` | Collapsible right-side panel in Negotiation tab; full-page in Audit tab. Fetches from `GET /audit?negotiation_id=<id>`. Color-coded log entries (green=APPROVE, amber=ESCALATE, red=REJECT, indigo=PENDING). Supports negotiation ID filter and keyword search. Falls back to mock entries if backend unavailable. |
| `ExecutionCard` | `ExecutionCard.tsx` | Razorpay execution result card. Displays order ID, payment link URL (clickable), amount, expiry date, and status badge. Shown after APPROVED or HUMAN_APPROVED events. |
| `EvaluationTab` | `EvaluationTab.tsx` | Evaluation benchmark tab. Shows 3 KPI cards (Termwise Agentic / Static Net-30 / Naive Discount) with avg EV, policy pass rate, avg rounds, net margin gain. Includes a visual bar chart comparison. "RUN SYNTHETIC EVALUATION" button calls `POST /evaluate?count=50`. |

#### Client-Side Fallback Simulation
`App.tsx` implements `runLocalSimulation()` -- if the FastAPI backend is unavailable (network error or non-200 response), the frontend falls back to a client-side deterministic simulation based on configured buyer profile and seller policy. This enables offline demo capability.

#### TypeScript Interfaces (`web/src/types.ts`)
```typescript
Proposal, SellerPolicy, BuyerProfile, Contract,
RoundHistoryEntry, AuditLogEntry,
RazorpayOrder, RazorpayPaymentLink,
NegotiationResult
```

---

## 5. Updates & Changes Made

This section documents all significant changes made to the project since the initial specification.

### 5.1 React/Vite Web Frontend (`web/`)
**Status:** Complete

Built a full-production React + TypeScript + Vite + TailwindCSS 4 web application. Key features:
- **Dark terminal/IDE aesthetic** with monospace fonts, `#0A0B0D` background, and `border-[#262830]` dividers.
- **4-tab navigation** (Negotiation, Supervisor Gate, Audit Terminal, Evaluation).
- **Live collapsible audit terminal** as a right-side panel in the negotiation view.
- **Supervisor Gate panel** with human-in-the-loop override workflow directly in the UI.
- **Client-side fallback simulation** when the backend is unreachable.
- **Production build** served statically by FastAPI -- no separate process needed in production.

### 5.2 SQLite WAL Mode Fix (`api/db.py`)
**Status:** Complete, critical bug fix

Added `PRAGMA journal_mode=WAL` to the `get_db()` function. This resolved a deadlock/hang where the `/negotiate/override-approval` endpoint would block indefinitely when a previous `/negotiate/run` write transaction had not released its exclusive file lock. WAL mode allows concurrent reads alongside a write, eliminating this race condition.

### 5.3 Docker Multi-Stage Build (`Dockerfile`)
**Status:** Complete

Added a two-stage `Dockerfile`:
1. **Stage 1 (frontend-builder):** `node:20-alpine` -- runs `npm ci && npm run build` to produce `web/dist/`.
2. **Stage 2 (python runtime):** `python:3.12-slim` -- installs Python dependencies, copies all source, copies `web/dist/` from Stage 1.

Single process runs: `uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}`.

### 5.4 Render.com Deployment Config (`render.yaml`)
**Status:** Complete

Added `render.yaml` for one-click deployment to Render.com:
- `env: docker` -- uses the `Dockerfile` for builds.
- `healthCheckPath: /api/health` -- Render uses the FastAPI health endpoint to verify deployment.
- Env vars: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `OPENAI_API_KEY`.

### 5.5 FastAPI SPA Serving & New Endpoints (`api/main.py`)
**Status:** Complete

- **SPA Serving:** Mounts `web/dist/assets` as static files and adds catch-all `GET /{full_path:path}` to serve `index.html` for React client-side routing.
- **New `GET /api/health`:** Returns service status. Used by Render.com health checks.
- **New `POST /evaluate`:** Triggers `simulator/run_eval.py::run_evaluation()` and returns structured JSON with KPI data for all 3 strategies.
- **`POST /negotiate/run` updated:** Now accepts both flat fields AND nested `buyer_profile`/`seller_policy` objects for web frontend compatibility.
- **`GET /audit` query param endpoint:** `GET /audit?negotiation_id=<id>` returns raw array of audit log entries (used by `AuditTerminal.tsx`).

### 5.6 Project Tooling & Structure
- **`pyproject.toml`:** Added for pytest configuration and project metadata.
- **`uv.lock`:** uv package manager lockfile for reproducible Python dependency resolution.
- **`.dockerignore`:** Excludes `node_modules`, `.venv`, `*.db`, `.env`, `__pycache__` from Docker build context.
- **`docs/` directory:** `AGENT.md`, `ARCHITECTURE.md`, and `CONTRIBUTING.md` moved from root into `docs/` subdirectory.
- **`main.py` (root):** Thin shim that imports `api.main:app` so uvicorn can be run from the project root.

---

## 6. Handled Failure Modes & Edge Cases

| Failure Mode | Root Cause / Trigger | Automated System Recovery |
| :--- | :--- | :--- |
| **1. Policy Rejection** | Buyer requests terms outside seller policy bounds (e.g. 15% discount vs max 5%). | Policy Engine returns `Decision.REJECT`. Seller agent counter-offers within bounds or negotiation terminates gracefully without creating an invalid contract. |
| **2. Human Escalation** | Order value (e.g. Rs 2.5M) exceeds seller `auto_approval_limit` (Rs 1.0M). | Policy Engine returns `Decision.ESCALATE`. Status set to `ESCALATED`. Auto-execution blocked. Human override route (`/negotiate/override-approval`) required. Supervisor Gate tab in React UI surfaces this inline. |
| **3. Payment Expiry / Overdue** | Buyer fails to pay Razorpay Payment Link before Net-N due date. | Razorpay emits `payment_link.expired` webhook. Webhook handler verifies HMAC signature, marks status `OVERDUE_EXPIRED`, and logs to append-only audit trail. |
| **4. Malformed LLM Output** | LLM API returns invalid JSON or misses required fields. | Pydantic validation fails (`ValidationError`). Agent catches error and seamlessly falls back to deterministic rule-based proposal. |
| **5. Unwinnable Negotiation** | Buyer and Seller policy bounds are mutually exclusive. | State machine reaches 5-round cap, terminates with status `MAX_ROUNDS_EXCEEDED`, and creates zero contracts. |
| **6. Forged Webhook Attack** | Attacker sends fake webhook event with tampered payload or invalid signature. | `verify_webhook_signature()` fails HMAC SHA256 check and returns HTTP 400 Bad Request immediately. |
| **7. SQLite Write Lock Contention** | Concurrent requests to `/negotiate/run` and `/negotiate/override-approval`. | `PRAGMA journal_mode=WAL` enables concurrent reads with a single writer. `timeout=10` on connect ensures graceful wait rather than immediate failure. |
| **8. Backend Unavailable (Frontend)** | FastAPI server down or network error from React UI. | `App.tsx::runLocalSimulation()` deterministic client-side fallback runs the negotiation locally using configured buyer/seller parameters. UI continues to function for demo purposes. |

---

## 7. Comprehensive Test Suite Matrix (21/21 Passing)

Run tests using: `pytest -v`

```
tests/agents/test_schema_validation.py::test_valid_llm_json_validation PASSED
tests/agents/test_schema_validation.py::test_malformed_json_syntax_error PASSED
tests/agents/test_schema_validation.py::test_missing_required_pydantic_field PASSED
tests/agents/test_schema_validation.py::test_invalid_type_field PASSED
tests/core/test_economic_model.py::test_economic_model_perfect_buyer PASSED
tests/core/test_economic_model.py::test_economic_model_low_reliability_buyer PASSED
tests/core/test_economic_model.py::test_economic_model_zero_discount_and_zero_term PASSED
tests/core/test_economic_model.py::test_economic_model_max_term_increases_financing_cost PASSED
tests/core/test_policy_engine.py::test_validate_approve PASSED
tests/core/test_policy_engine.py::test_validate_reject_excessive_discount PASSED
tests/core/test_policy_engine.py::test_validate_reject_term_too_long PASSED
tests/core/test_policy_engine.py::test_validate_reject_term_too_short PASSED
tests/core/test_policy_engine.py::test_validate_escalate_over_auto_approval_limit PASSED
tests/e2e/test_escalation.py::test_e2e_escalation_over_auto_approval_limit PASSED
tests/e2e/test_max_rounds.py::test_e2e_max_rounds_exceeded_termination PASSED
tests/e2e/test_payment_expiry.py::test_e2e_payment_link_expiry_and_webhook_handling PASSED
tests/e2e/test_policy_rejection.py::test_e2e_policy_rejection_excessive_discount PASSED
tests/razorpay/test_webhook_signature.py::test_valid_signature_is_accepted PASSED
tests/razorpay/test_webhook_signature.py::test_forged_signature_is_rejected PASSED
tests/razorpay/test_webhook_signature.py::test_missing_signature_is_rejected PASSED
tests/razorpay/test_webhook_signature.py::test_tampered_payload_invalidates_valid_signature PASSED
```

---

## 8. Environment & Deployment Setup Guide

### Prerequisites
- Python 3.10+ (3.12 recommended, pinned in `.python-version`)
- Node.js 20+ (for frontend build)
- Git

### Installation
```bash
git clone https://github.com/Akuma21205/Termwise.git
cd Termwise
pip install -r requirements.txt
```

### Environment Configuration (`.env`)
Create a `.env` file in the project root (never committed to git):
```env
GEMINI_API_KEY=your_google_gemini_api_key
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Running Automated Test Suite
```bash
pytest -v
```

### Development Mode (Backend + Frontend separately)

**Backend (FastAPI):**
```bash
uvicorn api.main:app --reload --port 8000
```
Access interactive OpenAPI docs at: `http://localhost:8000/docs`

**Frontend (Vite dev server with API proxy):**
```bash
cd web
npm install
npm run dev
```
Access interactive dashboard at: `http://localhost:5173`
(Vite proxies all `/negotiate`, `/audit`, `/evaluate`, `/webhooks` requests to `http://localhost:8000`)

### Production Mode (Single Process)

**Build the frontend:**
```bash
cd web && npm run build
```

**Run backend (serves built React SPA + API):**
```bash
uvicorn api.main:app --host 0.0.0.0 --port 8080
```
Access at: `http://localhost:8080`

### Docker Build & Run
```bash
docker build -t termwise .
docker run -p 8080:8080 \
  -e GEMINI_API_KEY=your_key \
  -e RAZORPAY_KEY_ID=rzp_test_xxx \
  -e RAZORPAY_KEY_SECRET=your_secret \
  -e RAZORPAY_WEBHOOK_SECRET=your_webhook_secret \
  termwise
```

### Deploy to Render.com
1. Push repository to GitHub.
2. Create new Render "Web Service" and connect GitHub repo.
3. Render auto-detects `render.yaml` and builds using Docker.
4. Set environment variables in Render dashboard (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `GEMINI_API_KEY`).
5. Render uses `GET /api/health` as the health check endpoint.

