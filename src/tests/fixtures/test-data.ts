/**
 * Test Fixtures - Reusable Test Data
 * Parameterized and configurable for easy modification
 */

import type {
  Item,
  Buyer,
  Address,
  CreateSessionRequest,
  UpdateSessionRequest,
  PaymentData,
  CompleteSessionRequest,
} from '../../types/acp.js';

// ============================================================================
// Test Items
// ============================================================================

export const TEST_ITEMS = {
  // Single item scenarios
  SINGLE_PRODUCT: [{ id: 'prod_test_001', quantity: 1 }] as Item[],
  SINGLE_PRODUCT_MULTI_QTY: [{ id: 'prod_test_001', quantity: 3 }] as Item[],

  // Multiple item scenarios
  TWO_PRODUCTS: [
    { id: 'prod_test_001', quantity: 1 },
    { id: 'prod_test_002', quantity: 2 },
  ] as Item[],

  MIXED_QUANTITIES: [
    { id: 'prod_test_001', quantity: 1 },
    { id: 'prod_test_002', quantity: 5 },
    { id: 'prod_test_003', quantity: 2 },
  ] as Item[],
} as const;

// ============================================================================
// Test Buyers
// ============================================================================

export const TEST_BUYERS = {
  BASIC: {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
  } as Buyer,

  WITH_PHONE: {
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    phone_number: '+12025551234', // E.164 format
  } as Buyer,

  INTERNATIONAL: {
    first_name: 'Maria',
    last_name: 'Garcia',
    email: 'maria.garcia@example.com',
    phone_number: '+34912345678', // Spain
  } as Buyer,
} as const;

// ============================================================================
// Test Addresses
// ============================================================================

export const TEST_ADDRESSES = {
  US_RESIDENTIAL: {
    name: 'John Doe',
    line_one: '123 Main Street',
    city: 'San Francisco',
    state: 'CA',
    country: 'US',
    postal_code: '94102',
  } as Address,

  US_WITH_APT: {
    name: 'Jane Smith',
    line_one: '456 Market Street',
    line_two: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    country: 'US',
    postal_code: '10001',
    phone_number: '+12125551234',
  } as Address,

  UK_ADDRESS: {
    name: 'James Wilson',
    line_one: '10 Downing Street',
    city: 'London',
    state: 'ENG',
    country: 'GB',
    postal_code: 'SW1A 2AA',
  } as Address,

  CANADA_ADDRESS: {
    name: 'Marie Dupont',
    line_one: '1234 Rue Sainte-Catherine',
    city: 'Montreal',
    state: 'QC',
    country: 'CA',
    postal_code: 'H3B 1A1',
  } as Address,
} as const;

// ============================================================================
// Request Builders (Parameterized)
// ============================================================================

export interface SessionRequestParams {
  items?: Item[];
  buyer?: Buyer;
  address?: Address;
  shipping_address?: Address;
  fulfillment_address?: Address;
  fulfillment_selection?: { id: string };
}

/**
 * Build a CreateSessionRequest with optional parameters
 */
export function buildCreateSessionRequest(
  params: SessionRequestParams = {}
): CreateSessionRequest {
  const {
    items = TEST_ITEMS.SINGLE_PRODUCT,
    buyer,
    address,
    shipping_address,
    fulfillment_address,
  } = params;

  const addressToUse = shipping_address || fulfillment_address || address;

  return {
    items,
    ...(buyer && { buyer }),
    ...(addressToUse && { fulfillment_address: addressToUse }),
  };
}

/**
 * Build an UpdateSessionRequest with optional parameters
 */
export function buildUpdateSessionRequest(
  params: SessionRequestParams & { fulfillmentOptionId?: string } = {}
): UpdateSessionRequest {
  const {
    items,
    buyer,
    address,
    shipping_address,
    fulfillment_address,
    fulfillment_selection,
    fulfillmentOptionId,
  } = params;

  const addressToUse = shipping_address || fulfillment_address || address;

  return {
    ...(items && { items }),
    ...(buyer && { buyer }),
    ...(addressToUse && { fulfillment_address: addressToUse }),
    ...(fulfillment_selection && { fulfillment_selection }),
    ...(fulfillmentOptionId && { fulfillment_option_id: fulfillmentOptionId }),
  };
}

// ============================================================================
// Test Scenarios (Parameterized Test Cases)
// ============================================================================

export interface TestScenario {
  name: string;
  request: CreateSessionRequest;
  description: string;
}

/**
 * Pre-defined test scenarios for parameterized tests
 */
