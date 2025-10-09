/**
 * Test category mapping based on OpenAI production certification requirements
 * Reference: docs/openai/production.md
 */

export type TestCategory =
  | 'Session Creation & Address Handling'
  | 'Shipping Option Updates'
  | 'Order Completion'
  | 'Error Scenarios'
  | 'Idempotency'
  | 'Schema Validation'
  | 'Totals Validation'
  | 'Cancel Operations'
  | 'Get Operations'
  | 'Happy Path Flows'
  | 'Other';

/**
 * Map test name to OpenAI production certification category
 */
export function categorizeTest(testName: string, suiteName?: string): TestCategory {
  const name = testName.toLowerCase();
  const suite = (suiteName || '').toLowerCase();

  // Session Creation & Address Handling
  if (
    name.includes('create session') ||
    name.includes('shipping address') ||
    name.includes('buyer information') ||
    suite.includes('post /checkout_sessions') ||
    suite.includes('session creation')
  ) {
    return 'Session Creation & Address Handling';
  }

  // Shipping Option Updates
  if (
    name.includes('shipping option') ||
    name.includes('fulfillment') ||
    name.includes('select shipping') ||
    suite.includes('update') && name.includes('shipping')
  ) {
    return 'Shipping Option Updates';
  }

  // Order Completion
  if (
    name.includes('complete') ||
    name.includes('payment') ||
    name.includes('order_id') ||
    suite.includes('complete')
  ) {
    return 'Order Completion';
  }

  // Error Scenarios
  if (
    name.includes('error') ||
    name.includes('missing') ||
    name.includes('invalid') ||
    name.includes('out_of_stock') ||
    name.includes('payment_declined') ||
    suite.includes('error')
  ) {
    return 'Error Scenarios';
  }

  // Idempotency
  if (
    name.includes('idempotency') ||
    name.includes('duplicate') ||
    name.includes('same idempotency-key') ||
    suite.includes('idempotency')
  ) {
    return 'Idempotency';
  }

  // Schema Validation
  if (
    name.includes('schema') ||
    name.includes('openapi') ||
    name.includes('spec') ||
    suite.includes('schema validation')
  ) {
    return 'Schema Validation';
  }

  // Totals Validation
  if (
    name.includes('total') ||
    name.includes('calculation') ||
    name.includes('formula') ||
    suite.includes('totals')
  ) {
    return 'Totals Validation';
  }

  // Cancel Operations
  if (
    name.includes('cancel') ||
    suite.includes('cancel')
  ) {
    return 'Cancel Operations';
  }

  // Get Operations
  if (
    name.includes('get') && name.includes('session') ||
    name.includes('retrieve') ||
    suite.includes('get /checkout_sessions')
  ) {
    return 'Get Operations';
  }

  // Happy Path Flows
  if (
    name.includes('full flow') ||
    name.includes('complete flow') ||
    name.includes('happy path') ||
    suite.includes('happy path')
  ) {
    return 'Happy Path Flows';
  }

  return 'Other';
}
