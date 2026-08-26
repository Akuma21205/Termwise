import pytest
from core.models import Proposal, BuyerProfile, SellerPolicy
from core.economic_model import calculate_expected_value


@pytest.fixture
def sample_proposal():
    return Proposal(
        order_value=1000000.0,
        quantity=500,
        payment_term_days=30,
        discount_percent=1.0,
        delivery_deadline_days=14,
        proposer="buyer"
    )


@pytest.fixture
def default_policy():
    return SellerPolicy(
        financing_cost_annual_percent=12.0
    )


def test_economic_model_perfect_buyer(sample_proposal, default_policy):
    buyer = BuyerProfile(buyer_id="B_PERFECT", reliability_score=1.0)
    ev = calculate_expected_value(sample_proposal, buyer, default_policy)
    # Gross revenue = 1,000,000 * 1.0 = 1,000,000
    # Financing = 1,000,000 * (30/365) * 0.12 = 9863.01
    # Discount = 1,000,000 * 0.01 = 10000.0
    # Default loss = 0
    # EV = 1,000,000 - 9863.01 - 10000.0 = 980136.99
    assert pytest.approx(ev, abs=1.0) == 980136.99


def test_economic_model_low_reliability_buyer(sample_proposal, default_policy):
    low_buyer = BuyerProfile(buyer_id="B_LOW", reliability_score=0.5)
    ev_low = calculate_expected_value(sample_proposal, low_buyer, default_policy)
    
    high_buyer = BuyerProfile(buyer_id="B_HIGH", reliability_score=0.9)
    ev_high = calculate_expected_value(sample_proposal, high_buyer, default_policy)
    
    assert ev_low < ev_high


def test_economic_model_zero_discount_and_zero_term(default_policy):
    proposal = Proposal(
        order_value=1000000.0,
        quantity=500,
        payment_term_days=0,
        discount_percent=0.0,
        delivery_deadline_days=14,
        proposer="buyer"
    )
    buyer = BuyerProfile(buyer_id="B001", reliability_score=1.0)
    ev = calculate_expected_value(proposal, buyer, default_policy)
    # Zero financing cost, zero discount, perfect reliability -> EV = full order_value
    assert ev == 1000000.0


def test_economic_model_max_term_increases_financing_cost(default_policy):
    short_term_prop = Proposal(
        order_value=1000000.0,
        quantity=500,
        payment_term_days=15,
        discount_percent=1.0,
        delivery_deadline_days=14,
        proposer="buyer"
    )
    long_term_prop = Proposal(
        order_value=1000000.0,
        quantity=500,
        payment_term_days=60,
        discount_percent=1.0,
        delivery_deadline_days=14,
        proposer="buyer"
    )
    buyer = BuyerProfile(buyer_id="B001", reliability_score=0.85)
    
    ev_short = calculate_expected_value(short_term_prop, buyer, default_policy)
    ev_long = calculate_expected_value(long_term_prop, buyer, default_policy)
    
    assert ev_short > ev_long
