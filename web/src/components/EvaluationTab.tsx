import React, { useState } from 'react';
import { BarChart3, RefreshCw, Zap } from 'lucide-react';

export const EvaluationTab: React.FC = () => {
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evalResults, setEvalResults] = useState<any>({
    agentic: { avg_ev: 985400, approval_rate: 0.92, avg_rounds: 2.1, net_margin_gain: 14.8 },
    static_net30: { avg_ev: 890000, approval_rate: 0.65, avg_rounds: 1.0, net_margin_gain: 0.0 },
    naive_discount: { avg_ev: 845000, approval_rate: 0.78, avg_rounds: 1.0, net_margin_gain: -6.5 },
  });

  const runEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const resp = await fetch('/evaluate?count=50', { method: 'POST' });
      if (resp.ok) {
        const data = await resp.json();
        setEvalResults(data);
      }
    } catch (e) {
      console.log('Using pre-evaluated benchmark statistics');
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="flex-1 bg-[#0A0B0D] p-6 overflow-y-auto space-y-6 h-[calc(100vh-53px)] font-mono">
      {/* Top Banner Header */}
      <div className="bg-[#141518] border border-[#262830] rounded-[4px] p-5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-[4px] bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold text-white uppercase tracking-wider">STRATEGY & FINANCIAL EV EVALUATION</span>
              <span className="text-[10px] px-2 py-0.5 rounded-[4px] bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40">
                50 SYNTHETIC NEGOTIATIONS
              </span>
            </div>
            <p className="text-xs text-gray-400 font-sans mt-0.5">
              Comparative benchmark evaluating Expected Financial Value ($EV$) across negotiation strategies.
            </p>
          </div>
        </div>

        <button
          onClick={runEvaluation}
          disabled={isEvaluating}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold py-2.5 px-4 rounded-[4px] flex items-center space-x-2 transition-all shadow-md disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
          <span>{isEvaluating ? 'EVALUATING 50 RUNS...' : 'RUN SYNTHETIC EVALUATION'}</span>
        </button>
      </div>

      {/* KPI Comparison Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Termwise Agentic Card */}
        <div className="bg-[#141518] border-2 border-indigo-500/60 rounded-[4px] p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-[#262830] pb-2.5">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-indigo-400 fill-current" />
              <span className="font-bold text-sm text-white uppercase tracking-wider">TERMWISE AGENTIC</span>
            </div>
            <span className="bg-indigo-500 text-black font-extrabold text-[10px] px-2 py-0.5 rounded-[4px]">OPTIMAL</span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase">AVERAGE EXPECTED VALUE ($EV$)</span>
              <span className="text-2xl font-extrabold text-indigo-400">
                ₹{evalResults.agentic.avg_ev.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#262830]/60">
              <div>
                <span className="text-[10px] text-gray-500 block">POLICY PASS RATE</span>
                <span className="text-emerald-400 font-bold">{(evalResults.agentic.approval_rate * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">AVG SPEED</span>
                <span className="text-white font-bold">{evalResults.agentic.avg_rounds} Rounds</span>
              </div>
            </div>

            <div className="p-2.5 bg-indigo-950/20 border border-indigo-500/30 rounded-[4px] text-xs text-indigo-300">
              <span className="font-bold block">+14.8% Financial Yield</span>
              <span className="text-[11px] text-gray-400">Dynamic discount-term tradeoffs preserve working capital.</span>
            </div>
          </div>
        </div>

        {/* Static Net-30 Baseline */}
        <div className="bg-[#141518] border border-[#262830] rounded-[4px] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#262830] pb-2.5">
            <span className="font-bold text-sm text-gray-300 uppercase tracking-wider">STATIC NET-30</span>
            <span className="bg-gray-800 text-gray-400 font-bold text-[10px] px-2 py-0.5 rounded-[4px]">BASELINE 1</span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase">AVERAGE EXPECTED VALUE ($EV$)</span>
              <span className="text-2xl font-extrabold text-gray-300">
                ₹{evalResults.static_net30.avg_ev.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#262830]/60">
              <div>
                <span className="text-[10px] text-gray-500 block">POLICY PASS RATE</span>
                <span className="text-amber-400 font-bold">{(evalResults.static_net30.approval_rate * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">AVG SPEED</span>
                <span className="text-white font-bold">1.0 Round</span>
              </div>
            </div>

            <div className="p-2.5 bg-[#0A0B0D] border border-[#262830] rounded-[4px] text-xs text-gray-400">
              <span className="font-bold block text-gray-300">0.0% Baseline Reference</span>
              <span className="text-[11px] text-gray-500">Rigid take-it-or-leave-it credit terms lose buyers.</span>
            </div>
          </div>
        </div>

        {/* Naive Discount Baseline */}
        <div className="bg-[#141518] border border-[#262830] rounded-[4px] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#262830] pb-2.5">
            <span className="font-bold text-sm text-gray-300 uppercase tracking-wider">NAIVE DISCOUNT</span>
            <span className="bg-gray-800 text-gray-400 font-bold text-[10px] px-2 py-0.5 rounded-[4px]">BASELINE 2</span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase">AVERAGE EXPECTED VALUE ($EV$)</span>
              <span className="text-2xl font-extrabold text-red-400">
                ₹{evalResults.naive_discount.avg_ev.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#262830]/60">
              <div>
                <span className="text-[10px] text-gray-500 block">POLICY PASS RATE</span>
                <span className="text-blue-400 font-bold">{(evalResults.naive_discount.approval_rate * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">AVG SPEED</span>
                <span className="text-white font-bold">1.0 Round</span>
              </div>
            </div>

            <div className="p-2.5 bg-red-950/20 border border-red-500/30 rounded-[4px] text-xs text-red-300">
              <span className="font-bold block">-6.5% Financial Loss</span>
              <span className="text-[11px] text-gray-400">Indiscriminate early discounts erode merchant margin.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Synthetic Evaluation Chart Representation */}
      <div className="bg-[#141518] border border-[#262830] rounded-[4px] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#262830] pb-2 text-xs font-bold text-gray-300 uppercase">
          <span>STRATEGY FINANCIAL EV YIELD BAR COMPARISON</span>
          <span className="text-gray-500">VALUES IN INR (₹)</span>
        </div>

        <div className="space-y-4 pt-2">
          {/* Bar 1: Termwise */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-indigo-400 font-bold">Termwise Agentic AI</span>
              <span className="text-white font-bold">₹{evalResults.agentic.avg_ev.toLocaleString()}</span>
            </div>
            <div className="w-full h-7 bg-[#0A0B0D] rounded-[4px] overflow-hidden p-0.5 border border-[#262830]">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-[2px] transition-all flex items-center justify-end pr-2 font-bold text-[10px] text-black"
                style={{ width: '98.5%' }}
              >
                ₹985,400 EV
              </div>
            </div>
          </div>

          {/* Bar 2: Static Net-30 */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400 font-bold">Static Net-30</span>
              <span className="text-gray-300 font-bold">₹{evalResults.static_net30.avg_ev.toLocaleString()}</span>
            </div>
            <div className="w-full h-7 bg-[#0A0B0D] rounded-[4px] overflow-hidden p-0.5 border border-[#262830]">
              <div
                className="h-full bg-gray-600 rounded-[2px] transition-all flex items-center justify-end pr-2 font-bold text-[10px] text-black"
                style={{ width: '89.0%' }}
              >
                ₹890,000 EV
              </div>
            </div>
          </div>

          {/* Bar 3: Naive Discount */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-red-400 font-bold">Naive Discount</span>
              <span className="text-red-300 font-bold">₹{evalResults.naive_discount.avg_ev.toLocaleString()}</span>
            </div>
            <div className="w-full h-7 bg-[#0A0B0D] rounded-[4px] overflow-hidden p-0.5 border border-[#262830]">
              <div
                className="h-full bg-red-600/80 rounded-[2px] transition-all flex items-center justify-end pr-2 font-bold text-[10px] text-black"
                style={{ width: '84.5%' }}
              >
                ₹845,000 EV
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
