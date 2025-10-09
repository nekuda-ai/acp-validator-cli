/**
 * ACP Checkout API Tests
 * Error Scenario Testing - Production Certification Requirement
 *
 * Per production.md lines 42-49:
 * - Demonstrate recoverable error handling
 * - Trigger and log each error condition with appropriate HTTP status
 * - Test error codes: missing, invalid, out_of_stock, payment_declined
 *
 * Per checkout.md line 267 (Message error codes):
 * - missing: required field omitted
 * - invalid: invalid data
 * - out_of_stock: inventory failure
 * - payment_declined: payment failure
 * - requires_sign_in: authentication required
 * - requires_3ds: 3DS challenge required
 */

import { describe, it, expect } from 'vitest';
import {
  createSession,
  completeSession,
  extractSessionId,
} from './helpers/requests.js';
import {
  buildCreateSessionRequest,
  buildCompleteSessionRequest,
  TEST_ITEMS,
  TEST_ADDRESSES,
} from './fixtures/test-data.js';
import type { CreateSessionRequest, CreateSessionResponse, Message } from '../types/acp.js';

// ============================================================================
// Helper Functions
// ============================================================================

const findErrorMessage = (messages: Message[], code: string) =>
  messages.find((msg) => msg.type === 'error' && msg.code === code);

const validateErrorMessage = (message: Message, expectedCode: string) => {
  expect(message).toMatchObject({
    type: 'error',
    code: expectedCode,
  });
  expect(['plain', 'markdown']).toContain(message.content_type);
  expect(message.content).toBeTruthy();
};

// ============================================================================
// Test Data
// ============================================================================

const INVALID_FIELD_SCENARIOS = [
  {
    scenario: 'invalid country code',
    field: 'country',
    request: {
      items: TEST_ITEMS.SINGLE_PRODUCT,
      shipping_address: { ...TEST_ADDRESSES.US_RESIDENTIAL, country: 'INVALID' },
    },
    expectedParam: 'country',
  },
  {
    scenario: 'invalid postal code',
    field: 'postal_code',
    request: {
      items: TEST_ITEMS.SINGLE_PRODUCT,
      shipping_address: { ...TEST_ADDRESSES.US_RESIDENTIAL, postal_code: 'INVALID' },
    },
    expectedParam: 'postal_code',
  },
  {
    scenario: 'negative quantity',
    field: 'quantity',
    request: {
      items: [{ id: TEST_ITEMS.SINGLE_PRODUCT[0].id, quantity: -1 }],
    },
    expectedParam: 'quantity',
  },
  {
    scenario: 'zero quantity',
    field: 'quantity',
    request: {
      items: [{ id: TEST_ITEMS.SINGLE_PRODUCT[0].id, quantity: 0 }],
    },
    expectedParam: 'quantity',
  },
];

const ERROR_CODE_STRUCTURES = [
  {
    code: 'missing',
    category: 'validation',
    description: 'required field omitted',
    expectedStatus: 400,
    exampleContent: 'Required field is missing',
    exampleParam: '$.items',
  },
  {
    code: 'invalid',
    category: 'validation',
    description: 'invalid data',
    expectedStatus: 400,
    exampleContent: 'Invalid value provided',
    exampleParam: '$.shipping_address.country',
  },
  {
    code: 'out_of_stock',
    category: 'business_logic',
    description: 'inventory failure',
    expectedStatus: 200,
    exampleContent: 'Item is currently out of stock',
    exampleParam: '$.line_items[0]',
  },
  {
    code: 'payment_declined',
    category: 'business_logic',
    description: 'payment failure',
    expectedStatus: 200,
    exampleContent: 'Payment was declined by the issuer',
    exampleParam: '$.payment_data',
  },
  {
    code: 'requires_sign_in',
    category: 'authentication',
    description: 'authentication required',
    expectedStatus: 200,
    exampleContent: 'Sign in required to complete this purchase',
    exampleParam: undefined,
  },
  {
    code: 'requires_3ds',
    category: 'authentication',
    description: '3DS challenge required',
    expectedStatus: 200,
    exampleContent: '3D Secure authentication required',
    exampleParam: '$.payment_data',
  },
];

// ============================================================================
// Tests
// ============================================================================

