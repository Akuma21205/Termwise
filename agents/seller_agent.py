import os
import json
import requests
from typing import Optional
from dotenv import load_dotenv
from core.models import Proposal, SellerPolicy, BuyerProfile
from core.economic_model import calculate_expected_value
from agents.prompts import SELLER_SYSTEM_PROMPT

load_dotenv()


class SellerAgent:
    """
    Seller Agent LLM layer.
    
    Generates structured proposal objects for payment negotiations using Google Gemini LLM.
    Uses core/economic_model.py as a deterministic tool to evaluate financial value.
    Has proposal-only rights (never execution authority over money).
    """
    def __init__(self, policy: SellerPolicy, buyer_profile: BuyerProfile):
        self.policy = policy
        self.buyer_profile = buyer_profile
        self.system_prompt = SELLER_SYSTEM_PROMPT
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("LLM_API_KEY")

    def _call_gemini(self, user_prompt: str) -> Optional[str]:
        if not self.api_key or self.api_key == "your_llm_api_key_here":
            return None
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.api_key}"
            payload = {
                "systemInstruction": {"parts": [{"text": self.system_prompt}]},
                "contents": [{"parts": [{"text": user_prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"}
            }
            res = requests.post(url, json=payload, timeout=10)
            if res.status_code == 200:
                data = res.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:
            pass
        return None

    def evaluate_and_respond(self, buyer_proposal: Proposal, round_num: int) -> Proposal:
        """
        Evaluates buyer proposal using the economic model tool and formulates an optimal counter-proposal.
        """
        current_ev = calculate_expected_value(buyer_proposal, self.buyer_profile, self.policy)
        
        prompt = (
            f"Buyer proposed: term={buyer_proposal.payment_term_days} days, discount={buyer_proposal.discount_percent}%. "
            f"Buyer reliability: {self.buyer_profile.reliability_score}. "
            f"Seller policy bounds: min_term={self.policy.min_term_days}, max_term={self.policy.max_term_days}, "
            f"max_discount={self.policy.max_discount_percent}%. "
            f"Current expected value calculated by economic model tool: ₹{current_ev:,.2f}. "
            f"Generate seller counter-proposal for round {round_num}."
        )
        
        llm_raw = self._call_gemini(prompt)
        if llm_raw:
            try:
                proposal = self.validate_llm_output(llm_raw)
                # Ensure LLM response strictly stays inside seller policy bounds
                proposal.payment_term_days = min(max(proposal.payment_term_days, self.policy.min_term_days), self.policy.max_term_days)
                proposal.discount_percent = min(proposal.discount_percent, self.policy.max_discount_percent)
                return proposal
            except Exception:
                pass

        # Rule-based fallback
        target_term = min(
            max(buyer_proposal.payment_term_days - 5, self.policy.min_term_days),
            self.policy.max_term_days
        )
        target_discount = 0.0
        if buyer_proposal.payment_term_days <= 45 and self.buyer_profile.reliability_score >= 0.8:
            target_discount = min(buyer_proposal.discount_percent + 0.5, self.policy.max_discount_percent)
            
        return Proposal(
            order_value=buyer_proposal.order_value,
            currency=buyer_proposal.currency,
            quantity=buyer_proposal.quantity,
            payment_term_days=target_term,
            discount_percent=target_discount,
            delivery_deadline_days=buyer_proposal.delivery_deadline_days,
            round=round_num,
            proposer="seller"
        )

    def validate_llm_output(self, raw_json: str) -> Proposal:
        """
        Validates raw string output from LLM directly against Pydantic Proposal model.
        Per AGENT.md: Malformed output raises ValueError to fail/retry the round immediately.
        """
        try:
            data = json.loads(raw_json)
            return Proposal(**data)
        except Exception as e:
            raise ValueError(f"Malformed LLM output failing Pydantic Proposal validation: {e}")
