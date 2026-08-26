"""
tests/razorpay/test_webhook_signature.py

Your existing test_payment_expiry.py calls process_webhook_event() on a
hand-built payload, which never exercises verify_webhook_signature(). For
a project whose whole pitch is "every money action is gated," an
untested webhook auth path is the single gap most likely to get poked at
by a technical panel. This closes it.

Adjust the import path for verify_webhook_signature to match your actual
razorpay/webhooks.py location/signature if it differs.
"""

import hmac
import hashlib
import json
import pytest

from razorpay.webhooks import verify_webhook_signature

WEBHOOK_SECRET = "test_webhook_secret_for_ci"


def _sign(payload_bytes: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), payload_bytes, hashlib.sha256).hexdigest()


def test_valid_signature_is_accepted():
    payload = {"event": "payment_link.expired", "payload": {"payment_link": {"entity": {"id": "plink_test123"}}}}
    body = json.dumps(payload).encode()
    signature = _sign(body, WEBHOOK_SECRET)

    assert verify_webhook_signature(body, signature, WEBHOOK_SECRET) is True


def test_forged_signature_is_rejected():
    payload = {"event": "payment_link.expired", "payload": {"payment_link": {"entity": {"id": "plink_test123"}}}}
    body = json.dumps(payload).encode()
    forged_signature = "0" * 64  # syntactically valid hex, wrong value

    assert verify_webhook_signature(body, forged_signature, WEBHOOK_SECRET) is False


def test_missing_signature_is_rejected():
    payload = {"event": "payment_link.expired", "payload": {"payment_link": {"entity": {"id": "plink_test123"}}}}
    body = json.dumps(payload).encode()

    assert verify_webhook_signature(body, "", WEBHOOK_SECRET) is False
    assert verify_webhook_signature(body, None, WEBHOOK_SECRET) is False



def test_tampered_payload_invalidates_valid_signature():
    """
    Signature computed over the original payload must NOT validate
    against a payload that was modified after signing — this is the
    actual attack this check exists to prevent (e.g. attacker changes
    order_value after a legit signature was generated for a different body).
    """
    original_payload = {"event": "payment_link.paid", "payload": {"payment_link": {"entity": {"id": "plink_test123", "amount": 100000}}}}
    original_body = json.dumps(original_payload).encode()
    signature = _sign(original_body, WEBHOOK_SECRET)

    tampered_payload = dict(original_payload)
    tampered_payload["payload"]["payment_link"]["entity"]["amount"] = 1  # attacker lowers the amount
    tampered_body = json.dumps(tampered_payload).encode()

    assert verify_webhook_signature(tampered_body, signature, WEBHOOK_SECRET) is False
