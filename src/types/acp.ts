/**
 * ACP (Agentic Commerce Protocol) Type Definitions
 * Based on OpenAI Checkout Spec
 */

// ============================================================================
// Request Objects
// ============================================================================

export interface Item {
  id: string;
  quantity: number;
}

export interface Buyer {
  first_name: string;
  email: string;
  phone_number?: string; // E.164 format
}

export interface Address {
  name: string;
  line_one: string;
  line_two?: string;
  city: string;
  state: string;
  country: string; // ISO 3166-1 alpha-2 (e.g., "US")
  postal_code: string;
  phone_number?: string; // E.164 format
}

// ============================================================================
// Response Objects
// ============================================================================

export interface LineItem {
  id: string;
  item: Item;
  base_amount: number; // minor units (cents)
  discount: number;
  subtotal: number; // base_amount - discount
  tax: number;
  total: number; // subtotal + tax
}

export interface FulfillmentOption {
  type: 'shipping' | 'pickup';
  id: string;
  title: string;
  subtitle?: string;
  carrier_info?: string;
  earliest_delivery_time?: string; // RFC 3339
  latest_delivery_time?: string; // RFC 3339
  subtotal: number;
  tax: number;
  total: number;
}

export interface Total {
  type:
    | 'items_base_amount'
    | 'items_discount'
    | 'subtotal'
    | 'discount'
    | 'fulfillment'
    | 'tax'
    | 'fee'
    | 'total';
  display_text: string; // Per OpenAPI spec (not "title")
  amount: number; // minor units (cents)
}

export interface Message {
  type: 'info' | 'error';
  param?: string; // JSONPath (e.g., "$.line_items[1]")
  content_type: 'plain' | 'markdown';
  content: string;
  code?:
    | 'missing'
    | 'invalid'
    | 'out_of_stock'
    | 'payment_declined'
    | 'requires_sign_in'
    | 'requires_3ds';
}

export interface Link {
  type: 'terms_of_service' | 'privacy_policy' | 'support';
  url: string;
}

export type PaymentProvider = 'stripe';

export type SessionStatus =
  | 'not_ready_for_payment'
  | 'ready_for_payment'
  | 'completed'
  | 'canceled';

// ============================================================================
// Checkout Session Endpoints
// ============================================================================

// POST /checkout_sessions
export interface CreateSessionRequest {
  buyer?: Buyer;
  items: Item[];
  fulfillment_address?: Address;
}

export interface CreateSessionResponse {
  id: string;
  buyer?: Buyer;
  payment_provider: PaymentProvider;
  status: SessionStatus;
  currency: string; // ISO 4217 lowercase (e.g., "usd")
  line_items: LineItem[];
  fulfillment_address?: Address;
  fulfillment_options: FulfillmentOption[];
  fulfillment_option_id?: string;
  totals: Total[];
  messages: Message[];
  links: Link[];
}

// POST /checkout_sessions/{id}
export interface UpdateSessionRequest {
  buyer?: Buyer;
  items?: Item[];
  fulfillment_address?: Address;
  fulfillment_option_id?: string;
}

export type UpdateSessionResponse = CreateSessionResponse;

// POST /checkout_sessions/{id}/complete
export interface PaymentData {
  token: string;
  provider: PaymentProvider;
  billing_address?: Address;
}

export interface CompleteSessionRequest {
  buyer?: Buyer;
  payment_data: PaymentData;
}

export interface CompleteSessionResponse extends CreateSessionResponse {
  status: 'completed';
  order_id?: string;
}

// GET /checkout_sessions/{id}
export type GetSessionResponse = CreateSessionResponse;

// POST /checkout_sessions/{id}/cancel
export type CancelSessionResponse = CreateSessionResponse;

// ============================================================================
// Payment (Delegated Payment Spec)
// ============================================================================

export interface PaymentMethod {
  type: 'card';
  card_number_type: 'fpan' | 'network_token';
  number: string;
  exp_month: number;
  exp_year: number;
  name: string;
  cvc: string;
  // Network token fields
  cryptogram?: string;
  eci_value?: string;
  // Display fields
  display_card_funding_type?: string;
  display_brand?: string;
  display_last4?: string;
}

export interface Allowance {
  reason: 'one_time';
  max_amount: number;
  currency: string; // ISO 4217 lowercase
  checkout_session_id: string;
  merchant_id: string;
  expires_at: string; // RFC 3339
}

export interface RiskSignal {
  type: string; // e.g., "card_testing"
  score: number;
  action: 'blocked' | 'manual_review' | 'authorized';
}

export interface DelegatePaymentRequest {
  payment_method: PaymentMethod;
  allowance: Allowance;
  billing_address?: Address;
  risk_signals?: RiskSignal[];
  metadata?: Record<string, unknown>;
}

export interface DelegatePaymentResponse {
  token: string;
  provider: PaymentProvider;
}
