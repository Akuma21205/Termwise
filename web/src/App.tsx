import { useState } from 'react';
import { Header } from './components/Header';
import { ConfigSidebar } from './components/ConfigSidebar';
import { NegotiationTimeline } from './components/NegotiationTimeline';
import { EscalationPanel } from './components/EscalationPanel';
import { AuditTerminal } from './components/AuditTerminal';
import { EvaluationTab } from './components/EvaluationTab';
import type { BuyerProfile, SellerPolicy, NegotiationResult } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<'negotiation' | 'supervisor' | 'audit' | 'evaluation'>('negotiation');
  const [isAuditOpen, setIsAuditOpen] = useState<boolean>(true);

  // Form parameters
  const [orderValue, setOrderValue] = useState<number>(1000000);
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile>({
    buyer_id: 'B001',
    reliability_score: 0.85,
    avg_payment_delay_days: 5,
    preferred_term_days: 60,
  });

  const [sellerPolicy, setSellerPolicy] = useState<SellerPolicy>({
    min_term_days: 0,
    max_term_days: 45,
    max_discount_percent: 5.0,
    auto_approval_limit: 1000000,
    cash_pressure_level: 0.5,
    financing_cost_annual_percent: 12.0,
  });

  const [negotiationResult, setNegotiationResult] = useState<NegotiationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [escalatedCount, setEscalatedCount] = useState<number>(0);

  const handleRunNegotiation = async () => {
    setIsLoading(true);
    setNegotiationResult(null);

    const payload = {
      buyer_profile: buyerProfile,
      seller_policy: sellerPolicy,
      order_value: orderValue,
      max_rounds: 5,
      negotiation_id: `demo_${buyerProfile.buyer_id}`,
    };

    try {
      const resp = await fetch('/negotiate/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        const data = await resp.json();
        setNegotiationResult(data);
        if (data.status === 'ESCALATED') {
          setEscalatedCount((prev) => prev + 1);
        }
      } else {
        runLocalSimulation();
      }
    } catch (err) {
      console.log('Backend API call error, running client simulation:', err);
      runLocalSimulation();
    } finally {
      setIsLoading(false);
    }
  };

  const runLocalSimulation = () => {
    const isEscalated = orderValue > sellerPolicy.auto_approval_limit;
    const isApproved = !isEscalated && buyerProfile.preferred_term_days <= sellerPolicy.max_term_days + 15;

    const status = isEscalated ? 'ESCALATED' : isApproved ? 'APPROVED' : 'REJECTED';

    const rounds = [
      {
        round: 1,
        proposer: 'buyer',
        proposal: {
          order_value: orderValue,
          currency: 'INR',
          quantity: 100,
          payment_term_days: buyerProfile.preferred_term_days,
          discount_percent: 4.5,
          delivery_deadline_days: 14,
          round: 1,
          proposer: 'buyer',
        },
        decision: (buyerProfile.preferred_term_days > sellerPolicy.max_term_days ? 'REJECT' : 'APPROVE') as any,
        reason: `Opening round proposal by buyer agent (term: ${buyerProfile.preferred_term_days}d). Policy engine check.`,
      },
    ];

    if (buyerProfile.preferred_term_days > sellerPolicy.max_term_days) {
      rounds.push({
        round: 2,
        proposer: 'seller',
        proposal: {
          order_value: orderValue,
          currency: 'INR',
          quantity: 100,
          payment_term_days: sellerPolicy.max_term_days,
          discount_percent: sellerPolicy.max_discount_percent,
          delivery_deadline_days: 14,
          round: 2,
          proposer: 'seller',
        },
        decision: (isEscalated ? 'ESCALATE' : 'APPROVE') as any,
        reason: isEscalated
          ? `Order value ₹${orderValue.toLocaleString()} exceeds auto approval limit ₹${sellerPolicy.auto_approval_limit.toLocaleString()}`
          : 'Seller counter proposal satisfies policy engine constraints.',
      });
    }

    const finalProp = rounds[rounds.length - 1].proposal;

    setNegotiationResult({
      status,
      history: rounds,
      final_proposal: finalProp,
      contract: status === 'APPROVED' ? {
        contract_id: `cnt_${Date.now().toString().slice(-6)}`,
        negotiation_id: `demo_${buyerProfile.buyer_id}`,
        agreed_proposal: finalProp,
        razorpay_order_id: `order_${Date.now().toString().slice(-6)}`,
        razorpay_payment_link_id: `plink_${Date.now().toString().slice(-6)}`,
        due_date: new Date(Date.now() + finalProp.payment_term_days * 86400000).toISOString().split('T')[0],
        status: 'CREATED',
      } : undefined,
      razorpay_order: status === 'APPROVED' ? {
        id: `order_${Date.now().toString().slice(-6)}`,
        amount: orderValue * 100,
        currency: 'INR',
        receipt: `rcpt_${Date.now().toString().slice(-4)}`,
        status: 'created',
      } : undefined,
      razorpay_payment_link: status === 'APPROVED' ? {
        id: `plink_${Date.now().toString().slice(-6)}`,
        short_url: `https://rzp.io/i/termwise_demo_${Date.now().toString().slice(-6)}`,
        amount: orderValue * 100,
        expire_by: Math.floor(Date.now() / 1000) + finalProp.payment_term_days * 86400,
        status: 'issued',
      } : undefined,
    });

    if (isEscalated) {
      setEscalatedCount((prev) => prev + 1);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0B0D] text-[#E2E8F0]">
      {/* Top Fixed Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} escalatedCount={escalatedCount} />

      {/* Main Container Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Config Panel (Only in Negotiation / Supervisor tabs) */}
        {(activeTab === 'negotiation' || activeTab === 'supervisor') && (
          <ConfigSidebar
            buyerProfile={buyerProfile}
            setBuyerProfile={setBuyerProfile}
            sellerPolicy={sellerPolicy}
            setSellerPolicy={setSellerPolicy}
            orderValue={orderValue}
            setOrderValue={setOrderValue}
            onRunNegotiation={handleRunNegotiation}
            isLoading={isLoading}
          />
        )}

        {/* Center Main View Area */}
        <main className="flex-1 flex overflow-hidden">
          {activeTab === 'negotiation' && (
            <NegotiationTimeline
              result={negotiationResult}
              isLoading={isLoading}
              buyerProfile={buyerProfile}
              sellerPolicy={sellerPolicy}
              orderValue={orderValue}
              onOpenSupervisorGate={() => setActiveTab('supervisor')}
            />
          )}

          {activeTab === 'supervisor' && (
            <EscalationPanel
              currentResult={negotiationResult}
              buyerProfile={buyerProfile}
              sellerPolicy={sellerPolicy}
              orderValue={orderValue}
            />
          )}

          {activeTab === 'audit' && (
            <div className="flex-1 bg-[#0A0B0D] p-6 overflow-y-auto">
              <AuditTerminal
                negotiationId={`demo_${buyerProfile.buyer_id}`}
                isOpen={true}
                onToggle={() => {}}
              />
            </div>
          )}

          {activeTab === 'evaluation' && <EvaluationTab />}
        </main>

        {/* Right Collapsible Audit Terminal Log (Shown in Negotiation tab) */}
        {activeTab === 'negotiation' && (
          <AuditTerminal
            negotiationId={`demo_${buyerProfile.buyer_id}`}
            isOpen={isAuditOpen}
            onToggle={() => setIsAuditOpen(!isAuditOpen)}
          />
        )}
      </div>
    </div>
  );
}

export default App;
