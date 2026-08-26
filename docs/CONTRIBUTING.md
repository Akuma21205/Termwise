# Contributing

Solo hackathon build, but keeping this file real so vibe-coding sessions stay
consistent across days and don't drift from the architecture doc.

## Setup

```bash
git clone <repo>
cd negotiator
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Fill `.env` with:
- LLM API key (whichever provider gets picked per ARCHITECTURE.md's evidence-driven
  selection — don't hardcode a provider assumption elsewhere in the code)
- Razorpay test-mode key + secret (never commit live keys, never commit `.env`)

## Branching / commits

Given solo + tight timeline, keep it simple:
- `main` stays demoable at all times — if you're mid-refactor and it's about to
  break, branch (`feat/policy-engine`, `fix/webhook-signature`, etc.) and merge back
  once it runs.
- Commit messages: `type: short description` (`feat:`, `fix:`, `test:`, `docs:`).
  No strict convention beyond that — this isn't a team repo, just make history
  readable for the panel review.

## Before merging anything into main

1. `pytest tests/core -v` passes — the policy engine and economic model tests are
   non-negotiable, everything else can be looser.
2. Any change touching `core/policy_engine.py` gets a corresponding test for the new
   branch/condition. No exceptions — this file is the credibility of the whole
   project.
3. If you touched the Razorpay integration, confirm against current docs
   (`razorpay.com/docs/api`) rather than assumption — the API surface (Invoices vs
   Payment Links vs Orders) was not fully verified at project start; don't propagate
   an unverified schema further without checking.

## Scope guardrails (see AGENT.md for the full version)

If you're about to add a new agent, a new framework dependency, or expand the
synthetic dataset past ~100 records — stop and check ARCHITECTURE.md's locked MVP
scope first. Scope creep is the single biggest risk to actually shipping this before
the (still-unconfirmed) deadline. When in doubt, cut, don't add.

## Reporting issues to yourself (i.e. writing TODOs)

Use `# ASSUMPTION:` for unverified facts (exact Razorpay fields, exact deadline,
exact model choice) and `# CUT:` for scope deliberately dropped so it's easy to grep
both back before the final push if time allows.

## Demo prep checklist (fill in closer to submission)

- [ ] Policy rejection failure case runs live and is visible in UI
- [ ] Escalation-over-limit case runs live
- [ ] Razorpay test-mode Order + Payment Link creation works end-to-end
- [ ] One webhook event received and logged in audit trail
- [ ] Evaluation chart (agentic vs 2 baselines) renders
- [ ] 5-minute pitch video recorded per the structure in project notes
- [ ] Public GitHub repo is actually public and README is current
