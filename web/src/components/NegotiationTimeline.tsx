import React from 'react';
import { Bot, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { NegotiationResult, BuyerProfile, SellerPolicy } from '../types';
import { ExecutionCard } from './ExecutionCard';

interface NegotiationTimelineProps {
  result: NegotiationResult | null;
  isLoading: boolean;
  buyerProfile: BuyerProfile;
  sellerPolicy: SellerPolicy;
  orderValue: number;
  onOpenSupervisorGate?: () => void;
}

export const NegotiationTimeline: React.FC<NegotiationTimelineProps> = ({
  result,
  isLoading,
  sellerPolicy,
  orderValue,
  onOpenSupervisorGate,
}) => {
  if (isLoading) {
    return (
      <div className="flex-1 bg-[#0A0B0D] p-6 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center font-mono space-y-1">
          <p className="text-sm font-bold text-white tracking-wide">EXECUTING AGENTIC NEGOTIATION LOOP...</p>
          <p className="text-xs text-gray-400">Buyer AI & Seller AI calculating expected values under policy bounds</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex-1 bg-[#0A0B0D] p-8 flex flex-col items-center justify-center space-y-4 text-center">
        <div className="w-16 h-16 rounded-[4px] bg-[#141518] border border-[#262830] flex items-center justify-center text-indigo-400">
          <Bot className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-2 font-sans">
          <h3 className="text-base font-mono font-bold text-white uppercase tracking-wider">Ready to Negotiate</h3>
          <p className="text-xs text-gray-400">
            Configure Buyer Profile and Seller Policy bounds in the left panel, then click <span className="text-indigo-400 font-mono font-semibold">RUN AI NEGOTIATION</span> to initiate the turn-based protocol.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full max-w-lg pt-4 font-mono text-[11px]">
          <div className="p-3 bg-[#141518] border border-[#262830] rounded-[4px] text-left">
            <span className="text-gray-500 text-[10px] block">RULE 1</span>
            <span className="text-white font-semibold block mt-0.5">Zero Authority Over Money</span>
            <span className="text-gray-400 text-[10px]">LLMs propose; Policy Engine decides.</span>
          </div>
          <div className="p-3 bg-[#141518] border border-[#262830] rounded-[4px] text-left">
            <span className="text-gray-500 text-[10px] block">RULE 2</span>
            <span className="text-white font-semibold block mt-0.5">Strict 5-Round Cap</span>
            <span className="text-gray-400 text-[10px]">Deterministic state machine termination.</span>
          </div>
          <div className="p-3 bg-[#141518] border border-[#262830] rounded-[4px] text-left">
            <span className="text-gray-500 text-[10px] block">RULE 3</span>
            <span className="text-white font-semibold block mt-0.5">Razorpay Rail</span>
            <span className="text-gray-400 text-[10px]">Payment links with expire_by due dates.</span>
          </div>
        </div>
      </div>
    );
  }

  const { status, history, final_proposal, contract, razorpay_order, razorpay_payment_link } = result;

  return (
    <div className="flex-1 bg-[#0A0B0D] p-6 overflow-y-auto space-y-6 h-[calc(100vh-53px)]">
      {/* Top Banner Status */}
      <div className={`p-4 rounded-[4px] border flex items-center justify-between font-mono ${
        status === 'APPROVED'
          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
          : status === 'ESCALATED'
          ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
          : 'bg-red-950/20 border-red-500/40 text-red-300'
      }`}>
        <div className="flex items-center space-x-3">
          {status === 'APPROVED' && <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />}
          {status === 'ESCALATED' && <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />}
          {status !== 'APPROVED' && status !== 'ESCALATED' && <XCircle className="w-6 h-6 text-red-400 shrink-0" />}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-wider uppercase">STATUS: {status}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-[4px] bg-black/40 border border-current font-mono font-bold">
                {history.length} ROUNDS
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-0.5 font-sans">
              {status === 'APPROVED' && 'Policy Engine approved final proposal terms. Razorpay execution link active.'}
              {status === 'ESCALATED' && `Order value ₹${orderValue.toLocaleString()} exceeds Auto-Approval limit (₹${sellerPolicy.auto_approval_limit.toLocaleString()}). Routed to Supervisor Gate.`}
              {status === 'REJECTED' && 'Negotiation terminated as proposal violated hard seller policy bounds.'}
              {status === 'MAX_ROUNDS_EXCEEDED' && 'Negotiation protocol reached 5-round limit without reaching consensus.'}
            </p>
          </div>
        </div>

        {status === 'ESCALATED' && onOpenSupervisorGate && (
          <button
            onClick={onOpenSupervisorGate}
            className="bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold py-2 px-3 rounded-[4px] transition-all flex items-center space-x-1.5 shadow"
          >
            <span>⏸ Paused — awaiting human review &nbsp;·&nbsp; REVIEW IN SUPERVISOR GATE &rarr;</span>
          </button>
        )}
      </div>

      {/* Round Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#262830] pb-2 font-mono">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">NEGOTIATION ROUND TRAJECTORY</span>
          <span className="text-[10px] text-gray-500">POLICY_ENGINE_GATE = HARD</span>
        </div>

        <div className="space-y-3">
          {history.map((entry, idx) => {
            const isBuyer = entry.proposer === 'buyer';
            return (
              <div
                key={idx}
                className="bg-[#141518] border border-[#262830] rounded-[4px] p-4 space-y-3 hover:border-[#3B82F6]/50 transition-all"
              >
                {/* Round Row Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="bg-[#0A0B0D] border border-[#262830] px-2 py-0.5 rounded-[4px] text-xs font-bold text-indigo-400">
                      ROUND {entry.round}
                    </span>
                    <span className={`text-xs font-bold uppercase ${isBuyer ? 'text-blue-400' : 'text-purple-400'}`}>
                      {isBuyer ? '🤖 BUYER AGENT' : '🤖 SELLER AGENT'}
                    </span>
                  </div>

                  {/* Visual Solid Decision Badge */}
                  <span
                    className={`font-mono text-xs font-extrabold uppercase px-2.5 py-1 rounded-[4px] tracking-wider text-black ${
                      entry.decision === 'APPROVE'
                        ? 'bg-emerald-400'
                        : entry.decision === 'ESCALATE'
                        ? 'bg-amber-400'
                        : 'bg-red-400'
                    }`}
                  >
                    {entry.decision}
                  </span>
                </div>

                {/* Proposal Parameters Grid */}
                <div className="grid grid-cols-4 gap-2 bg-[#0A0B0D] p-2.5 rounded-[4px] border border-[#262830] font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-gray-500 block">ORDER VALUE</span>
                    <span className="text-white font-semibold">₹{entry.proposal.order_value.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">CREDIT TERM</span>
                    <span className="text-indigo-300 font-semibold">{entry.proposal.payment_term_days} DAYS</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">EARLY DISCOUNT</span>
                    <span className="text-emerald-400 font-semibold">{entry.proposal.discount_percent}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">DELIVERY</span>
                    <span className="text-gray-300">{entry.proposal.delivery_deadline_days} DAYS</span>
                  </div>
                </div>

                {/* Policy Rationale */}
                <div className="text-xs font-mono text-gray-400 flex items-start space-x-1.5 bg-[#0A0B0D]/50 p-2 rounded-[4px]">
                  <span className="text-gray-600 font-bold">&gt;</span>
                  <span>{entry.reason}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Razorpay Execution Rail Component (If Approved) */}
      {(status === 'APPROVED' || contract) && final_proposal && (
        <ExecutionCard
          proposal={final_proposal}
          contract={contract}
          order={razorpay_order}
          paymentLink={razorpay_payment_link}
        />
      )}
    </div>
  );
};