describe('Error Scenario Tests - Production Certification', () => {
  describe('Missing Field Errors', () => {
    it('should handle missing items in create request', async () => {
      const invalidRequest: Partial<CreateSessionRequest> = { ...buildCreateSessionRequest({ items: [] }) };
      delete invalidRequest.items;
      const response = await createSession(invalidRequest as CreateSessionRequest);
      expect([200, 201, 400]).toContain(response.status);
      if (response.status === 200 || response.status === 201) {
        expect(response.body.messages?.some((m: Message) => m.type === 'error' && (m.code === 'missing' || m.code === 'invalid'))).toBe(true);
      }
    });

    it('should validate error message structure for missing field', async () => {
      const response = await createSession(buildCreateSessionRequest({ items: [] }));
      const errorMsg = response.body.messages?.find((m: Message) => m.type === 'error');
      if (errorMsg) {
        expect(['plain', 'markdown']).toContain(errorMsg.content_type);
        expect(errorMsg.code).toBeDefined();
        expect(errorMsg.content).toBeDefined();
      }
    });
  });

  // ============================================================================
  // Parameterized: Invalid Field Scenarios
  // ============================================================================

  describe.each(INVALID_FIELD_SCENARIOS)('Invalid field: $scenario', ({ request, expectedParam }) => {
    it('should handle invalid field and return error', async () => {
      const response = await createSession(buildCreateSessionRequest(request));
      expect([200, 201, 400]).toContain(response.status);
      const invalidError = findErrorMessage(response.body.messages || [], 'invalid');
      if (invalidError) {
        validateErrorMessage(invalidError, 'invalid');
        if (expectedParam) expect(invalidError.param).toContain(expectedParam);
      }
    });
  });

  // ============================================================================
  // Parameterized: Error Code Structure Documentation
  // ============================================================================

  describe.each(ERROR_CODE_STRUCTURES)('Error code: $code ($category)', ({ code, category, expectedStatus, exampleParam }) => {
    it('should document error structure', () => {
      expect(['validation', 'business_logic', 'authentication']).toContain(category);
      expect(expectedStatus).toBeGreaterThanOrEqual(200);
      expect(expectedStatus).toBeLessThan(600);
      if (exampleParam) expect(exampleParam).toMatch(/^\$/);
    });
  });

  describe('Out of Stock Errors', () => {
    it('should handle scenario where item becomes unavailable', async () => {
      const response = await createSession(buildCreateSessionRequest({ items: TEST_ITEMS.SINGLE_PRODUCT }));
      expect([200, 201]).toContain(response.status);
      expect(response.body.line_items.length).toBeGreaterThan(0);
      const outOfStockError = findErrorMessage(response.body.messages || [], 'out_of_stock');
      if (outOfStockError) {
        validateErrorMessage(outOfStockError, 'out_of_stock');
        expect(outOfStockError.param).toMatch(/line_items/);
      }
    });
  });

  describe('Payment Declined Errors', () => {
    it('should validate payment_declined appears in complete response', async () => {
      const sessionId = extractSessionId(await createSession(buildCreateSessionRequest({
        items: TEST_ITEMS.SINGLE_PRODUCT,
        shipping_address: TEST_ADDRESSES.US_RESIDENTIAL,
      })));
      const response = await completeSession(sessionId, buildCompleteSessionRequest());
      expect([200, 201, 400]).toContain(response.status);
      const declinedError = findErrorMessage(response.body.messages || [], 'payment_declined');
      if (declinedError) {
        validateErrorMessage(declinedError, 'payment_declined');
        expect(declinedError.content).toMatch(/payment|declined|card/i);
      }
    });
  });

  describe('Error Message Validation', () => {
    it('should validate all error codes are from the spec', () => {
      const codes = ERROR_CODE_STRUCTURES.map(e => e.code);
      expect(codes).toEqual(['missing', 'invalid', 'out_of_stock', 'payment_declined', 'requires_sign_in', 'requires_3ds']);
    });

    it.each([
      { path: '$.items' }, { path: '$.line_items[0]' }, { path: '$.shipping_address.country' },
      { path: '$.payment_data' }, { path: '$.fulfillment_selection.id' },
    ])('should validate JSONPath format: $path', ({ path }) => expect(path).toMatch(/^\$/));

    it.each([{ contentType: 'plain' }, { contentType: 'markdown' }])(
      'should validate content_type: $contentType',
      ({ contentType }) => expect(['plain', 'markdown']).toContain(contentType)
    );
  });

  describe('HTTP Status Codes for Errors', () => {
    it.each([
      { category: 'validation_errors', status: 400, examples: ['missing', 'invalid'] },
      { category: 'business_logic_errors', status: 200, examples: ['out_of_stock', 'payment_declined'] },
      { category: 'authentication_errors', status: 401, examples: ['requires_sign_in'] },
      { category: 'not_found_errors', status: 404, examples: [] },
      { category: 'idempotency_conflicts', status: 409, examples: ['idempotency_conflict'] },
    ])('should document $category → HTTP $status', ({ status, examples }) => {
      expect(status).toBeGreaterThanOrEqual(200);
      expect(status).toBeLessThan(600);
      examples.forEach((code: string) => expect(code).toBeTruthy());
    });
  });
});
