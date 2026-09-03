from typing import List, Dict, Any, Tuple, Optional
from core.models import Proposal, SellerPolicy, BuyerProfile, Decision, Contract
from core.policy_engine import validate_with_reason
from core.contract import finalize_contract
from agents.buyer_agent import BuyerAgent
from agents.seller_agent import SellerAgent


def run_negotiation_loop(
    buyer_profile: BuyerProfile,
    seller_policy: SellerPolicy,
    order_value: float,
    max_rounds: int = 5,
    negotiation_id: Optional[str] = None
) -> Tuple[str, List[Dict[str, Any]], Proposal, Optional[Contract]]:
    """
    State machine orchestrating the turn-based negotiation loop between BuyerAgent and SellerAgent.
    
    Enforces strict architectural invariants:
    1. Every proposal passes through core/policy_engine.py::validate() before approval.
    2. Approved proposals are finalized via core/contract.py::finalize_contract().
    3. Capped at max_rounds (default 5). Terminates without infinite loops.
    
    Returns:
        (status, history, final_proposal, contract)
        status: 'APPROVED', 'REJECTED', 'ESCALATED', or 'MAX_ROUNDS_EXCEEDED'
    """
    buyer = BuyerAgent(buyer_profile)
    seller = SellerAgent(seller_policy, buyer_profile)
    neg_id = negotiation_id or f"neg_{buyer_profile.buyer_id}"
    
    history: List[Dict[str, Any]] = []
    
    # Round 1 opening proposal from Buyer
    current_proposal = buyer.propose(order_value, round_num=1)
    
    for current_round in range(1, max_rounds + 1):
        decision, reason = validate_with_reason(current_proposal, seller_policy)
        
        history.append({
            "round": current_round,
            "proposer": current_proposal.proposer,
            "proposal": current_proposal.model_dump(),
            "decision": decision.value,
            "reason": reason
        })
        
        # Escalation condition (e.g. order value > auto approval limit)
        if decision == Decision.ESCALATE:
            return ("ESCALATED", history, current_proposal, None)
            
        # Agreement condition: Buyer proposed a proposal that satisfies Seller Policy Engine
        if decision == Decision.APPROVE and current_proposal.proposer == "buyer":
            contract = finalize_contract(current_proposal, Decision.APPROVE, neg_id)
            return ("APPROVED", history, current_proposal, contract)
            
        # Exit if max rounds reached without agreement
        if current_round >= max_rounds:
            break

        # Generate next turn counter-proposal
        if current_proposal.proposer == "buyer":
            # Seller evaluates buyer proposal and counter-offers
            current_proposal = seller.evaluate_and_respond(current_proposal, current_round)
        else:
            # Buyer responds to seller proposal
            current_proposal = buyer.respond(current_proposal, current_round)

    return ("MAX_ROUNDS_EXCEEDED", history, current_proposal, None)

