# Termwise — AI-to-AI B2B Payment Negotiator
## Project Context, Architecture, & Technical Specification

> **Built for:** Razorpay AI Buildathon 2026 — Track 1 (AI Growth & Agentic Commerce)  
> **Core Principle:** *LLM proposes. Policy decides. Razorpay executes. Data learns.*

---

## 1. Problem Statement & High-Level Goals

SMEs selling to large enterprise buyers routinely get forced into unfavorable payment credit terms (Net-60, Net-90) because they lack negotiating leverage and cannot easily quantify what extended credit terms actually cost in financing and risk.

**Termwise** is an agentic commercial platform where a buyer-side AI agent and a seller-side AI agent negotiate B2B payment terms (order value, quantity, payment credit term days, early payment discount %, delivery deadline) inside hard financial policy bounds set by the seller merchant.

Upon reaching agreement:
1. The agreement is validated by a **deterministic Policy Engine** (never the LLM).
2. It is converted into a structured contract.
3. It triggers **Razorpay Test-Mode payment lifecycle execution** (Order creation → Payment Link creation with `expire_by = payment_term_days` due-date expiry → webhook-driven settlement tracking).
4. Every negotiation step, policy check, and execution event is logged in an **append-only audit trail**.

---

## 2. Non-Negotiable Architectural Principles

1. **Zero LLM Execution Authority Over Money:**  
   LLMs (Buyer and Seller agents) ONLY produce structured `Proposal` objects. Every proposal—without exception—must pass through `core/policy_engine.py::validate()` before it can become a contract or touch Razorpay.
2. **Minimal 4-Component Boundary:**  
   The system strictly consists of 4 components:
   - **Buyer Agent** (LLM)
   - **Seller Agent** (LLM calling Economic Model as a tool)
   - **Policy Engine** (Pure Python, deterministic)
   - **Economic Model** (Pure Python math formula)  
   No extraneous agent nodes (e.g., Risk Agent, Contract Agent, Execution Agent) exist; these are functions and DB writes.
3. **Capped Negotiation Protocol:**  
   Negotiations are strictly capped at **max 5 rounds**. No infinite reasoning loops. Negotiable fields are strictly: `price/order_value`, `quantity`, `payment_term_days`, `discount_percent`, `delivery_deadline_days`.
4. **Strict Pydantic Validation:**  
   All outputs use Pydantic models (`Proposal`, `SellerPolicy`, `BuyerProfile`, `Contract`). Malformed LLM outputs fail the round immediately without guessing or coercing.
5. **Append-Only Audit Logs:**  
   Audit logs are immutable append-only records; past decision entries are never updated or mutated.

---

## 3. Directory & Repository Layout

```
termwise/
├── README.md
├── ARCHITECTURE.md
├── AGENT.md
├── CONTRIBUTING.md
├── PROJECT_CONTEXT.md            # Comprehensive architecture & context document
├── requirements.txt
├── .env.example
├── .env                          # Real API keys (GEMINI_API_KEY, RAZORPAY_API_KEY, RAZORPAY_KEY_SECRET)
├── .gitignore
│
├── core/                         # Pure Python, deterministic, unit-tested core layer
│   ├── __init__.py
│   ├── models.py                 # Pydantic schemas: Proposal, SellerPolicy, BuyerProfile, Contract, Decision
│   ├── policy_engine.py          # validate(proposal, policy) -> APPROVE / REJECT / ESCALATE
│   └── economic_model.py         # score(proposal, buyer, policy) -> expected_value
│
├── agents/                       # LLM proposal layer (Google Gemini 2.5 Flash + fallback)
│   ├── __init__.py
│   ├── buyer_agent.py            # Buyer LLM proposal & counter-proposal logic
│   ├── seller_agent.py           # Seller LLM logic (calls economic_model as tool)
│   ├── prompts.py                # System prompts for Buyer and Seller personas
│   └── orchestrator.py           # Negotiation state machine: 5-round cap & policy engine gating
│
├── razorpay/                     # Razorpay Test Mode execution rail
│   ├── __init__.py
│   ├── client.py                 # create_order(), create_payment_link() with expire_by
│   └── webhooks.py               # HMAC SHA256 signature verification & payload parsing
│
├── api/                          # FastAPI REST API & SQLite storage
│   ├── __init__.py
│   ├── main.py                   # App entrypoint, /negotiate/run, /audit, /webhooks/razorpay
│   ├── db.py                     # SQLite manager & append-only audit trail logger
│   └── schema.sql                # DDL for negotiations & audit_log tables
│
├── simulator/                    # Synthetic data generator & strategy evaluation
│   ├── __init__.py
│   ├── generate.py               # Fixed-seed generator (50 synthetic buyer/seller pairs)
│   ├── baselines.py              # Baseline strategies: Fixed Net-30 & Rule-Based
│   └── run_eval.py               # Evaluation runner producing eval_result.png bar chart
│
├── frontend/                     # Streamlit demo surface
│   └── app.py                    # Live negotiation UI, policy badges, audit trail & eval chart
│
└── tests/                        # Comprehensive test suite (16 tests, 100% passing)
    ├── core/
    │   ├── test_policy_engine.py
    │   └── test_economic_model.py
    ├── agents/
    │   └── test_schema_validation.py
    └── e2e/
        ├── test_policy_rejection.py # Failure Case 1
        ├── test_escalation.py       # Failure Case 2
        └── test_payment_expiry.py   # Failure Case 3
```

