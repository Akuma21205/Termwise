import React from 'react';
import { Sliders, Zap, UserCheck, ShieldAlert, DollarSign } from 'lucide-react';
import type { BuyerProfile, SellerPolicy } from '../types';

interface ConfigSidebarProps {
  buyerProfile: BuyerProfile;
  setBuyerProfile: React.Dispatch<React.SetStateAction<BuyerProfile>>;
  sellerPolicy: SellerPolicy;
  setSellerPolicy: React.Dispatch<React.SetStateAction<SellerPolicy>>;
  orderValue: number;
  setOrderValue: React.Dispatch<React.SetStateAction<number>>;
  onRunNegotiation: () => void;
  isLoading: boolean;
}

export const ConfigSidebar: React.FC<ConfigSidebarProps> = ({
  buyerProfile,
  setBuyerProfile,
  sellerPolicy,
  setSellerPolicy,
  orderValue,
  setOrderValue,
  onRunNegotiation,
  isLoading,
}) => {
  const applyPreset = (preset: 'enterprise' | 'high_risk' | 'cash_pressure') => {
    if (preset === 'enterprise') {
      setBuyerProfile({
        buyer_id: 'B_ENT_901',
        reliability_score: 0.95,
        avg_payment_delay_days: 2,
        preferred_term_days: 60,
      });
      setOrderValue(5000000);
      setSellerPolicy((prev) => ({
        ...prev,
        max_discount_percent: 5.0,
        max_term_days: 60,
        auto_approval_limit: 10000000,
      }));
    } else if (preset === 'high_risk') {
      setBuyerProfile({
        buyer_id: 'B_RISK_404',
        reliability_score: 0.60,
        avg_payment_delay_days: 18,
        preferred_term_days: 90,
      });
      setOrderValue(1200000);
      setSellerPolicy((prev) => ({
        ...prev,
        max_discount_percent: 3.0,
        max_term_days: 45,
        auto_approval_limit: 1000000,
      }));
    } else if (preset === 'cash_pressure') {
      setBuyerProfile({
        buyer_id: 'B_SME_102',
        reliability_score: 0.85,
        avg_payment_delay_days: 5,
        preferred_term_days: 45,
      });
      setOrderValue(750000);
      setSellerPolicy((prev) => ({
        ...prev,
        max_discount_percent: 8.0,
        max_term_days: 30,
        cash_pressure_level: 0.85,
        financing_cost_annual_percent: 15.0,
        auto_approval_limit: 2000000,
      }));
    }
  };

  return (
    <aside className="w-[280px] bg-[#141518] border-r border-[#262830] p-4 flex flex-col justify-between shrink-0 overflow-y-auto h-[calc(100vh-53px)] font-sans">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262830] pb-2.5">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">NEGOTIATION CONFIG</span>
          </div>
          <span className="text-[10px] font-mono text-gray-500">PARAM_GATE_v1</span>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">QUICK SCENARIO PRESETS</label>
          <div className="grid grid-cols-3 gap-1 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => applyPreset('enterprise')}
              className="bg-[#0A0B0D] hover:bg-indigo-950/40 border border-[#262830] hover:border-indigo-500/50 text-indigo-300 py-1.5 px-1 rounded-[4px] font-medium transition-all"
            >
              🚀 Enterprise
            </button>
            <button
              type="button"
              onClick={() => applyPreset('high_risk')}
              className="bg-[#0A0B0D] hover:bg-amber-950/40 border border-[#262830] hover:border-amber-500/50 text-amber-300 py-1.5 px-1 rounded-[4px] font-medium transition-all"
            >
              ⚠️ High Risk
            </button>
            <button
              type="button"
              onClick={() => applyPreset('cash_pressure')}
              className="bg-[#0A0B0D] hover:bg-emerald-950/40 border border-[#262830] hover:border-emerald-500/50 text-emerald-300 py-1.5 px-1 rounded-[4px] font-medium transition-all"
            >
              ⚡ Fast Cash
            </button>
          </div>
        </div>

        {/* Order Details */}
        <div className="space-y-2 pt-1 border-t border-[#262830]/60">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono text-gray-300 uppercase tracking-wider flex items-center space-x-1">
              <DollarSign className="w-3 h-3 text-indigo-400" />
              <span>Order Value (INR)</span>
            </label>
            <span className="font-mono text-xs font-bold text-white">₹{orderValue.toLocaleString()}</span>
          </div>
          <input
            type="number"
            value={orderValue}
            onChange={(e) => setOrderValue(Number(e.target.value))}
            step={50000}
            min={100000}
            max={10000000}
            className="w-full bg-[#0A0B0D] border border-[#262830] rounded-[4px] px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Buyer Parameters Section */}
        <div className="space-y-3 pt-2 border-t border-[#262830]/60">
          <div className="flex items-center space-x-1.5">
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-mono text-blue-400 font-bold uppercase tracking-wider">BUYER PROFILE</span>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-gray-400">BUYER ID</label>
            <input
              type="text"
              value={buyerProfile.buyer_id}
              onChange={(e) => setBuyerProfile({ ...buyerProfile, buyer_id: e.target.value })}
              className="w-full bg-[#0A0B0D] border border-[#262830] rounded-[4px] px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-gray-400">PAYMENT RELIABILITY</span>
              <span className={`font-bold ${buyerProfile.reliability_score >= 0.8 ? 'text-emerald-400' : buyerProfile.reliability_score >= 0.65 ? 'text-amber-400' : 'text-red-400'}`}>
                {(buyerProfile.reliability_score * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.30"
              max="1.00"
              step="0.05"
              value={buyerProfile.reliability_score}
              onChange={(e) => setBuyerProfile({ ...buyerProfile, reliability_score: Number(e.target.value) })}
              className="w-full h-1.5 bg-[#0A0B0D] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-gray-400">PREFERRED CREDIT TERM</span>
              <span className="text-white font-bold">{buyerProfile.preferred_term_days} DAYS</span>
            </div>
            <input
              type="range"
              min="15"
              max="90"
              step="5"
              value={buyerProfile.preferred_term_days}
              onChange={(e) => setBuyerProfile({ ...buyerProfile, preferred_term_days: Number(e.target.value) })}
              className="w-full h-1.5 bg-[#0A0B0D] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* Seller Policy Bounds Section */}
        <div className="space-y-3 pt-2 border-t border-[#262830]/60">
          <div className="flex items-center space-x-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider">SELLER POLICY BOUNDS</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-gray-400">MAX ALLOWED DISCOUNT</span>
              <span className="text-emerald-400 font-bold">{sellerPolicy.max_discount_percent}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="10.0"
              step="0.5"
              value={sellerPolicy.max_discount_percent}
              onChange={(e) => setSellerPolicy({ ...sellerPolicy, max_discount_percent: Number(e.target.value) })}
              className="w-full h-1.5 bg-[#0A0B0D] rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-gray-400">MAX CREDIT TERM</span>
              <span className="text-emerald-400 font-bold">{sellerPolicy.max_term_days} DAYS</span>
            </div>
            <input
              type="range"
              min="15"
              max="90"
              step="5"
              value={sellerPolicy.max_term_days}
              onChange={(e) => setSellerPolicy({ ...sellerPolicy, max_term_days: Number(e.target.value) })}
              className="w-full h-1.5 bg-[#0A0B0D] rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-gray-400">AUTO-APPROVAL CEILING</span>
              <span className="text-amber-400 font-bold">₹{(sellerPolicy.auto_approval_limit / 100000).toFixed(1)}L</span>
            </div>
            <input
              type="range"
              min="500000"
              max="5000000"
              step="250000"
              value={sellerPolicy.auto_approval_limit}
              onChange={(e) => setSellerPolicy({ ...sellerPolicy, auto_approval_limit: Number(e.target.value) })}
              className="w-full h-1.5 bg-[#0A0B0D] rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            {orderValue > sellerPolicy.auto_approval_limit && (
              <p className="text-[10px] font-mono text-amber-400 mt-1 flex items-center space-x-1">
                <span>⚠️ Order exceeds ceiling &rarr; Triggers Supervisor Gate</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Launch Button */}
      <div className="pt-4 border-t border-[#262830]">
        <button
          type="button"
          onClick={onRunNegotiation}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-mono text-xs font-bold py-2.5 px-3 rounded-[4px] flex items-center justify-center space-x-2 transition-all shadow-md disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>NEGOTIATING...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-current text-amber-300" />
              <span>RUN AI NEGOTIATION</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
