import React, { useState } from 'react';
import { CreditCard, ExternalLink, Check, Copy, ShieldCheck } from 'lucide-react';
import type { Proposal, Contract, RazorpayOrder, RazorpayPaymentLink } from '../types';

interface ExecutionCardProps {
  proposal: Proposal;
  contract?: Contract;
  order?: RazorpayOrder;
  paymentLink?: RazorpayPaymentLink;
}

export const ExecutionCard: React.FC<ExecutionCardProps> = ({
  proposal,
  contract,
  order,
  paymentLink,
}) => {
  const [copied, setCopied] = useState(false);

  const orderId = order?.id || contract?.razorpay_order_id || `order_demo_${Date.now().toString().slice(-6)}`;
  const linkId = paymentLink?.id || contract?.razorpay_payment_link_id || `plink_demo_${Date.now().toString().slice(-6)}`;
  const shortUrl = paymentLink?.short_url || `https://rzp.io/i/termwise_${linkId}`;
  
  // Calculate settlement value after discount
  const discountAmount = (proposal.order_value * proposal.discount_percent) / 100;
  const netPayable = proposal.order_value - discountAmount;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#141518] border-2 border-emerald-500/50 rounded-[4px] p-5 space-y-4 shadow-xl font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#262830] pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-[4px] bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold text-white uppercase tracking-wider">RAZORPAY EXECUTION RAIL</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-[4px] bg-emerald-500 text-black font-extrabold uppercase">
                TEST MODE ACTIVE
              </span>
            </div>
            <p className="text-xs text-gray-400 font-sans">Payment link generated with expire_by due date enforcement</p>
          </div>
        </div>
        <div className="text-right font-mono">
          <span className="text-[10px] text-gray-400 block">NET PAYABLE AMOUNT</span>
          <span className="text-base font-extrabold text-emerald-400">₹{netPayable.toLocaleString()}</span>
        </div>
      </div>

      {/* Grid details */}
      <div className="grid grid-cols-3 gap-3 bg-[#0A0B0D] p-3 rounded-[4px] border border-[#262830] font-mono text-xs">
        <div>
          <span className="text-[10px] text-gray-500 block uppercase">RAZORPAY ORDER ID</span>
          <span className="text-indigo-300 font-semibold">{orderId}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 block uppercase">PAYMENT LINK ID</span>
          <span className="text-purple-300 font-semibold">{linkId}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-500 block uppercase">DUE DATE EXPIRY</span>
          <span className="text-amber-300 font-semibold">Net-{proposal.payment_term_days} Days</span>
        </div>
      </div>

      {/* Payment Link URL & Actions */}
      <div className="flex items-center space-x-2 pt-1 font-mono">
        <div className="flex-1 bg-[#0A0B0D] border border-[#262830] rounded-[4px] px-3 py-2 text-xs text-emerald-300 font-mono overflow-x-auto select-all">
          {shortUrl}
        </div>
        <button
          onClick={copyToClipboard}
          className="bg-[#0A0B0D] hover:bg-[#1E2638] border border-[#262830] text-gray-300 hover:text-white px-3 py-2 rounded-[4px] text-xs font-mono flex items-center space-x-1 transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'COPIED' : 'COPY'}</span>
        </button>
        <a
          href={shortUrl}
          target="_blank"
          rel="noreferrer"
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-[4px] text-xs font-mono flex items-center space-x-1.5 transition-all shadow"
        >
          <span>OPEN LINK</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Webhook Execution Footer */}
      <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 pt-2 border-t border-[#262830]/60">
        <div className="flex items-center space-x-1.5 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Webhook HMAC SHA256 Verification Enabled</span>
        </div>
        <span className="text-gray-500">api/webhooks/razorpay</span>
      </div>
    </div>
  );
};