---

## 4. Component Technical Specifications & Working Mechanisms

### A. Data Schemas (`core/models.py`)
- **`Decision` (Enum):** `APPROVE`, `REJECT`, `ESCALATE`
- **`Proposal` (BaseModel):**
  - `order_value: float` (e.g., 1,000,000.0)
  - `currency: str = "INR"`
  - `quantity: int` (e.g., 500)
  - `payment_term_days: int` (e.g., 45)
  - `discount_percent: float` (e.g., 0.5)
  - `delivery_deadline_days: int` (e.g., 14)
  - `round: int = 1` (1 to 5)
  - `proposer: str` ("buyer" or "seller")
- **`SellerPolicy` (BaseModel):** `min_term_days`, `max_term_days`, `max_discount_percent`, `auto_approval_limit`, `cash_pressure_level`, `financing_cost_annual_percent`.
- **`BuyerProfile` (BaseModel):** `buyer_id`, `reliability_score` (0.0 to 1.0), `avg_payment_delay_days`, `preferred_term_days`.

### B. Deterministic Policy Engine (`core/policy_engine.py`)
Validates candidate proposals against seller policy bounds without calling any LLM:
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

### C. Economic Evaluation Model (`core/economic_model.py`)
Scores the expected net financial value of a proposal:
$$\text{Expected Value} = (\text{order\_value} \times P_{\text{on\_time}}) - \left(\text{order\_value} \times \frac{\text{term}}{365} \times \text{financing\_rate}\right) - (\text{order\_value} \times \text{discount}) - (\text{order\_value} \times (1 - P_{\text{on\_time}}) \times \text{loss\_factor})$$

### D. LLM Agents (`agents/buyer_agent.py`, `agents/seller_agent.py`)
- Integrated with **Google Gemini 2.5 Flash API** using `responseMimeType: "application/json"`.
- Requests structured JSON matching `Proposal` schema.
- Uses `validate_llm_output()` to strictly validate LLM output via Pydantic.
- Falls back to deterministic rule-based proposals if LLM API is unavailable or returns invalid JSON.

### E. Negotiation Orchestrator (`agents/orchestrator.py`)
- State machine managing turn-based negotiation between `BuyerAgent` and `SellerAgent`.
- Validates every proposal using `policy_engine.validate()`.
- Caps negotiations at 5 rounds maximum.
- Returns status (`APPROVED`, `REJECTED`, `ESCALATED`, or `MAX_ROUNDS_EXCEEDED`) along with full round-by-round audit log.

### F. Razorpay Test Mode Integration (`razorpay/client.py`, `razorpay/webhooks.py`)
- **`create_order()`:** Creates Razorpay Order in test mode with amount in paise (`int(order_value * 100)`).
- **`create_payment_link()`:** Creates Razorpay Payment Link with `expire_by = now + (payment_term_days * 86400)`.
- **`verify_webhook_signature()`:** Verifies Razorpay `X-Razorpay-Signature` HMAC SHA256 header using constant-time comparison.

