/**
 * ACP Checkout API Tests
 * Tests for POST /checkout_sessions/{id}/complete endpoint
 */

import { describe, it, expect } from 'vitest';
import {
  createSession,
  updateSession,
  completeSession,
  extractSessionId,
  extractFirstFulfillmentOptionId,
} from './helpers/requests.js';
import {
  buildCreateSessionRequest,
  buildUpdateSessionRequest,
  buildCompleteSessionRequest,
  COMPLETE_SESSION_SCENARIOS,
  TEST_ITEMS,
  TEST_BUYERS,
  TEST_ADDRESSES,
  TEST_PAYMENT_DATA,
} from './fixtures/test-data.js';
import type { CompleteSessionResponse } from '../types/acp.js';

// ============================================================================
// Tests
// ============================================================================

describe('POST /checkout_sessions/{id}/complete', () => {
  describe('Complete Checkout - Happy Path', () => {
    it('should complete session with minimal payment data', async () => {
      // ARRANGE: Create session and prepare for completion
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
          buyer: TEST_BUYERS.BASIC,
          address: TEST_ADDRESSES.US_RESIDENTIAL,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // Select shipping option
      const fulfillmentOptionId = extractFirstFulfillmentOptionId(createResponse);
      if (fulfillmentOptionId) {
        await updateSession(sessionId, buildUpdateSessionRequest({ fulfillmentOptionId }));
      }

      // ACT: Complete with payment token
      const response = await completeSession(
        sessionId,
        buildCompleteSessionRequest({
          paymentData: TEST_PAYMENT_DATA.MINIMAL,
        })
      );

      // ASSERT
      expect(response.status).toBe(200);

      const body: CompleteSessionResponse = response.body;
      expect(body.status).toBe('completed');
      expect(body.order).toBeDefined();
      expect(body.order.id).toBeDefined();
      expect(body.order.checkout_session_id).toBe(sessionId);
      expect(body.order.permalink_url).toBeDefined();
      expect(body.id).toBe(sessionId);
    });

    it('should complete session with billing address', async () => {
      // ARRANGE: Create and prepare session
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.TWO_PRODUCTS,
          buyer: TEST_BUYERS.WITH_PHONE,
          address: TEST_ADDRESSES.US_WITH_APT,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Complete with billing address
      const response = await completeSession(
        sessionId,
        buildCompleteSessionRequest({
          paymentData: TEST_PAYMENT_DATA.WITH_BILLING,
        })
      );

      // ASSERT
      expect(response.status).toBe(200);

      const body: CompleteSessionResponse = response.body;
      expect(body.status).toBe('completed');
      expect(body.order).toBeDefined();
      expect(body.order.id).toBeDefined();
    });

    it('should complete session with buyer override', async () => {
      // ARRANGE: Create session without buyer
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
          address: TEST_ADDRESSES.US_RESIDENTIAL,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Complete and provide buyer in complete request
      const response = await completeSession(
        sessionId,
        buildCompleteSessionRequest({
          paymentData: TEST_PAYMENT_DATA.MINIMAL,
          buyer: TEST_BUYERS.WITH_PHONE,
        })
      );

      // ASSERT
      expect(response.status).toBe(200);

      const body: CompleteSessionResponse = response.body;
      expect(body.status).toBe('completed');
      expect(body.buyer).toBeDefined();
      expect(body.buyer?.email).toBe(TEST_BUYERS.WITH_PHONE.email);
    });

    it('should return order object after successful completion', async () => {
      // ARRANGE: Create and prepare session
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
          buyer: TEST_BUYERS.BASIC,
          address: TEST_ADDRESSES.US_RESIDENTIAL,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Complete session
      const response = await completeSession(
        sessionId,
        buildCompleteSessionRequest()
      );

      // ASSERT
      expect(response.status).toBe(200);

      const body: CompleteSessionResponse = response.body;
      expect(body.order).toBeDefined();
      expect(body.order.id).toBeDefined();
      expect(typeof body.order.id).toBe('string');
      expect(body.order.id.length).toBeGreaterThan(0);
      expect(body.order.checkout_session_id).toBe(sessionId);
      expect(body.order.permalink_url).toBeDefined();
      expect(typeof body.order.permalink_url).toBe('string');
    });
  });

  describe('Complete Session - Parameterized Scenarios', () => {
    it.each(COMPLETE_SESSION_SCENARIOS)(
      'should handle: $name',
      async ({ request, description }) => {
        // ARRANGE: Create session ready for completion
        const createResponse = await createSession(
          buildCreateSessionRequest({
            items: TEST_ITEMS.SINGLE_PRODUCT,
            buyer: TEST_BUYERS.BASIC,
            address: TEST_ADDRESSES.US_RESIDENTIAL,
          })
        );
        const sessionId = extractSessionId(createResponse);

        // ACT: Complete session
        const response = await completeSession(sessionId, request);

        // ASSERT
        expect(response.status, `Failed: ${description}`).toBe(200);

        const body: CompleteSessionResponse = response.body;
        expect(body.status, 'Status should be completed').toBe('completed');
        expect(body.order, 'Order should be present').toBeDefined();
        expect(body.order.id, 'Order ID should be present').toBeDefined();
      }
    );
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent session', async () => {
      // ACT: Try to complete non-existent session
      const response = await completeSession(
        'nonexistent_session_id',
        buildCompleteSessionRequest()
      );

      // ASSERT
      expect(response.status).toBe(404);
    });

    it('should reject completion without payment data', async () => {
      // ARRANGE: Create session
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
          buyer: TEST_BUYERS.BASIC,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Try to complete without payment data
      const response = await completeSession(sessionId, {
        payment_data: {} as any, // Invalid empty payment data
      });

      // ASSERT: Should reject
      expect([400, 422]).toContain(response.status);
    });

    it('should reject double completion (already completed)', async () => {
      // ARRANGE: Create and complete session
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
          buyer: TEST_BUYERS.BASIC,
          address: TEST_ADDRESSES.US_RESIDENTIAL,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // First completion
      const firstComplete = await completeSession(
        sessionId,
        buildCompleteSessionRequest()
      );
      expect(firstComplete.status).toBe(200);

      // ACT: Try to complete again
      const response = await completeSession(
        sessionId,
        buildCompleteSessionRequest()
      );

      // ASSERT: Should reject double completion
      expect([400, 409]).toContain(response.status);
    });
  });

  describe('Response Schema Validation', () => {
    it('should return complete session state with all fields', async () => {
      // ARRANGE: Create session
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.TWO_PRODUCTS,
          buyer: TEST_BUYERS.WITH_PHONE,
          address: TEST_ADDRESSES.US_WITH_APT,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Complete session
      const response = await completeSession(
        sessionId,
        buildCompleteSessionRequest({
          paymentData: TEST_PAYMENT_DATA.WITH_BILLING,
        })
      );

      // ASSERT: Complete response structure
      expect(response.status).toBe(200);

      const body: CompleteSessionResponse = response.body;
      expect(body.id).toBeDefined();
      expect(body.status).toBe('completed');
      expect(body.currency).toBeDefined();
      expect(body.line_items).toBeInstanceOf(Array);
      expect(body.totals).toBeInstanceOf(Array);
      expect(body.fulfillment_options).toBeInstanceOf(Array);
      expect(body.messages).toBeInstanceOf(Array);
      expect(body.links).toBeInstanceOf(Array);
      expect(body.order).toBeDefined();
      expect(body.order.id).toBeDefined();
      expect(body.order.checkout_session_id).toBe(body.id);
      expect(body.order.permalink_url).toBeDefined();
    });

    it('should preserve all line items and totals from session', async () => {
      // ARRANGE: Create session with multiple items
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.TWO_PRODUCTS,
          buyer: TEST_BUYERS.BASIC,
          address: TEST_ADDRESSES.US_RESIDENTIAL,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Complete session
      const response = await completeSession(
        sessionId,
        buildCompleteSessionRequest()
      );

      // ASSERT: Line items and totals preserved
      expect(response.status).toBe(200);

      const body: CompleteSessionResponse = response.body;
      expect(body.line_items.length).toBe(createResponse.body.line_items.length);

      // Validate line item calculations still valid
      body.line_items.forEach((lineItem) => {
        expect(lineItem.subtotal).toBe(lineItem.base_amount - lineItem.discount);
        expect(lineItem.total).toBe(lineItem.subtotal + lineItem.tax);
      });
    });
  });
});