export const CREATE_SESSION_SCENARIOS: TestScenario[] = [
  {
    name: 'Minimal - Single item only',
    request: buildCreateSessionRequest(),
    description: 'Creates session with single item, no buyer or address',
  },
  {
    name: 'With buyer info',
    request: buildCreateSessionRequest({
      buyer: TEST_BUYERS.BASIC,
    }),
    description: 'Creates session with buyer information',
  },
  {
    name: 'With US shipping address',
    request: buildCreateSessionRequest({
      address: TEST_ADDRESSES.US_RESIDENTIAL,
    }),
    description: 'Creates session with US shipping address',
  },
  {
    name: 'Complete - Buyer + Address',
    request: buildCreateSessionRequest({
      buyer: TEST_BUYERS.WITH_PHONE,
      address: TEST_ADDRESSES.US_WITH_APT,
    }),
    description: 'Creates session with full buyer and address info',
  },
  {
    name: 'Multiple items',
    request: buildCreateSessionRequest({
      items: TEST_ITEMS.TWO_PRODUCTS,
      buyer: TEST_BUYERS.BASIC,
    }),
    description: 'Creates session with multiple items',
  },
  {
    name: 'International - Canada',
    request: buildCreateSessionRequest({
      items: TEST_ITEMS.SINGLE_PRODUCT,
      buyer: TEST_BUYERS.BASIC,
      address: TEST_ADDRESSES.CANADA_ADDRESS,
    }),
    description: 'Creates session with Canadian shipping address',
  },
];

/**
 * Update session scenarios
 */
export const UPDATE_SESSION_SCENARIOS = [
  {
    name: 'Add shipping address',
    request: buildUpdateSessionRequest({
      address: TEST_ADDRESSES.US_RESIDENTIAL,
    }),
    description: 'Updates session by adding shipping address',
  },
  {
    name: 'Change item quantities',
    request: buildUpdateSessionRequest({
      items: TEST_ITEMS.SINGLE_PRODUCT_MULTI_QTY,
    }),
    description: 'Updates session with new item quantities',
  },
  {
    name: 'Select shipping option',
    request: buildUpdateSessionRequest({
      fulfillmentOptionId: 'shipping_standard',
    }),
    description: 'Updates session by selecting shipping option',
  },
];

// ============================================================================
// Test Payment Data
// ============================================================================

/**
 * Test payment data for completing checkout sessions
 * Using Stripe test tokens for compatibility
 */
export const TEST_PAYMENT_DATA = {
  MINIMAL: {
    token: 'tok_visa', // Stripe test token
    provider: 'stripe' as const,
  } as PaymentData,

  WITH_BILLING: {
    token: 'tok_mastercard', // Stripe test token
    provider: 'stripe' as const,
    billing_address: TEST_ADDRESSES.US_RESIDENTIAL,
  } as PaymentData,

  WITH_BILLING_INTERNATIONAL: {
    token: 'tok_amex', // Stripe test token
    provider: 'stripe' as const,
    billing_address: TEST_ADDRESSES.UK_ADDRESS,
  } as PaymentData,
} as const;

// ============================================================================
// Test Fulfillment Options
// ============================================================================

/**
 * Sample fulfillment option IDs for testing
 * These should match what the mock server returns
 */
export const TEST_FULFILLMENT_OPTIONS = {
  STANDARD_SHIPPING: 'shipping_standard',
  EXPRESS_SHIPPING: 'shipping_express',
  PICKUP: 'pickup_store',
} as const;

// ============================================================================
// Complete Session Request Builder
// ============================================================================

export interface CompleteSessionParams {
  paymentData?: PaymentData;
  buyer?: Buyer;
}

/**
 * Build a CompleteSessionRequest with optional parameters
 */
export function buildCompleteSessionRequest(
  params: CompleteSessionParams = {}
): CompleteSessionRequest {
  const {
    paymentData = TEST_PAYMENT_DATA.MINIMAL,
    buyer,
  } = params;

  return {
    payment_data: paymentData,
    ...(buyer && { buyer }),
  };
}

// ============================================================================
// Complete Session Scenarios
// ============================================================================

export interface CompleteTestScenario {
  name: string;
  request: CompleteSessionRequest;
  description: string;
}

/**
 * Complete session scenarios for parameterized tests
 */
export const COMPLETE_SESSION_SCENARIOS: CompleteTestScenario[] = [
  {
    name: 'Complete with minimal payment data',
    request: buildCompleteSessionRequest(),
    description: 'Completes session with payment token only',
  },
  {
    name: 'Complete with billing address',
    request: buildCompleteSessionRequest({
      paymentData: TEST_PAYMENT_DATA.WITH_BILLING,
    }),
    description: 'Completes session with payment token and billing address',
  },
  {
    name: 'Complete with buyer override',
    request: buildCompleteSessionRequest({
      paymentData: TEST_PAYMENT_DATA.MINIMAL,
      buyer: TEST_BUYERS.WITH_PHONE,
    }),
    description: 'Completes session with buyer information override',
  },
];
