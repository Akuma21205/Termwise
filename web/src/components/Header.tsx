import React, { useEffect, useState } from 'react';
import { Terminal, Shield, BarChart3, Clock, FileText } from 'lucide-react';

interface HeaderProps {
  activeTab: 'negotiation' | 'supervisor' | 'audit' | 'evaluation';
  setActiveTab: (tab: 'negotiation' | 'supervisor' | 'audit' | 'evaluation') => void;
  escalatedCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, escalatedCount = 0 }) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isApiConnected, setIsApiConnected] = useState<boolean>(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toISOString().substring(11, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('/audit?negotiation_id=health_check')
      .then(() => setIsApiConnected(true))
      .catch(() => setIsApiConnected(false));
  }, []);

  return (
    <header className="bg-[#141518] border-b border-[#262830] px-4 py-2.5 flex items-center justify-between sticky top-0 z-50">
      {/* Left: Logo & Subtitle */}
      <div className="flex items-center space-x-3">
        <div className="bg-indigo-600/20 border border-indigo-500/40 p-1.5 rounded-[4px] flex items-center justify-center">
          <Terminal className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white tracking-wider text-base font-mono">TERMWISE</span>
            <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-[4px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono">
              B2B TRADING TERMINAL
            </span>
          </div>
          <p className="text-[11px] text-gray-400 font-sans">
            AI-to-AI Payment Term Negotiator <span className="text-gray-600">|</span> Razorpay AI Buildathon 2026
          </p>
        </div>
      </div>

      {/* Center: Navigation Tabs */}
      <nav className="flex items-center space-x-1 bg-[#0A0B0D] p-1 rounded-[4px] border border-[#262830]">
        <button
          onClick={() => setActiveTab('negotiation')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] transition-all font-mono ${
            activeTab === 'negotiation'
              ? 'bg-[#141518] text-white border border-[#262830] shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#141518]/50'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span>LIVE NEGOTIATION</span>
        </button>

        <button
          onClick={() => setActiveTab('supervisor')}
          className={`relative flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] transition-all font-mono ${
            activeTab === 'supervisor'
              ? 'bg-[#141518] text-white border border-[#262830] shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#141518]/50'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>SUPERVISOR GATE</span>
          {escalatedCount > 0 && (
            <span className="ml-1 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {escalatedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] transition-all font-mono ${
            activeTab === 'audit'
              ? 'bg-[#141518] text-white border border-[#262830] shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#141518]/50'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>AUDIT TERMINAL</span>
        </button>

        <button
          onClick={() => setActiveTab('evaluation')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-[4px] transition-all font-mono ${
            activeTab === 'evaluation'
              ? 'bg-[#141518] text-white border border-[#262830] shadow-sm'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#141518]/50'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
          <span>STRATEGY EVALUATION</span>
        </button>
      </nav>

      {/* Right: API Health & System Clock */}
      <div className="flex items-center space-x-4 text-xs font-mono">
        <div className="flex items-center space-x-1.5 px-2 py-1 rounded-[4px] bg-[#0A0B0D] border border-[#262830]">
          {isApiConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-subtle"></span>
              <span className="text-emerald-400 text-[11px]">FASTAPI ONLINE</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-red-400 text-[11px]">API DISCONNECTED</span>
            </>
          )}
        </div>

        <div className="flex items-center space-x-1.5 text-gray-400">
          <Clock className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[11px] font-mono">{timeStr}</span>
        </div>
      </div>
    </header>
  );
};
