export type DecisionType = 'APPROVE' | 'REJECT' | 'ESCALATE';

export interface Proposal {
  order_value: number;
  currency: string;
  quantity: number;
  payment_term_days: number;
  discount_percent: number;
  delivery_deadline_days: number;
  round: number;
  proposer: string;
}

export interface SellerPolicy {
  min_term_days: number;
  max_term_days: number;
  max_discount_percent: number;
  auto_approval_limit: number;
  cash_pressure_level: number;
  financing_cost_annual_percent: number;
}

export interface BuyerProfile {
  buyer_id: string;
  reliability_score: number;
  avg_payment_delay_days: number;
  preferred_term_days: number;
}

export interface Contract {
  contract_id: string;
  negotiation_id: string;
  agreed_proposal: Proposal;
  razorpay_order_id?: string;
  razorpay_payment_link_id?: string;
  due_date: string;
  status: string;
}

export interface RoundHistoryEntry {
  round: number;
  proposer: string;
  proposal: Proposal;
  decision: DecisionType;
  reason: string;
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  negotiation_id: string;
  actor: string;
  action: string;
  payload_summary: string;
  decision: string;
  reason: string;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface RazorpayPaymentLink {
  id: string;
  short_url: string;
  amount: number;
  expire_by: number;
  status: string;
}

export interface NegotiationResult {
  status: 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'MAX_ROUNDS_EXCEEDED';
  history: RoundHistoryEntry[];
  final_proposal: Proposal;
  contract?: Contract;
  razorpay_order?: RazorpayOrder;
  razorpay_payment_link?: RazorpayPaymentLink;
}
