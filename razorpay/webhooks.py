import hmac
import hashlib
from typing import Dict, Any, Tuple


def verify_webhook_signature(body: bytes, signature: str, webhook_secret: str) -> bool:
    """
    Verifies the Razorpay webhook HMAC SHA256 signature header (X-Razorpay-Signature).
    Uses constant time comparison to prevent timing attacks.
    """
    if not signature or not webhook_secret:
        return False
    try:
        expected_signature = hmac.new(
            webhook_secret.encode("utf-8"),
            body,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected_signature, signature)
    except Exception:
        return False


def process_webhook_event(payload: Dict[str, Any]) -> Tuple[str, str, Dict[str, Any]]:
    """
    Parses incoming Razorpay webhook event payload.
    
    Returns:
        (event_name, target_id, extracted_entity_data)
        event_name examples: 'payment_link.paid', 'payment_link.expired', 'order.paid'
    """
    event = payload.get("event", "unknown.event")
    payload_data = payload.get("payload", {})
    
    target_id = ""
    entity_info: Dict[str, Any] = {}
    
    if "payment_link" in payload_data:
        entity_info = payload_data["payment_link"].get("entity", {})
        target_id = entity_info.get("id", "")
    elif "payment" in payload_data:
        entity_info = payload_data["payment"].get("entity", {})
        target_id = entity_info.get("id", "")
    elif "order" in payload_data:
        entity_info = payload_data["order"].get("entity", {})
        target_id = entity_info.get("id", "")
        
    return (event, target_id, entity_info)
