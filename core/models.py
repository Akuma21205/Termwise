from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class Decision(str, Enum):
    """Possible outcomes returned by the policy engine."""
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    ESCALATE = "ESCALATE"


class Proposal(BaseModel):
    """
    Structured proposal object passed between LLM agents and gated by policy engine.
    Fields match the locked specification in ARCHITECTURE.md.
    """
    order_value: float = Field(..., description="Total order value in currency units (e.g. INR)")
    currency: str = Field(default="INR", description="3-letter currency code")
    quantity: int = Field(..., description="Quantity of items in order")
    payment_term_days: int = Field(..., description="Requested credit payment term in days")
    discount_percent: float = Field(..., description="Early payment discount percentage (0 to 100)")
    delivery_deadline_days: int = Field(..., description="Delivery timeline in days")
    round: int = Field(default=1, description="Negotiation round index (1 to 5)")
    proposer: str = Field(..., description="'buyer' or 'seller'")


class SellerPolicy(BaseModel):
    """
    Hard policy parameters configured by the seller merchant persona.
    Used by core/policy_engine.py for validation.
    """
    min_term_days: int = Field(default=0, description="Minimum allowed credit payment term in days")
    max_term_days: int = Field(default=60, description="Maximum allowed credit payment term in days")
    max_discount_percent: float = Field(default=5.0, description="Maximum allowed discount percentage")
    auto_approval_limit: float = Field(default=1000000.0, description="Max order value allowed without human escalation")
    cash_pressure_level: float = Field(default=0.5, description="Normalized seller cash pressure (0.0 to 1.0)")
    financing_cost_annual_percent: float = Field(default=12.0, description="Annual cost of capital / borrowing rate %")


class BuyerProfile(BaseModel):
    """
    Buyer metadata and historical reliability profile.
    """
    buyer_id: str = Field(..., description="Unique buyer identifier")
    reliability_score: float = Field(default=0.85, description="Historical payment reliability score (0.0 to 1.0)")
    avg_payment_delay_days: int = Field(default=5, description="Average payment delay past due date in days")
    preferred_term_days: int = Field(default=45, description="Buyer's initial target credit term in days")


class Contract(BaseModel):
    """
    Finalized agreement resulting from an approved proposal, mapped to Razorpay lifecycle.
    """
    contract_id: str = Field(..., description="Unique contract identifier")
    negotiation_id: str = Field(..., description="Associated negotiation ID")
    agreed_proposal: Proposal = Field(..., description="The approved proposal details")
    razorpay_order_id: Optional[str] = Field(default=None, description="Razorpay Order ID")
    razorpay_payment_link_id: Optional[str] = Field(default=None, description="Razorpay Payment Link ID")
    due_date: str = Field(..., description="Calculated due date string (ISO format)")
    status: str = Field(default="CREATED", description="Contract lifecycle status")
