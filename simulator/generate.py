import random
from typing import List, Tuple
from core.models import BuyerProfile, SellerPolicy


def generate_synthetic_dataset(seed: int = 42, count: int = 50) -> List[Tuple[BuyerProfile, SellerPolicy, float]]:
    """
    Generates a deterministic synthetic dataset of buyer/seller negotiation pairs.
    Target count is 50-100 records per ARCHITECTURE.md and AGENT.md specs.
    
    Returns:
        List of (buyer_profile, seller_policy, order_value) tuples.
    """
    random.seed(seed)
    dataset = []
    
    for i in range(1, count + 1):
        buyer_id = f"BUYER_{i:03d}"
        reliability = round(random.uniform(0.65, 0.98), 2)
        avg_delay = random.randint(1, 15)
        preferred_term = random.choice([30, 45, 60, 90])
        
        # Order value range ₹200k to ₹1.5M
        order_value = round(random.uniform(200000.0, 1500000.0), -4)
        
        buyer = BuyerProfile(
            buyer_id=buyer_id,
            reliability_score=reliability,
            avg_payment_delay_days=avg_delay,
            preferred_term_days=preferred_term
        )
        
        seller = SellerPolicy(
            min_term_days=0,
            max_term_days=60,
            max_discount_percent=5.0,
            auto_approval_limit=1000000.0,
            cash_pressure_level=round(random.uniform(0.2, 0.8), 2),
            financing_cost_annual_percent=12.0
        )
        
        dataset.append((buyer, seller, order_value))
        
    return dataset
