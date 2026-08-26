from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

from core.models import Proposal, Decision, Contract
from core.contract import finalize_contract
from razorpay.client import RazorpayClient
from api.db import log_audit_entry, get_audit_trail

router = APIRouter(prefix="/negotiate", tags=["approval"])


class HumanApprovalRequest(BaseModel):
    negotiation_id: str = Field(..., description="The escalated negotiation ID")
    approved: bool = Field(..., description="True to override and approve, False to reject")
    proposal: Proposal = Field(..., description="The proposal being manually reviewed")
    human_notes: Optional[str] = Field(default="Human supervisor review", description="Optional notes")


@router.post("/override-approval")
def override_human_approval(req: HumanApprovalRequest):
    """
    Human Supervisor Approval Endpoint for Escalated Negotiations.
    
    Bypasses LLM agents entirely (human decision is a simple yes/no).
    Calls finalize_contract() -> creates Razorpay Order & Payment Link -> logs audit entries.
    """
    if not req.approved:
        log_audit_entry(
            negotiation_id=req.negotiation_id,
            actor="human_supervisor",
            action="HUMAN_REJECT",
            payload_summary=f"Notes: {req.human_notes}",
            decision="HUMAN_REJECTED",
            reason=f"Human supervisor rejected escalated proposal: {req.human_notes}"
        )
        return {
            "negotiation_id": req.negotiation_id,
            "status": "HUMAN_REJECTED",
            "message": "Escalated proposal was manually rejected by human supervisor."
        }

    # Finalize contract explicitly passing Decision.APPROVE
    contract = finalize_contract(req.proposal, Decision.APPROVE, req.negotiation_id)

    log_audit_entry(
        negotiation_id=req.negotiation_id,
        actor="human_supervisor",
        action="HUMAN_APPROVE",
        payload_summary=f"Notes: {req.human_notes}",
        decision="HUMAN_APPROVED",
        reason=f"Human supervisor manually approved escalated proposal: {req.human_notes}"
    )

    # Execute Razorpay payment rail
    rzp = RazorpayClient()
    order = rzp.create_order(req.proposal, req.negotiation_id)
    payment_link = rzp.create_payment_link(req.proposal, order["id"])

    log_audit_entry(
        negotiation_id=req.negotiation_id,
        actor="razorpay",
        action="EXECUTION_TRIGGERED",
        payload_summary=f"Order: {order['id']}, PaymentLink: {payment_link['id']}",
        decision="EXECUTED",
        reason=f"Razorpay payment link created following human approval override"
    )

    return {
        "negotiation_id": req.negotiation_id,
        "status": "HUMAN_APPROVED",
        "contract": contract.model_dump(),
        "razorpay_order": order,
        "razorpay_payment_link": payment_link
    }
