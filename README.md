# AI-to-AI B2B Payment Negotiator

Built for the **Razorpay AI Buildathon 2026 — Track 1 (AI Growth & Agentic Commerce)**.

> LLM proposes. Policy decides. Razorpay executes. Data learns.

## The problem

SMEs selling to large enterprise buyers routinely get forced into unfavorable payment
terms (Net-60, Net-90) because they lack negotiating leverage — and because nobody on
the sales side actually quantifies what that term *costs* before agreeing to it.

## What this is

A buyer-side and seller-side AI agent negotiate B2B payment terms (price, discount,
due-days, delivery) inside hard financial guardrails set by the seller. The moment an
agreement is reached, it's validated by a deterministic policy engine (never the LLM),
converted into a structured contract, and pushed into Razorpay's payment lifecycle
(Order → Payment Link with a due-by expiry → webhook-driven settlement tracking).

This is **not** two LLMs chatting. The negotiation is bounded, every money-relevant
decision is policy-gated, and every step is auditable. See `ARCHITECTURE.md` for why
that separation exists and how it's enforced.

## Demo story (~90 seconds)

1. SME gets a ₹10L order. Buyer agent opens with Net-60.
2. Seller agent reasons over the buyer's payment-reliability history + seller's cash
   pressure, and counters with Net-30 + 1% early-payment discount.
3. A couple rounds of counter-offers happen — negotiation resolves to Net-45 + 0.5%.
4. Policy engine visibly validates the agreement against seller-configured limits.
5. Razorpay Order + Payment Link (expiry = due date) is created live in test mode.
6. Audit trail + one baseline comparison chart (agentic vs fixed-Net-30) on screen.

## Repo layout

```
/agents        buyer_agent.py, seller_agent.py — LLM negotiation logic (proposal-only, no execution rights)
/core           policy_engine.py, economic_model.py — deterministic, unit-tested, LLM never touches these
/razorpay       order + payment-link + webhook integration (test mode only)
/simulator      synthetic buyer/seller/negotiation generator + baseline comparisons
/api            FastAPI app tying it together
/frontend       lightweight demo UI (Streamlit or React — see ARCHITECTURE.md)
/tests
```

## Quickstart

```bash
# backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in LLM API key + Razorpay test keys
uvicorn api.main:app --reload

# run the policy engine + economic model unit tests first — these are the core
pytest tests/core -v

# run a sample negotiation
python -m simulator.run_single --buyer B001 --seller S001
```

## Status

Early build — see `ARCHITECTURE.md` for the locked MVP scope and what's intentionally
cut for the hackathon window (full spec history in project notes, not in this repo).

## Track fit

Razorpay's stated Track 1 bar: every money action explainable, bounded, gated; audit
trail visible; at least one failure handled gracefully. That bar drives every
architectural decision here — see `ARCHITECTURE.md` §"Design principle".
