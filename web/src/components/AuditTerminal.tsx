import React, { useEffect, useState } from 'react';
import { Terminal, RefreshCw, ShieldCheck, Search } from 'lucide-react';
import type { AuditLogEntry } from '../types';

interface AuditTerminalProps {
  negotiationId?: string;
  isOpen: boolean;
  onToggle: () => void;
}

export const AuditTerminal: React.FC<AuditTerminalProps> = ({
  negotiationId = 'demo_B001',
  isOpen,
  onToggle,
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filterId, setFilterId] = useState<string>(negotiationId);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch(`/audit?negotiation_id=${filterId}`);
      if (resp.ok) {
        const data = await resp.json();
        setLogs(Array.isArray(data) ? data : []);
      } else {
        setMockLogs();
      }
    } catch (e) {
      setMockLogs();
    } finally {
      setIsLoading(false);
    }
  };

  const setMockLogs = () => {
    setLogs([
      {
        id: 1,
        timestamp: new Date().toISOString(),
        negotiation_id: filterId,
        actor: 'BUYER_AGENT',
        action: 'PROPOSE',
        payload_summary: 'Term: 60 days, Discount: 4.5%, Value: ₹1,000,000',
        decision: 'PENDING',
        reason: 'Opening round proposal by buyer agent',
      },
      {
        id: 2,
        timestamp: new Date().toISOString(),
        negotiation_id: filterId,
        actor: 'POLICY_ENGINE',
        action: 'VALIDATE',
        payload_summary: 'max_term=45d breach (requested 60d)',
        decision: 'REJECT',
        reason: 'Policy engine rejected proposal: requested term 60 days exceeds max_term 45 days',
      },
      {
        id: 3,
        timestamp: new Date().toISOString(),
        negotiation_id: filterId,
        actor: 'SELLER_AGENT',
        action: 'COUNTER_PROPOSE',
        payload_summary: 'Term: 45 days, Discount: 3.5%, Value: ₹1,000,000',
        decision: 'PENDING',
        reason: 'Seller agent counter proposal calculated using economic EV tool',
      },
      {
        id: 4,
        timestamp: new Date().toISOString(),
        negotiation_id: filterId,
        actor: 'POLICY_ENGINE',
        action: 'VALIDATE',
        payload_summary: 'Satisfies all seller policy bounds',
        decision: 'APPROVE',
        reason: 'Policy engine validated proposal from seller: APPROVE',
      },
      {
        id: 5,
        timestamp: new Date().toISOString(),
        negotiation_id: filterId,
        actor: 'RAZORPAY',
        action: 'EXECUTION_TRIGGERED',
        payload_summary: 'Order: order_N8xL92kP01, PaymentLink: plink_N8xL92kP01',
        decision: 'EXECUTED',
        reason: 'Razorpay order and payment link generated with expire_by Net-45 days',
      },
    ]);
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [filterId]);

  const filteredLogs = logs.filter(
    (log) =>
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.payload_summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.decision.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-0 top-24 bg-[#141518] border-l border-y border-[#262830] text-indigo-400 p-2 rounded-l-[4px] shadow-lg flex items-center space-x-1.5 font-mono text-xs hover:bg-[#1E2638] transition-all z-40"
      >
        <Terminal className="w-4 h-4" />
        <span className="writing-mode-vertical uppercase tracking-wider text-[10px] font-bold">AUDIT LOG</span>
      </button>
    );
  }

  return (
    <aside className="w-[340px] bg-[#141518] border-l border-[#262830] p-4 flex flex-col justify-between shrink-0 h-[calc(100vh-53px)] overflow-hidden font-mono">
      {/* Top Header */}
      <div className="space-y-3 pb-3 border-b border-[#262830]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">LIVE AUDIT TERMINAL</span>
          </div>
          <button
            onClick={onToggle}
            className="text-gray-500 hover:text-white text-xs px-1.5 py-0.5 rounded-[4px] border border-[#262830]"
          >
            ✕
          </button>
        </div>

        {/* Filter Input & Controls */}
        <div className="space-y-2">
          <div className="flex items-center space-x-1.5">
            <input
              type="text"
              value={filterId}
              onChange={(e) => setFilterId(e.target.value)}
              placeholder="Negotiation ID..."
              className="flex-1 bg-[#0A0B0D] border border-[#262830] rounded-[4px] px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              onClick={fetchAuditLogs}
              disabled={isLoading}
              className="bg-[#0A0B0D] hover:bg-[#1E2638] border border-[#262830] text-indigo-400 p-1.5 rounded-[4px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="w-full bg-[#0A0B0D] border border-[#262830] rounded-[4px] pl-8 pr-2.5 py-1 text-[11px] text-gray-300 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Log Feed */}
      <div className="flex-1 my-3 overflow-y-auto space-y-2.5 pr-1">
        {filteredLogs.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500">
            No audit entries found for <span className="text-gray-400">{filterId}</span>.
          </div>
        ) : (
          filteredLogs.map((log, idx) => {
            const isApprove = log.decision === 'APPROVE' || log.decision === 'EXECUTED';
            const isEscalate = log.decision === 'ESCALATE';
            const isReject = log.decision === 'REJECT';

            return (
              <div
                key={log.id || idx}
                className={`bg-[#0A0B0D] border-l-2 p-2.5 rounded-[4px] text-[11px] space-y-1 font-mono ${
                  isApprove
                    ? 'border-l-emerald-400 border-y border-r border-[#262830]'
                    : isEscalate
                    ? 'border-l-amber-400 border-y border-r border-[#262830]'
                    : isReject
                    ? 'border-l-red-400 border-y border-r border-[#262830]'
                    : 'border-l-indigo-400 border-y border-r border-[#262830]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span className="text-indigo-300 font-bold">[{log.actor}]</span>
                  <span>{log.timestamp ? log.timestamp.substring(11, 19) : ''}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold">{log.action}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-[2px] ${
                      isApprove
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : isEscalate
                        ? 'bg-amber-500/20 text-amber-300'
                        : isReject
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-indigo-500/20 text-indigo-300'
                    }`}
                  >
                    {log.decision}
                  </span>
                </div>

                <p className="text-gray-400 text-[10px] leading-tight break-all">{log.payload_summary}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-[#262830] text-[10px] text-gray-500 flex items-center justify-between">
        <div className="flex items-center space-x-1 text-emerald-400">
          <ShieldCheck className="w-3 h-3" />
          <span>Append-Only Immutable Log</span>
        </div>
        <span>SQLite WAL Mode</span>
      </div>
    </aside>
  );
};
