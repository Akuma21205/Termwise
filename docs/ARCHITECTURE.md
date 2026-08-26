# Architecture

## Design principle (non-negotiable)

```
LLM (Buyer/Seller Agent)
        │  proposes
        ▼
Structured proposal (schema-validated)
        │
        ▼
Deterministic Policy Engine   ← pure Python, no LLM, unit-tested
        │
   ┌────┴────┐
   ▼         ▼
APPROVE    REJECT / ESCALATE
   │
   ▼
Structured Contract → Razorpay execution → Audit log
```

The LLM never has execution authority over money. It only ever produces a proposal
object. Every proposal — whichever agent produced it — passes through the policy
engine before anything gets written to the contract or sent to Razorpay. If you're
adding a feature and it routes a money decision through the LLM without going through
`core/policy_engine.py`, stop — that's the one rule this whole project exists to prove
we didn't break.

## Components (deliberately minimal — 4, not 9)

| Component | Type | Why it exists |
|---|---|---|
| Buyer Agent | LLM | Reasons over buyer's own constraints (target term, budget, urgency) and produces/evaluates proposals |
| Seller Agent | LLM | Reasons over seller cash-flow pressure + buyer risk, calls the economic model as a tool, produces/evaluates proposals |
| Policy Engine | deterministic | Hard-rejects/escalates anything outside seller-configured bounds. No LLM involved, ever |
| Economic Model | deterministic | Scores a proposal's expected value; seller agent calls this as a tool rather than reasoning about numbers itself |

Cut on purpose: separate "Risk Model," "Contract Generator," "Execution Agent," "Audit
Service" as distinct agentic components — these are functions and DB writes, not
agents. Don't resurrect them just because the framework makes it easy to add a node.
If you think you need a 5th agent, write down what deterministic function would
replace it first, and only proceed if you have a real answer for why it needs
reasoning under uncertainty rather than a lookup/formula.

## Negotiation protocol

Negotiable fields only: `price`, `quantity`, `payment_term_days`, `discount_percent`,
`delivery_deadline_days`. Nothing else. Max negotiation rounds: 5 — if no agreement by
round 5, terminate and escalate to human review (this is one of your three failure
cases, don't let it silently loop).

Structured proposal schema (both agents emit this, never free text past this point):

```json
{
  "order_value": 1000000,
  "currency": "INR",
  "quantity": 500,
  "payment_term_days": 45,
  "discount_percent": 0.5,
  "delivery_deadline_days": 14,
  "round": 3,
  "proposer": "seller"
}
```

## Policy engine (core/policy_engine.py)

```python
def validate(proposal: Proposal, policy: SellerPolicy) -> Decision:
    if proposal.discount_percent > policy.max_discount:
        return Decision.REJECT
    if proposal.payment_term_days < policy.min_term_days:
        return Decision.REJECT
    if proposal.payment_term_days > policy.max_term_days:
        return Decision.REJECT
    if proposal.order_value > policy.auto_approval_limit:
        return Decision.ESCALATE
    return Decision.APPROVE
```

Seller policy fields (the whole seller "persona" — don't overbuild this):
`min_term_days`, `max_term_days`, `max_discount_percent`, `auto_approval_limit`,
`cash_pressure_level`, `financing_cost_annual_percent`.

## Economic model (core/economic_model.py)

```
expected_value = order_value * on_time_prob
                - order_value * (payment_term_days / 365) * financing_cost_annual
                - order_value * discount_percent
                - order_value * (1 - on_time_prob) * default_loss_factor
```

`on_time_prob` is a heuristic derived from the buyer's historical average delay — not
a trained model. Say so plainly in the demo/README; don't imply ML sophistication that
isn't there. `default_loss_factor` is a configurable constant (start at 0.15).

## Buyer/seller data model

Buyer: `reliability_score` (or raw `avg_payment_delay_days` + `on_time_rate`),
`preferred_term_days`, `relationship_history`.
Seller: the policy fields above. That's the entire persona layer — resist the urge to
add procurement-department lore, budget cycles, etc. It doesn't change the demo.

## Razorpay integration (verify against current docs before building — do not assume)

Mapping used here:

```
Agreement reached
     ↓
Razorpay Order created (amount = order_value)
     ↓
Payment Link created, expire_by = now + payment_term_days
     ↓
[demo] simulate outcome: pay via test card (happy path) OR let link expire (late/default path)
     ↓
Webhook (signature-verified) updates transaction status
     ↓
Audit log entry written
```

Important: Razorpay is a payment rail, not an accounts-receivable system — it does not
natively track "Net-45 term" semantics the way an ERP would. **This system owns the
due-date/term state machine**; Razorpay only executes the actual payment event. Don't
architect around Razorpay "knowing" the term — that's a false assumption that will
break your demo if you build on it without checking the live docs first.

## Audit trail

Every negotiation round, policy decision, and Razorpay event gets one row:
`timestamp, actor, action, payload_summary, decision, reason`. Expose decision
factors and policy checks in the UI — never raw chain-of-thought.

## Failure handling (3 cases, not 7 — pick these and make them visible in the demo)

1. **Policy rejection** — buyer proposes terms outside seller bounds → policy engine
   rejects → seller agent replans within one more round.
2. **Escalation** — transaction value exceeds `auto_approval_limit` → routes to human
   approval state, does not auto-execute.
3. **Razorpay-side failure** — payment link expires unpaid → system marks the
   transaction overdue and logs it, doesn't silently drop state.

## Evaluation (keep it to one chart)

Synthetic dataset: 50–100 generated negotiations (not 1,000+ — that's simulator-building
time you don't have). Compare three approaches on **expected value per negotiation**:
fixed Net-30 baseline, simple rule-based baseline (`if reliability > threshold: Net-60
else Net-30`), and the agentic system. One bar chart. That's the whole eval story —
don't build a metrics dashboard nobody asked for.

## Tech stack (fill in once decided — model/framework are explicitly not mandated by
Razorpay, so choose on evidence, not brand)

- Backend: Python, FastAPI
- LLM: TBD — evaluate on structured-output reliability + tool-calling, not vibes
- Agent orchestration: plain state machine unless LangGraph's conditional-transition
  handling actually earns its complexity — don't add it by default
- DB: SQLite for the hackathon (Postgres if there's time pressure to look "production")
- Frontend: Streamlit unless there's spare time for React — backend is the point
- Payments: Razorpay Test Mode only
