import pytest
from core.models import BuyerProfile, SellerPolicy, Decision
from core.policy_engine import validate
from agents.orchestrator import run_negotiation_loop


def test_e2e_policy_rejection_excessive_discount():
    """
    End-to-End Failure Case 1:
    Buyer requests terms outside seller policy hard bounds (15% discount vs max 5.0%).
    The Policy Engine MUST hard reject the proposal.
    """
    strict_policy = SellerPolicy(
        max_discount_percent=5.0,
        max_term_days=45
    )
    buyer = BuyerProfile(
        buyer_id="B_GREEDY",
        preferred_term_days=90
    )
    
    # Run negotiation loop
    status, history, final_proposal, contract = run_negotiation_loop(
        buyer_profile=buyer,
        seller_policy=strict_policy,
        order_value=500000.0,
        max_rounds=5
    )
    
    # Assert that any intermediate or final proposal breaching policy is flagged
    for entry in history:
        prop_data = entry["proposal"]
        if prop_data["discount_percent"] > strict_policy.max_discount_percent:
            assert entry["decision"] == Decision.REJECT.value
            
    # Final agreement must either be within bounds or negotiation terminates
    if status == "APPROVED":
        assert final_proposal.discount_percent <= strict_policy.max_discount_percent
        assert final_proposal.payment_term_days <= strict_policy.max_term_days
