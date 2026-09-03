from core.models import Proposal, SellerPolicy, Decision

# NOTE: validate() and validate_with_reason() check the same policy rules independently.
# If you change a threshold/condition in one, update the other to match.
def validate(proposal: Proposal, policy: SellerPolicy) -> Decision:
    """
    Deterministic Policy Engine.

    Validates a negotiation proposal against hard boundaries set in seller policy.
    This function is pure, deterministic, has zero LLM/network dependencies,
    and returns an explicit Decision enum (APPROVE, REJECT, ESCALATE).
    """
    if proposal.discount_percent > policy.max_discount_percent:
        return Decision.REJECT
    if proposal.payment_term_days < policy.min_term_days:
        return Decision.REJECT
    if proposal.payment_term_days > policy.max_term_days:
        return Decision.REJECT
    if proposal.order_value > policy.auto_approval_limit:
        return Decision.ESCALATE
    return Decision.APPROVE


# NOTE: validate() and validate_with_reason() check the same policy rules independently.
# If you change a threshold/condition in one, update the other to match.
def validate_with_reason(proposal: Proposal, policy: SellerPolicy) -> tuple:
    """
    Deterministic Policy Engine — with field-level reason strings.

    Mirrors validate() exactly but also returns a human-readable reason string
    naming the specific field that triggered the decision, the proposed value,
    and the policy limit. Used by the orchestrator to populate history[].reason.

    Returns:
        (Decision, reason_str)
    """
    if proposal.discount_percent > policy.max_discount_percent:
        reason = (
            f"REJECT: discount {proposal.discount_percent}% exceeds policy max "
            f"{policy.max_discount_percent}%"
        )
        return Decision.REJECT, reason

    if proposal.payment_term_days < policy.min_term_days:
        reason = (
            f"REJECT: payment_term_days {proposal.payment_term_days}d is below "
            f"policy minimum {policy.min_term_days}d"
        )
        return Decision.REJECT, reason

    if proposal.payment_term_days > policy.max_term_days:
        reason = (
            f"REJECT: payment_term_days {proposal.payment_term_days}d exceeds "
            f"policy max {policy.max_term_days}d"
        )
        return Decision.REJECT, reason

    if proposal.order_value > policy.auto_approval_limit:
        reason = (
            f"ESCALATE: order value \u20b9{proposal.order_value:,.0f} exceeds "
            f"auto-approval ceiling \u20b9{policy.auto_approval_limit:,.0f}, "
            f"requires human review"
        )
        return Decision.ESCALATE, reason

    reason = (
        f"APPROVE: proposal within policy "
        f"(discount {proposal.discount_percent}%, "
        f"term {proposal.payment_term_days}d, "
        f"value \u20b9{proposal.order_value:,.0f})"
    )
    return Decision.APPROVE, reason