---

## 5. Three Key Failure Cases Handled

1. **Failure Case 1: Policy Rejection**  
   - *Trigger:* Buyer proposes terms outside seller bounds (e.g., 15% discount vs max 5%).  
   - *Handling:* Policy engine returns `Decision.REJECT`. Seller agent counter-offers within bounds or negotiation terminates gracefully without invalid contract creation.
2. **Failure Case 2: Human Escalation**  
   - *Trigger:* Order value exceeds seller `auto_approval_limit` (e.g., ₹2.5M order vs ₹1.0M limit).  
   - *Handling:* Policy engine returns `Decision.ESCALATE`. Status set to `ESCALATED`, routing transaction to human review and blocking automated Razorpay execution.
3. **Failure Case 3: Payment Link Expiry / Overdue**  
   - *Trigger:* Payment link reaches `expire_by` due date unpaid. Razorpay emits `payment_link.expired` webhook.  
   - *Handling:* Webhook handler validates signature, updates status to `OVERDUE_EXPIRED`, and logs record to append-only audit trail.

---

## 6. Test Suite & Verification Examples

The codebase includes 16 automated tests across `tests/core/`, `tests/agents/`, and `tests/e2e/` (100% passing).

### Example 1: Unit Test for Policy Engine (`tests/core/test_policy_engine.py`)
```python
def test_validate_reject_excessive_discount():
    policy = SellerPolicy(max_discount_percent=5.0)
    proposal = Proposal(
        order_value=500000.0,
        quantity=200,
        payment_term_days=30,
        discount_percent=10.0,  # Breaches 5% limit
        delivery_deadline_days=10,
        proposer="buyer"
    )
    assert validate(proposal, policy) == Decision.REJECT
```

### Example 2: End-to-End Escalation Test (`tests/e2e/test_escalation.py`)
```python
def test_e2e_escalation_over_auto_approval_limit():
    policy = SellerPolicy(auto_approval_limit=1000000.0)
    buyer = BuyerProfile(buyer_id="B_LARGE", preferred_term_days=45)
    
    status, history, proposal = run_negotiation_loop(
        buyer_profile=buyer,
        seller_policy=policy,
        order_value=2500000.0,  # Exceeds limit
        max_rounds=5
    )
    
    assert status == "ESCALATED"
    assert history[0]["decision"] == Decision.ESCALATE.value
```

### Example 3: End-to-End Payment Expiry Test (`tests/e2e/test_payment_expiry.py`)
```python
def test_e2e_payment_link_expiry_and_webhook_handling():
    init_db()
    rzp = RazorpayClient()
    proposal = Proposal(order_value=500000.0, quantity=200, payment_term_days=30, discount_percent=1.0, delivery_deadline_days=10, proposer="seller")
    
    order = rzp.create_order(proposal, "neg_expiry_001")
    plink = rzp.create_payment_link(proposal, order["id"])
    
    # Simulate webhook event
    payload = {"event": "payment_link.expired", "payload": {"payment_link": {"entity": {"id": plink["id"]}}}}
    event_name, target_id, _ = process_webhook_event(payload)
    
    log_audit_entry("neg_expiry_001", "razorpay_webhook", event_name, f"Link {target_id} expired", "OVERDUE_EXPIRED", "Expired unpaid")
    trail = get_audit_trail("neg_expiry_001")
    assert trail[-1]["decision"] == "OVERDUE_EXPIRED"
```

---

## 7. How to Run the Project

1. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
2. **Configure Environment (`.env`):**
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   RAZORPAY_API_KEY=rzp_test_xxxxxxxxx
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   ```
3. **Run Test Suite:**
   ```bash
   pytest -v
   ```
4. **Launch FastAPI Backend:**
   ```bash
   uvicorn api.main:app --reload
   ```
5. **Launch Streamlit Demo Dashboard:**
   ```bash
   streamlit run frontend/app.py
   ```
