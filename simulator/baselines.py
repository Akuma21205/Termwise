from core.models import Proposal, BuyerProfile, SellerPolicy
from core.economic_model import calculate_expected_value


def fixed_net30_baseline(buyer: BuyerProfile, policy: SellerPolicy, order_value: float) -> Proposal:
    """
    Fixed Net-30 Baseline Strategy.
    Unconditionally offers Net-30 with 0% discount.
    """
    return Proposal(
        order_value=order_value,
        currency="INR",
        quantity=500,
        payment_term_days=30,
        discount_percent=0.0,
        delivery_deadline_days=14,
        round=1,
        proposer="seller"
    )


def rule_based_baseline(buyer: BuyerProfile, policy: SellerPolicy, order_value: float) -> Proposal:
    """
    Simple Rule-Based Baseline Strategy.
    Rule: if reliability >= 0.85 -> Net-60; else -> Net-30.
    """
    term_days = 60 if buyer.reliability_score >= 0.85 else 30
    return Proposal(
        order_value=order_value,
        currency="INR",
        quantity=500,
        payment_term_days=term_days,
        discount_percent=0.0,
        delivery_deadline_days=14,
        round=1,
        proposer="seller"
    )


def evaluate_baseline_expected_value(proposal: Proposal, buyer: BuyerProfile, policy: SellerPolicy) -> float:
    """Calculates expected financial value for a baseline proposal."""
    return calculate_expected_value(proposal, buyer, policy)
