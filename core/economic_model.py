from core.models import Proposal, BuyerProfile, SellerPolicy


def calculate_expected_value(
    proposal: Proposal,
    buyer: BuyerProfile,
    policy: SellerPolicy,
    default_loss_factor: float = 0.15
) -> float:
    """
    Deterministic Economic Model.
    
    Scores a proposal's expected financial net value to the seller.
    
    Formula (from ARCHITECTURE.md):
      expected_value = order_value * on_time_prob
                      - order_value * (payment_term_days / 365) * (financing_cost_annual / 100)
                      - order_value * (discount_percent / 100)
                      - order_value * (1 - on_time_prob) * default_loss_factor
    """
    on_time_prob = min(max(buyer.reliability_score, 0.0), 1.0)
    financing_rate = policy.financing_cost_annual_percent / 100.0
    discount_rate = proposal.discount_percent / 100.0
    
    # Financial components
    gross_revenue = proposal.order_value * on_time_prob
    financing_cost = proposal.order_value * (proposal.payment_term_days / 365.0) * financing_rate
    discount_cost = proposal.order_value * discount_rate
    default_loss = proposal.order_value * (1.0 - on_time_prob) * default_loss_factor
    
    net_expected_value = gross_revenue - financing_cost - discount_cost - default_loss
    return round(net_expected_value, 2)
