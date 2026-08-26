from fastapi import FastAPI, HTTPException, Request, Header
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager

from core.models import BuyerProfile, SellerPolicy, Proposal
from agents.orchestrator import run_negotiation_loop
from razorpay.client import RazorpayClient
from razorpay.webhooks import verify_webhook_signature, process_webhook_event
from api.db import init_db, log_audit_entry, get_audit_trail
from api.approval import router as approval_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite tables on startup
    init_db()
    yield


app = FastAPI(
    title="Termwise - AI-to-AI B2B Payment Negotiator",
    description="Deterministic policy-gated payment negotiation engine integrated with Razorpay",
    version="0.1.0",
    lifespan=lifespan
)

app.include_router(approval_router)


class NegotiationRequest(BaseModel):
    buyer_id: str = Field(default="B001", description="Buyer ID")
    order_value: float = Field(default=1000000.0, description="Order value in INR")
    buyer_reliability: float = Field(default=0.85, description="Buyer reliability score (0.0 to 1.0)")
    buyer_preferred_term: int = Field(default=60, description="Target payment credit term in days")
    seller_max_discount: float = Field(default=5.0, description="Maximum discount percentage allowed by seller")
    seller_max_term: int = Field(default=60, description="Maximum term days allowed by seller policy")
    auto_approval_limit: float = Field(default=1000000.0, description="Auto-approval ceiling in INR")


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Termwise AI Negotiator API",
        "principle": "LLM proposes. Policy decides. Razorpay executes. Data learns."
    }


@app.post("/negotiate/run")
def trigger_negotiation(req: NegotiationRequest):
    """
    Triggers an AI-to-AI payment negotiation bounded by policy engine constraints.
    """
    buyer_profile = BuyerProfile(
        buyer_id=req.buyer_id,
        reliability_score=req.buyer_reliability,
        preferred_term_days=req.buyer_preferred_term
    )
    seller_policy = SellerPolicy(
        max_discount_percent=req.seller_max_discount,
        max_term_days=req.seller_max_term,
        auto_approval_limit=req.auto_approval_limit
    )
    
    negotiation_id = f"neg_{req.buyer_id}_1001"
    
    status, history, final_proposal, contract = run_negotiation_loop(
        buyer_profile=buyer_profile,
        seller_policy=seller_policy,
        order_value=req.order_value,
        negotiation_id=negotiation_id
    )
    
    # Write audit log entries sequentially
    for entry in history:
        log_audit_entry(
            negotiation_id=negotiation_id,
            actor=entry.get("proposer", "system"),
            action=f"Round {entry.get('round')} Proposal",
            payload_summary=str(entry.get("proposal")),
            decision=entry.get("decision", "PENDING"),
            reason=entry.get("reason", "")
        )
        
    payment_link_data = None
    order_data = None
    
    if status == "APPROVED" and final_proposal:
        rzp = RazorpayClient()
        order_data = rzp.create_order(final_proposal, negotiation_id)
        payment_link_data = rzp.create_payment_link(final_proposal, order_data["id"])
        
        log_audit_entry(
            negotiation_id=negotiation_id,
            actor="razorpay",
            action="EXECUTION_TRIGGERED",
            payload_summary=f"Order: {order_data['id']}, PaymentLink: {payment_link_data['id']}",
            decision="EXECUTED",
            reason=f"Razorpay order and payment link created with expire_by = Net-{final_proposal.payment_term_days} days"
        )
        
    return {
        "negotiation_id": negotiation_id,
        "status": status,
        "history": history,
        "final_proposal": final_proposal.model_dump() if final_proposal else None,
        "contract": contract.model_dump() if contract else None,
        "razorpay_order": order_data,
        "razorpay_payment_link": payment_link_data
    }


@app.get("/negotiate/{negotiation_id}/audit")
def get_audit(negotiation_id: str):
    """
    Returns the complete chronological audit trail for a negotiation.
    """
    trail = get_audit_trail(negotiation_id)
    return {"negotiation_id": negotiation_id, "audit_trail": trail}


@app.post("/webhooks/razorpay")
async def handle_razorpay_webhook(request: Request, x_razorpay_signature: Optional[str] = Header(None)):
    """
    Processes incoming Razorpay webhook events and appends status to audit trail.
    """
    body = await request.body()
    webhook_secret = "your_webhook_secret_here"
    
    # Verify signature if signature header present
    if x_razorpay_signature:
        is_valid = verify_webhook_signature(body, x_razorpay_signature, webhook_secret)
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
            
    payload = await request.json()
    event_name, target_id, entity_info = process_webhook_event(payload)
    
    log_audit_entry(
        negotiation_id="webhook_event",
        actor="razorpay_webhook",
        action=event_name,
        payload_summary=f"Target ID: {target_id}",
        decision="PROCESSED",
        reason=f"Received Razorpay event: {event_name}"
    )
    
    return {"status": "acknowledged", "event": event_name, "target_id": target_id}
