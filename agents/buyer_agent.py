import os
import json
import requests
from typing import Optional
from dotenv import load_dotenv
from core.models import Proposal, BuyerProfile
from agents.prompts import BUYER_SYSTEM_PROMPT

load_dotenv()


class BuyerAgent:
    """
    Buyer Agent LLM layer.
    
    Generates structured proposal objects for payment negotiations using Google Gemini LLM.
    Has proposal-only rights (never execution authority over money).
    """
    def __init__(self, profile: BuyerProfile):
        self.profile = profile
        self.system_prompt = BUYER_SYSTEM_PROMPT
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

    def propose(self, initial_order_value: float, round_num: int = 1) -> Proposal:
        """
        Generates initial opening proposal from the buyer using Gemini LLM if available.
        """
        prompt = (
            f"Generate opening proposal for buyer {self.profile.buyer_id}. "
            f"Order value: ₹{initial_order_value}, target credit term: {self.profile.preferred_term_days} days. "
            f"Round: {round_num}."
        )
        llm_raw = self._call_gemini(prompt)
        if llm_raw:
            try:
                return self.validate_llm_output(llm_raw)
            except Exception:
                pass
                
        # Rule-based fallback
        return Proposal(
            order_value=initial_order_value,
            currency="INR",
            quantity=500,
            payment_term_days=self.profile.preferred_term_days,
            discount_percent=0.0,
            delivery_deadline_days=14,
            round=round_num,
            proposer="buyer"
        )

    def respond(self, seller_proposal: Proposal, round_num: int) -> Proposal:
        """
        Formulates a buyer counter-proposal using Gemini LLM if available.
        """
        prompt = (
            f"Seller offered payment term: {seller_proposal.payment_term_days} days, "
            f"discount: {seller_proposal.discount_percent}%. "
            f"Buyer preferred term: {self.profile.preferred_term_days} days. "
            f"Generate buyer counter-proposal for round {round_num}."
        )
        llm_raw = self._call_gemini(prompt)
        if llm_raw:
            try:
                return self.validate_llm_output(llm_raw)
            except Exception:
                pass
                
        # Rule-based fallback
        target_term = max(self.profile.preferred_term_days - (round_num * 5), 30)
        proposed_discount = 0.5 if round_num >= 3 else 0.0
        
        return Proposal(
            order_value=seller_proposal.order_value,
            currency=seller_proposal.currency,
            quantity=seller_proposal.quantity,
            payment_term_days=target_term,
            discount_percent=proposed_discount,
            delivery_deadline_days=seller_proposal.delivery_deadline_days,
            round=round_num,
            proposer="buyer"
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
