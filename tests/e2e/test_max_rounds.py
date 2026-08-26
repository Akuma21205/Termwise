import pytest
from core.models import BuyerProfile, SellerPolicy, Decision
from agents.orchestrator import run_negotiation_loop


def test_e2e_max_rounds_exceeded_termination():
    """
    End-to-End Test for Max Rounds Termination:
    
    Forces an unwinnable negotiation scenario where seller policy hard bounds
    and buyer target constraints cannot reach agreement within 5 rounds.
    
    Asserts:
    1. Negotiation terminates exactly at status 'MAX_ROUNDS_EXCEEDED'.
    2. Does NOT infinite-loop.
    3. Every round (5 rounds) is recorded in the audit history.
    """
    # Unwinnable policy: min_term_days 90 > max_term_days 60 (impossible for any proposal to pass validate)
    unwinnable_seller_policy = SellerPolicy(
        min_term_days=90,
        max_term_days=60,
        max_discount_percent=1.0,
        auto_approval_limit=1000000.0
    )
    
    unwinnable_buyer_profile = BuyerProfile(
        buyer_id="B_UNWINNABLE",
        reliability_score=0.7,
        preferred_term_days=15
    )
    
    status, history, final_proposal, contract = run_negotiation_loop(
        buyer_profile=unwinnable_buyer_profile,
        seller_policy=unwinnable_seller_policy,
        order_value=500000.0,
        max_rounds=5
    )
    
    # Assert termination status
    assert status == "MAX_ROUNDS_EXCEEDED"
    assert contract is None
    
    # Assert that all 5 rounds were evaluated and logged
    rounds_logged = [h["round"] for h in history]
    assert len(history) >= 5
    assert 5 in rounds_logged
    
    # Verify that no proposal in history was incorrectly APPROVED
    for entry in history:
        assert entry["decision"] != Decision.APPROVE.value
