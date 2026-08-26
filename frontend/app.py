import sys
import os

# Ensure workspace root directory is in sys.path when running via `streamlit run frontend/app.py`
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import streamlit as st
import json
from core.models import BuyerProfile, SellerPolicy
from agents.orchestrator import run_negotiation_loop
from razorpay.client import RazorpayClient
from simulator.run_eval import run_evaluation
from api.db import init_db, log_audit_entry, get_audit_trail

st.set_page_config(
    page_title="Termwise - AI-to-AI B2B Payment Negotiator",
    page_icon="🤝",
    layout="wide"
)

# Page header
st.title("🤝 Termwise - AI-to-AI B2B Payment Negotiator")
st.caption("Track 1: AI Growth & Agentic Commerce | Razorpay AI Buildathon 2026")
st.markdown("> *LLM proposes. Policy decides. Razorpay executes. Data learns.*")

init_db()

# Sidebar controls
st.sidebar.header("⚙️ Negotiation Configuration")

st.sidebar.subheader("Buyer Parameters")
buyer_id = st.sidebar.text_input("Buyer ID", "B001")
order_value = st.sidebar.number_input("Order Value (INR)", min_value=100000.0, max_value=5000000.0, value=1000000.0, step=50000.0)
buyer_reliability = st.sidebar.slider("Buyer Payment Reliability Score", 0.0, 1.0, 0.85, 0.05)
buyer_preferred_term = st.sidebar.slider("Buyer Target Credit Term (Days)", 15, 90, 60, 5)

st.sidebar.subheader("Seller Policy Engine Bounds")
seller_max_discount = st.sidebar.slider("Max Allowed Discount (%)", 0.0, 10.0, 5.0, 0.5)
seller_max_term = st.sidebar.slider("Max Allowed Credit Term (Days)", 15, 90, 45, 5)
auto_approval_limit = st.sidebar.number_input("Auto-Approval Ceiling (INR)", value=1000000.0, step=100000.0)

# Main layout tabs
tab1, tab2, tab3 = st.tabs(["🚀 Live Negotiation Demo", "📜 Append-Only Audit Trail", "📊 Evaluation Chart"])

with tab1:
    st.subheader("Simulate B2B Payment Term Negotiation")
    
    if st.button("▶️ Run AI-to-AI Negotiation", type="primary"):
        buyer_profile = BuyerProfile(
            buyer_id=buyer_id,
            reliability_score=buyer_reliability,
            preferred_term_days=buyer_preferred_term
        )
        seller_policy = SellerPolicy(
            max_discount_percent=seller_max_discount,
            max_term_days=seller_max_term,
            auto_approval_limit=auto_approval_limit
        )
        
        negotiation_id = f"demo_{buyer_id}"
        
        with st.spinner("Running agentic negotiation loop with deterministic policy gating..."):
            status, history, final_proposal, contract = run_negotiation_loop(
                buyer_profile=buyer_profile,
                seller_policy=seller_policy,
                order_value=order_value
            )
            
        # Display Outcome Banner
        if status == "APPROVED":
            st.success(f"✅ Negotiation RESOLVED & APPROVED! Status: {status}")
        elif status == "ESCALATED":
            st.warning(f"⚠️ Order value exceeds Auto-Approval Limit! Status: {status} (Routed to Human Review)")
        else:
            st.error(f"❌ Negotiation Terminated: {status}")
            
        st.markdown("### Negotiation Round Log")
        for entry in history:
            col1, col2, col3 = st.columns([1, 4, 2])
            with col1:
                st.markdown(f"**Round {entry['round']}**")
                st.caption(f"By: `{entry['proposer']}`")
            with col2:
                prop = entry['proposal']
                st.json(prop)
            with col3:
                dec = entry['decision']
                if dec == "APPROVE":
                    st.success(f"Badge: {dec}")
                elif dec == "ESCALATE":
                    st.warning(f"Badge: {dec}")
                else:
                    st.error(f"Badge: {dec}")
                st.caption(entry['reason'])
                
        # Razorpay Execution Section
        if status == "APPROVED" and final_proposal:
            st.markdown("---")
            st.markdown("### 💳 Razorpay Payment Lifecycle Execution")
            rzp = RazorpayClient()
            order = rzp.create_order(final_proposal, negotiation_id)
            plink = rzp.create_payment_link(final_proposal, order["id"])
            
            col_a, col_b = st.columns(2)
            with col_a:
                st.info(f"**Razorpay Order Created:** `{order['id']}`")
                st.write(f"**Amount:** ₹{order['amount'] / 100:,.2f}")
            with col_b:
                st.info(f"**Payment Link Created:** `{plink['id']}`")
                st.write(f"**Expiry (Due Date):** Net-{final_proposal.payment_term_days} days")
                st.markdown(f"[🔗 Open Razorpay Payment Link]({plink['short_url']})")

with tab2:
    st.subheader("Chronological Audit Trail")
    st.caption("Append-only immutable record of all policy decisions and API events")
    demo_neg_id = st.text_input("Enter Negotiation ID to inspect", f"demo_{buyer_id}")
    if st.button("Fetch Audit Trail"):
        trail = get_audit_trail(demo_neg_id)
        if trail:
            st.dataframe(trail, use_container_width=True)
        else:
            st.info("No audit entries found for this ID yet. Run a negotiation in Tab 1 first.")

with tab3:
    st.subheader("Evaluation: Agentic System vs. Baselines")
    st.caption("Comparative Expected Financial Value over 50 synthetic negotiations")
    
    if st.button("🔄 Run / Refresh Evaluation"):
        with st.spinner("Evaluating 50 synthetic negotiations across 3 strategies..."):
            res = run_evaluation(dataset_count=50)
            st.json(res)
            
    if os.path.exists("eval_result.png"):
        st.image("eval_result.png", caption="Evaluation Chart: Agentic vs Baselines")
    else:
        st.info("Click the button above to run evaluation and generate chart.")
