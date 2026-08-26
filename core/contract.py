import uuid
from datetime import datetime, timedelta, timezone
from core.models import Proposal, Decision, Contract


def finalize_contract(proposal: Proposal, decision: Decision, negotiation_id: str) -> Contract:
    """
    Finalizes an approved proposal into an immutable Contract object.
    
    Hard-refuses to run on anything other than Decision.APPROVE.
    It is physically impossible to construct a Contract for rejected or escalated proposals.
    """
    if decision != Decision.APPROVE:
        raise ValueError(
            f"Cannot finalize contract: decision is {decision.value}. "
            f"Contracts can ONLY be constructed from proposals validated as Decision.APPROVE."
        )
        
    contract_id = f"contract_{negotiation_id}_{uuid.uuid4().hex[:8]}"
    due_date_dt = datetime.now(timezone.utc) + timedelta(days=proposal.payment_term_days)
    due_date_str = due_date_dt.strftime("%Y-%m-%d")
    
    return Contract(
        contract_id=contract_id,
        negotiation_id=negotiation_id,
        agreed_proposal=proposal,
        due_date=due_date_str,
        status="CREATED"
    )
