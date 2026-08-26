# Agent instructions (for AI coding assistants working in this repo)

Read `ARCHITECTURE.md` before writing any code that touches `core/`, `agents/`, or
`razorpay/`. This file is the fast-reference version — architecture.md is the source
of truth if they ever disagree.

## The one rule that matters

**The LLM never gets execution authority over money.** Buyer/Seller agents only
produce structured `Proposal` objects. Every proposal — no exceptions — must pass
through `core/policy_engine.py::validate()` before it becomes a contract or touches
Razorpay. If a task seems to require the LLM to approve, reject, or execute a
transaction directly, that's a sign the task is mis-scoped — route it through the
policy engine instead and flag it back rather than quietly implementing a bypass.

## Scope discipline

This is a hackathon MVP with one active builder and an unconfirmed deadline. Default
to the smallest correct implementation. Concretely:

- 4 components only: Buyer Agent, Seller Agent, Policy Engine, Economic Model. Don't
  add a new "agent" (risk agent, contract agent, audit agent, etc.) without first
  writing down why a plain function/DB write can't do it — see ARCHITECTURE.md.
- Don't add a framework (LangGraph, CrewAI, etc.) unless the task genuinely needs
  stateful multi-turn orchestration that a simple loop/state machine can't express
  cleanly. Ask before introducing a new dependency of this weight.
- Negotiation is capped at 5 rounds. No infinite loops, no "keep trying until it
  works" reasoning loops.
- Synthetic dataset target is 50–100 records, not 1,000+. Don't build a heavyweight
  simulator; a simple generator with a fixed random seed is enough.
- One evaluation chart (expected value per negotiation, agentic vs 2 baselines). Don't
  build a metrics dashboard.

## Code standards

- `core/policy_engine.py` and `core/economic_model.py` must be pure functions, fully
  deterministic, no network/LLM calls, and covered by unit tests. These are the files
  a judge or panelist is most likely to actually read closely — treat them like it.
- Structured outputs (`Proposal`, `Contract`, `SellerPolicy`) are Pydantic models, not
  raw dicts. Validate LLM output against the schema immediately; on malformed output,
  fail the round rather than guessing/coercing.
- Never fabricate evaluation numbers, benchmark results, or claims about Razorpay API
  capabilities. If you don't have a verified answer (e.g. exact Razorpay Invoice
  fields), say so explicitly in a comment/TODO rather than assuming a plausible-looking
  schema.
- Don't invent hackathon requirements (deadlines, mandatory frameworks, mandatory
  models) that aren't confirmed. If something is unconfirmed, keep the code
  model/framework-agnostic rather than hardcoding an assumption.
- Audit log entries are append-only; never mutate a past entry to "fix" a decision.

## When asked to build a feature

1. Check whether it touches money/policy logic → if yes, it must route through
   `policy_engine.validate()`, no exceptions, even for "just a quick demo hack."
2. Check whether it needs a new agent vs. a function → default to function.
3. Prefer explicit, boring code over clever abstractions — a judge/panelist will read
   this in a 5-minute video and possibly the raw repo. Optimize for legibility.
4. If a requirement is ambiguous (exact Razorpay field names, exact deadline, etc.),
   don't guess silently — flag the assumption inline (`# ASSUMPTION: ...`) so it's
   easy to grep and verify later.

## Testing expectations

- `core/` needs unit tests for every policy branch (approve/reject/escalate) and for
  the economic model's edge cases (zero discount, max term, buyer with very low
  reliability).
- Agents (`agents/`) are harder to unit test directly (LLM calls) — test the schema
  validation and the retry/failure path (malformed output → fail gracefully) rather
  than trying to assert on LLM reasoning content.
- At least one end-to-end test per failure case in ARCHITECTURE.md §Failure handling.
