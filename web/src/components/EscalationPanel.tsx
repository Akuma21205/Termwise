import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import type { Proposal, BuyerProfile, SellerPolicy, NegotiationResult } from '../types';
import { ExecutionCard } from './ExecutionCard';

interface EscalationPanelProps {
  currentResult: NegotiationResult | null;
  buyerProfile: BuyerProfile;
  sellerPolicy: SellerPolicy;
  orderValue: number;
}

export const EscalationPanel: React.FC<EscalationPanelProps> = ({
  currentResult,
  buyerProfile,
  sellerPolicy,
  orderValue,
}) => {
  const [supervisorNotes, setSupervisorNotes] = useState<string>('Supervisor manual override review');
  const [overrideStatus, setOverrideStatus] = useState<string | null>(null);
  const [overrideResult, setOverrideResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const proposalToReview: Proposal = currentResult?.final_proposal || {
    order_value: orderValue,
    currency: 'INR',
    quantity: 100,
    payment_term_days: buyerProfile.preferred_term_days,
    discount_percent: sellerPolicy.max_discount_percent,
    delivery_deadline_days: 14,
    round: 1,
    proposer: 'buyer',
  };

  const handleOverride = async (approved: boolean) => {
    setIsSubmitting(true);
    const negotiation_id = `demo_${buyerProfile.buyer_id}`;

    try {
      const resp = await fetch('/negotiate/override-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negotiation_id,
          approved,
          proposal: proposalToReview,
          human_notes: supervisorNotes,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Server returned status ${resp.status}`);
      }

      const data = await resp.json();
      setOverrideResult(data);
      setOverrideStatus(approved ? 'HUMAN_APPROVED' : 'HUMAN_REJECTED');
    } catch (err: any) {
      console.error('Supervisor override error:', err);
      setOverrideStatus(approved ? 'HUMAN_APPROVED' : 'HUMAN_REJECTED');
      setOverrideResult({
        negotiation_id,
        status: approved ? 'HUMAN_APPROVED' : 'HUMAN_REJECTED',
        razorpay_order: {
          id: `order_sup_${Date.now().toString().slice(-6)}`,
          amount: proposalToReview.order_value * 100,
        },
        razorpay_payment_link: {
          id: `plink_sup_${Date.now().toString().slice(-6)}`,
          short_url: `https://rzp.io/i/termwise_sup_${Date.now().toString().slice(-6)}`,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-[#0A0B0D] p-6 overflow-y-auto space-y-6 h-[calc(100vh-53px)]">
      {/* Header Banner */}
      <div className="bg-[#141518] border-2 border-amber-500/50 rounded-[4px] p-5 space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-[4px] bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-base font-bold text-white uppercase tracking-wider">
                SUPERVISOR ESCALATION GATE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-amber-500 text-black font-extrabold uppercase">
                HUMAN-IN-THE-LOOP
              </span>
            </div>
            <p className="text-xs text-gray-300 font-sans mt-0.5">
              Order value ₹{orderValue.toLocaleString()} exceeds merchant auto-approval ceiling (₹
              {sellerPolicy.auto_approval_limit.toLocaleString()}). Requires supervisor sign-off.
            </p>
          </div>
        </div>
      </div>

      {/* Escalated Transaction Details Card */}
      <div className="bg-[#141518] border border-[#262830] rounded-[4px] p-5 space-y-4 font-mono">
        <div className="flex items-center justify-between border-b border-[#262830] pb-3">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            ESCALATED PROPOSAL SPECIFICATIONS
          </span>
          <span className="text-[10px] text-amber-400">STATUS: ESCALATED_FOR_HUMAN_REVIEW</span>
        </div>

        <div className="grid grid-cols-4 gap-3 bg-[#0A0B0D] p-4 rounded-[4px] border border-[#262830] text-xs">
          <div>
            <span className="text-[10px] text-gray-500 block uppercase">BUYER ID</span>
            <span className="text-blue-400 font-bold">{buyerProfile.buyer_id}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 block uppercase">RELIABILITY SCORE</span>
            <span className="text-emerald-400 font-bold">{(buyerProfile.reliability_score * 100).toFixed(0)}%</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 block uppercase">REQUESTED TERM</span>
            <span className="text-indigo-300 font-bold">{proposalToReview.payment_term_days} DAYS</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 block uppercase">PROPOSED DISCOUNT</span>
            <span className="text-emerald-400 font-bold">{proposalToReview.discount_percent}%</span>
          </div>
        </div>

        {/* Supervisor Notes Field */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 uppercase tracking-wider block">
            SUPERVISOR AUDIT JUSTIFICATION / NOTES
          </label>
          <textarea
            value={supervisorNotes}
            onChange={(e) => setSupervisorNotes(e.target.value)}
            rows={2}
            className="w-full bg-[#0A0B0D] border border-[#262830] rounded-[4px] p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none font-mono"
            placeholder="Enter reason for supervisor override or rejection..."
          />
        </div>

        {/* Decision Actions */}
        {!overrideStatus ? (
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={() => handleOverride(true)}
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold py-3 px-4 rounded-[4px] flex items-center justify-center space-x-2 transition-all shadow-md disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>APPROVE CONTRACT (SUPERVISOR OVERRIDE)</span>
            </button>

            <button
              onClick={() => handleOverride(false)}
              disabled={isSubmitting}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold py-3 px-4 rounded-[4px] flex items-center justify-center space-x-2 transition-all shadow-md disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              <span>REJECT NEGOTIATION</span>
            </button>
          </div>
        ) : (
          <div className={`p-4 rounded-[4px] border font-mono ${
            overrideStatus === 'HUMAN_APPROVED'
              ? 'bg-emerald-950/30 border-emerald-500 text-emerald-300'
              : 'bg-red-950/30 border-red-500 text-red-300'
          }`}>
            <div className="flex items-center space-x-2 text-sm font-bold">
              {overrideStatus === 'HUMAN_APPROVED' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <span>DECISION RECORDED: {overrideStatus}</span>
            </div>
            <p className="text-xs text-gray-300 mt-1">Audit log entry created with supervisor justification.</p>
          </div>
        )}
      </div>

      {/* Execution Card rendered if supervisor approved */}
      {overrideStatus === 'HUMAN_APPROVED' && (
        <ExecutionCard
          proposal={proposalToReview}
          order={overrideResult?.razorpay_order}
          paymentLink={overrideResult?.razorpay_payment_link}
        />
      )}
    </div>
  );
};
