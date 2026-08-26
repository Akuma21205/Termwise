from core.models import Proposal, SellerPolicy, Decision


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
