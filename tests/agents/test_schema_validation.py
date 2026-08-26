import pytest
from core.models import BuyerProfile, SellerPolicy, Proposal
from agents.buyer_agent import BuyerAgent
from agents.seller_agent import SellerAgent


@pytest.fixture
def sample_buyer():
    return BuyerAgent(BuyerProfile(buyer_id="B001", preferred_term_days=45))


@pytest.fixture
def sample_seller():
    return SellerAgent(SellerPolicy(), BuyerProfile(buyer_id="B001"))


def test_valid_llm_json_validation(sample_buyer, sample_seller):
    valid_json = """
    {
        "order_value": 750000.0,
        "currency": "INR",
        "quantity": 300,
        "payment_term_days": 45,
        "discount_percent": 1.0,
        "delivery_deadline_days": 14,
        "round": 1,
        "proposer": "buyer"
    }
    """
    prop_buyer = sample_buyer.validate_llm_output(valid_json)
    assert isinstance(prop_buyer, Proposal)
    assert prop_buyer.order_value == 750000.0

    prop_seller = sample_seller.validate_llm_output(valid_json)
    assert isinstance(prop_seller, Proposal)
    assert prop_seller.payment_term_days == 45


def test_malformed_json_syntax_error(sample_buyer):
    invalid_json = "{ order_value: 750000.0, invalid_syntax }"
    with pytest.raises(ValueError, match="Malformed LLM output"):
        sample_buyer.validate_llm_output(invalid_json)


def test_missing_required_pydantic_field(sample_seller):
    incomplete_json = """
    {
        "currency": "INR",
        "quantity": 300,
        "payment_term_days": 45,
        "discount_percent": 1.0,
        "delivery_deadline_days": 14,
        "round": 1,
        "proposer": "seller"
    }
    """
    with pytest.raises(ValueError, match="Malformed LLM output"):
        sample_seller.validate_llm_output(incomplete_json)


def test_invalid_type_field(sample_buyer):
    bad_type_json = """
    {
        "order_value": "not_a_number",
        "currency": "INR",
        "quantity": 300,
        "payment_term_days": 45,
        "discount_percent": 1.0,
        "delivery_deadline_days": 14,
        "round": 1,
        "proposer": "buyer"
    }
    """
    with pytest.raises(ValueError, match="Malformed LLM output"):
        sample_buyer.validate_llm_output(bad_type_json)
