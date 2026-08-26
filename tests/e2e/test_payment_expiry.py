import pytest
import time
from core.models import Proposal
from razorpay.client import RazorpayClient
from razorpay.webhooks import process_webhook_event
from api.db import init_db, log_audit_entry, get_audit_trail


def test_e2e_payment_link_expiry_and_webhook_handling():
    """
    End-to-End Failure Case 3:
    Payment link expires unpaid -> Webhook signature/event received -> Audit trail updated with EXPIRED status.
    """
    init_db()
    rzp = RazorpayClient()
    
    proposal = Proposal(
        order_value=500000.0,
        quantity=200,
        payment_term_days=30,
        discount_percent=1.0,
        delivery_deadline_days=10,
        proposer="seller"
    )
    
    negotiation_id = "neg_expiry_test_001"
    
    # 1. Create order & payment link
    order = rzp.create_order(proposal, negotiation_id)
    plink = rzp.create_payment_link(proposal, order["id"])
    
    assert plink["expire_by"] > int(time.time())
    
    # 2. Simulate Razorpay payment_link.expired webhook event
    simulated_webhook_payload = {
        "event": "payment_link.expired",
        "payload": {
            "payment_link": {
                "entity": {
                    "id": plink["id"],
                    "reference_id": order["id"],
                    "status": "expired"
                }
            }
        }
    }
    
    event_name, target_id, entity_info = process_webhook_event(simulated_webhook_payload)
    assert event_name == "payment_link.expired"
    assert target_id == plink["id"]
    
    # 3. Log event to append-only audit trail
    log_audit_entry(
        negotiation_id=negotiation_id,
        actor="razorpay_webhook",
        action=event_name,
        payload_summary=f"Payment Link {target_id} expired unpaid",
        decision="OVERDUE_EXPIRED",
        reason="Payment link hit expire_by deadline without settlement"
    )
    
    # 4. Verify audit trail record
    trail = get_audit_trail(negotiation_id)
    assert len(trail) > 0
    expired_entry = trail[-1]
    assert expired_entry["decision"] == "OVERDUE_EXPIRED"
    assert expired_entry["action"] == "payment_link.expired"
