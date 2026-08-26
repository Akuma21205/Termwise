import pytest
from core.models import Proposal, SellerPolicy, Decision
from core.policy_engine import validate


@pytest.fixture
def default_policy():
    return SellerPolicy(
        min_term_days=0,
        max_term_days=60,
        max_discount_percent=5.0,
        auto_approval_limit=1000000.0
    )


def test_validate_approve(default_policy):
    proposal = Proposal(
        order_value=500000.0,
        quantity=200,
        payment_term_days=30,
        discount_percent=2.0,
        delivery_deadline_days=10,
        proposer="buyer"
    )
    assert validate(proposal, default_policy) == Decision.APPROVE


def test_validate_reject_excessive_discount(default_policy):
    proposal = Proposal(
        order_value=500000.0,
        quantity=200,
        payment_term_days=30,
        discount_percent=10.0,  # Exceeds max 5.0%
        delivery_deadline_days=10,
        proposer="buyer"
    )
    assert validate(proposal, default_policy) == Decision.REJECT


def test_validate_reject_term_too_long(default_policy):
    proposal = Proposal(
        order_value=500000.0,
        quantity=200,
        payment_term_days=90,  # Exceeds max 60 days
        discount_percent=2.0,
        delivery_deadline_days=10,
        proposer="buyer"
    )
    assert validate(proposal, default_policy) == Decision.REJECT


def test_validate_reject_term_too_short(default_policy):
    policy = SellerPolicy(min_term_days=15, max_term_days=60)
    proposal = Proposal(
        order_value=500000.0,
        quantity=200,
        payment_term_days=5,  # Below min 15 days
        discount_percent=2.0,
        delivery_deadline_days=10,
        proposer="buyer"
    )
    assert validate(proposal, policy) == Decision.REJECT


def test_validate_escalate_over_auto_approval_limit(default_policy):
    proposal = Proposal(
        order_value=1500000.0,  # Exceeds 1,000,000 limit
        quantity=1000,
        payment_term_days=30,
        discount_percent=2.0,
        delivery_deadline_days=10,
        proposer="buyer"
    )
    assert validate(proposal, default_policy) == Decision.ESCALATE
