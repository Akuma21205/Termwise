import matplotlib.pyplot as plt
import os
from typing import Dict, Tuple

from simulator.generate import generate_synthetic_dataset
from simulator.baselines import fixed_net30_baseline, rule_based_baseline, evaluate_baseline_expected_value
from agents.orchestrator import run_negotiation_loop
from core.economic_model import calculate_expected_value


def run_evaluation(dataset_count: int = 50, output_image_path: str = "eval_result.png") -> Dict[str, float]:
    """
    Evaluates 3 strategies over a synthetic dataset of 50 negotiations:
    1. Fixed Net-30 Baseline
    2. Rule-Based Baseline
    3. Termwise Agentic System
    
    Generates a bar chart PNG matching the evaluation specification in ARCHITECTURE.md.
    """
    dataset = generate_synthetic_dataset(seed=42, count=dataset_count)
    
    total_ev_net30 = 0.0
    total_ev_rule = 0.0
    total_ev_agentic = 0.0
    
    approved_count_agentic = 0
    
    for buyer, seller, order_value in dataset:
        # 1. Fixed Net-30
        prop_net30 = fixed_net30_baseline(buyer, seller, order_value)
        total_ev_net30 += evaluate_baseline_expected_value(prop_net30, buyer, seller)
        
        # 2. Rule-Based
        prop_rule = rule_based_baseline(buyer, seller, order_value)
        total_ev_rule += evaluate_baseline_expected_value(prop_rule, buyer, seller)
        
        # 3. Agentic Negotiator
        status, history, final_proposal, contract = run_negotiation_loop(buyer, seller, order_value)
        if status == "APPROVED":
            approved_count_agentic += 1
            ev_agent = calculate_expected_value(final_proposal, buyer, seller)
        else:
            # Fallback for escalated/rejected negotiations
            ev_agent = calculate_expected_value(prop_net30, buyer, seller)
            
        total_ev_agentic += ev_agent

    avg_net30 = round(total_ev_net30 / dataset_count, 2)
    avg_rule = round(total_ev_rule / dataset_count, 2)
    avg_agentic = round(total_ev_agentic / dataset_count, 2)
    
    results = {
        "Fixed Net-30": avg_net30,
        "Rule-Based": avg_rule,
        "Termwise Agentic": avg_agentic
    }
    
    # Generate single evaluation bar chart
    fig, ax = plt.subplots(figsize=(8, 5))
    categories = list(results.keys())
    values = list(results.values())
    colors = ["#9E9E9E", "#42A5F5", "#2E7D32"]
    
    bars = ax.bar(categories, values, color=colors, width=0.5)
    ax.set_ylabel("Average Expected Value (INR)", fontsize=11, fontweight="bold")
    ax.set_title("Strategy Comparison: Expected Financial Value per Negotiation", fontsize=12, fontweight="bold")
    ax.set_ylim(0, max(values) * 1.2)
    
    for bar in bars:
        height = bar.get_height()
        ax.annotate(
            f"₹{height:,.0f}",
            xy=(bar.get_x() + bar.get_width() / 2, height),
            xytext=(0, 3),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontweight="bold"
        )
        
    plt.tight_layout()
    plt.savefig(output_image_path, dpi=150)
    plt.close()
    
    return results


if __name__ == "__main__":
    print("Running Termwise System Evaluation over 50 synthetic negotiations...")
    res = run_evaluation()
    print("\n--- Evaluation Summary ---")
    for strategy, avg_ev in res.items():
        print(f"{strategy}: Average Expected Value = ₹{avg_ev:,.2f}")
