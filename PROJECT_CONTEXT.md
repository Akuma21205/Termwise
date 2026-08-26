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
   - [Streamlit Frontend Dashboard](#f-streamlit-frontend-dashboard)
5. [Handled Failure Modes & Edge Cases](#5-handled-failure-modes--edge-cases)
6. [Comprehensive Test Suite Matrix (21/21 Passing)](#6-comprehensive-test-suite-matrix-2121-passing)
7. [Environment & Deployment Setup Guide](#7-environment--deployment-setup-guide)

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
3. It triggers **Razorpay Test-Mode payment lifecycle execution** (Order creation → Payment Link creation with `expire_by = payment_term_days` due-date expiry → webhook-driven settlement tracking).
4. Every negotiation step, policy check, human override, and execution event is logged in an **append-only audit trail**.

---

## 2. Non-Negotiable System Invariants

1. **Zero LLM Execution Authority Over Money:**  
   LLMs (Buyer and Seller agents) ONLY produce structured `Proposal` objects. Every proposal—without exception—must pass through `core/policy_engine.py::validate()` before it can become a contract or touch Razorpay.
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
├── ARCHITECTURE.md                # System design doc & 4-component specification
├── AGENT.md                       # Non-negotiable AI guidelines & scope guardrails
├── CONTRIBUTING.md                # Setup instructions & developer guide
├── PROJECT_CONTEXT.md             # Exhaustive technical context & deep-dive reference
├── requirements.txt               # Dependencies (FastAPI, Streamlit, Pydantic, Pytest, Requests, Matplotlib)
├── .env.example                   # Environment variable template
├── .env                           # Local API keys (gitignored)
├── .gitignore                     # Git exclusions (.env, .venv, __pycache__, *.db)
│
├── core/                          # Deterministic, zero external deps — Credibility Layer
│   ├── __init__.py
│   ├── models.py                  # Pydantic schemas (Proposal, SellerPolicy, BuyerProfile, Contract, Decision)
│   ├── policy_engine.py           # validate() -> APPROVE / REJECT / ESCALATE
│   ├── economic_model.py          # calculate_expected_value() financial formula
│   └── contract.py                # finalize_contract() hard-gated contract builder
│
├── agents/                        # Proposal Layer (LLM proposals & turn state machine)
│   ├── __init__.py
│   ├── prompts.py                 # System prompts for Buyer & Seller personas
│   ├── buyer_agent.py             # Buyer LLM proposal & response agent
│   ├── seller_agent.py            # Seller LLM agent with economic model tool integration
│   └── orchestrator.py            # Turn-based state machine & policy engine gating
│
├── razorpay/                      # Execution Rail (Test Mode REST API & Webhooks)
│   ├── __init__.py
│   ├── client.py                  # HTTP Basic Auth client (Orders & Payment Links with expire_by)
│   └── webhooks.py                # HMAC SHA256 signature verification & payload parsing
│
├── api/                           # REST API & Audit Persistence Layer
│   ├── __init__.py
│   ├── main.py                    # FastAPI entrypoint (/negotiate/run, /audit, /webhooks/razorpay)
│   ├── approval.py                # Human supervisor escalation override endpoint
│   ├── db.py                      # SQLite database manager & audit trail logger
│   └── schema.sql                 # DDL for negotiations and audit_log tables
│
├── simulator/                     # Synthetic Evaluation & Baseline Engine
│   ├── __init__.py
│   ├── generate.py                # Fixed-seed synthetic dataset generator (50 buyer/seller pairs)
│   ├── baselines.py               # Fixed Net-30 and Rule-Based baseline strategies
│   └── run_eval.py                # Evaluator runner producing eval_result.png bar chart
│
├── frontend/                      # User Interface Layer
│   └── app.py                     # Streamlit web dashboard with 3 interactive tabs
│
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
Quantifies the net expected financial value ($EV$) of a proposal considering financing costs, discounts, and default risk:
$$\text{Financing Cost} = \text{order\_value} \times \left(\frac{\text{payment\_term\_days}}{365}\right) \times \text{financing\_rate}$$
$$\text{Discount Amount} = \text{order\_value} \times \left(\frac{\text{discount\_percent}}{100}\right)$$
$$\text{Default Loss} = \text{order\_value} \times (1 - \text{reliability\_score}) \times 0.5$$
$$\text{Expected Value } (EV) = (\text{order\_value} \times \text{reliability\_score}) - \text{Financing Cost} - \text{Discount Amount} - \text{Default Loss}$$

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
- **Seller System Prompt:** Instructs LLM to act as a seller merchant evaluating proposals against expected financial value ($EV$) and formulating optimal counter-proposals.

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

#### 2. `api/main.py`
FastAPI service exposing REST endpoints:
- `POST /negotiate/run`: Runs full AI-to-AI negotiation, executes policy engine checks, triggers Razorpay execution if approved, and logs all audit trail entries.
- `GET /negotiate/{id}/audit`: Returns complete chronological audit trail for a negotiation.
- `POST /webhooks/razorpay`: Receives Razorpay webhook notifications, validates HMAC signature, and updates status.

#### 3. `api/approval.py`
- `POST /negotiate/override-approval`: Human supervisor override route for escalated negotiations. Bypasses LLM agents completely. Calls `finalize_contract()` → creates Razorpay Order & Payment Link → logs audit entries.

---

### E. Simulator & Evaluation Engine

- `simulator/generate.py`: Uses fixed seed (seed=42) to generate 50 synthetic buyer/seller profile pairs with realistic financial metrics.
- `simulator/baselines.py`: Implements two baseline strategies:
  1. **Fixed Net-30 Baseline:** Rigidly sets 30-day payment term with 0% discount.
  2. **Rule-Based Baseline:** Linear heuristic discounting.
- `simulator/run_eval.py`: Compares Termwise Agentic System against both baselines over 50 negotiations, producing `eval_result.png` bar chart demonstrating higher average expected financial value ($EV$).

---

### F. Streamlit Frontend Dashboard

[frontend/app.py](file:///c:/Users/shash/Termwise/frontend/app.py) provides an interactive Streamlit UI with 3 tabs:
1. **🚀 Live Negotiation Demo:** Live control panel for buyer reliability, order value, and seller policy bounds. Renders round-by-round proposals, policy badges, and clickable Razorpay payment link.
2. **📜 Append-Only Audit Trail:** Searchable dataframe view of the SQLite immutable audit log.
3. **📊 Evaluation Chart:** Interactive evaluation runner displaying `eval_result.png`.

---

## 5. Handled Failure Modes & Edge Cases

| Failure Mode | Root Cause / Trigger | Automated System Recovery |
| :--- | :--- | :--- |
| **1. Policy Rejection** | Buyer requests terms outside seller policy bounds (e.g. 15% discount vs max 5%). | Policy Engine returns `Decision.REJECT`. Seller agent counter-offers within bounds or negotiation terminates gracefully without creating an invalid contract. |
| **2. Human Escalation** | Order value (e.g. ₹2.5M) exceeds seller `auto_approval_limit` (₹1.0M). | Policy Engine returns `Decision.ESCALATE`. Status set to `ESCALATED`. Auto-execution blocked. Human override route (`/negotiate/override-approval`) required. |
| **3. Payment Expiry / Overdue** | Buyer fails to pay Razorpay Payment Link before Net-N due date. | Razorpay emits `payment_link.expired` webhook. Webhook handler verifies HMAC signature, marks status `OVERDUE_EXPIRED`, and logs to append-only audit trail. |
| **4. Malformed LLM Output** | LLM API returns invalid JSON or misses required fields. | Pydantic validation fails (`ValidationError`). Agent catches error and seamlessly falls back to deterministic rule-based proposal. |
| **5. Unwinnable Negotiation** | Buyer and Seller policy bounds are mutually exclusive. | State machine reaches 5-round cap, terminates with status `MAX_ROUNDS_EXCEEDED`, and creates zero contracts. |
| **6. Forged Webhook Attack** | Attacker sends fake webhook event with tampered payload or invalid signature. | `verify_webhook_signature()` fails HMAC SHA256 check and returns HTTP 400 Bad Request immediately. |

---

## 6. Comprehensive Test Suite Matrix (21/21 Passing)

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

## 7. Environment & Deployment Setup Guide

### Prerequisites
- Python 3.10+
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
RAZORPAY_API_KEY=rzp_test_xxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

### Running Automated Test Suite
```bash
pytest -v
```

### Launching FastAPI Backend Server
```bash
uvicorn api.main:app --reload
```
Access interactive OpenAPI docs at: `http://localhost:8000/docs`

### Launching Streamlit Web App Dashboard
```bash
streamlit run frontend/app.py
```
Access interactive dashboard at: `http://localhost:8501`
