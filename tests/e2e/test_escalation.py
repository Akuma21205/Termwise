import pytest
from core.models import BuyerProfile, SellerPolicy, Decision
from agents.orchestrator import run_negotiation_loop


def test_e2e_escalation_over_auto_approval_limit():
    """
    End-to-End Failure Case 2:
    Order value (₹2,500,000) exceeds seller auto-approval ceiling (₹1,000,000).
    The system MUST route to ESCALATED status and block automatic execution.
    """
    policy = SellerPolicy(
        auto_approval_limit=1000000.0,
        max_discount_percent=5.0,
        max_term_days=60
    )
    buyer = BuyerProfile(
        buyer_id="B_LARGE_ORDER",
        preferred_term_days=45
    )
    
    large_order_value = 2500000.0
    
    status, history, proposal, contract = run_negotiation_loop(
        buyer_profile=buyer,
        seller_policy=policy,
        order_value=large_order_value,
        max_rounds=5
    )
    
    assert status == "ESCALATED"
    assert contract is None
    assert history[0]["decision"] == Decision.ESCALATE.value
    assert proposal.order_value > policy.auto_approval_limit
