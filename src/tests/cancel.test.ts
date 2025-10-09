/**
 * ACP Checkout API Tests
 * Tests for POST /checkout_sessions/{id}/cancel endpoint
 */

import { describe, it, expect } from 'vitest';
import {
  createSession,
  updateSession,
  completeSession,
  cancelSession,
  extractSessionId,
} from './helpers/requests.js';
import {
  buildCreateSessionRequest,
  buildUpdateSessionRequest,
  buildCompleteSessionRequest,
  TEST_ITEMS,
  TEST_BUYERS,
  TEST_ADDRESSES,
} from './fixtures/test-data.js';
import type { CancelSessionResponse } from '../types/acp.js';

// ============================================================================
// Tests
// ============================================================================

describe('POST /checkout_sessions/{id}/cancel', () => {
  describe('Cancel Session - Happy Path', () => {
    it('should cancel not_ready_for_payment session', async () => {
      // ARRANGE: Create minimal session (not ready for payment)
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
        })
      );
      const sessionId = extractSessionId(createResponse);
      expect(createResponse.body.status).toBe('not_ready_for_payment');

      // ACT: Cancel the session
      const response = await cancelSession(sessionId);

      // ASSERT
      expect(response.status).toBe(200);

      const body: CancelSessionResponse = response.body;
      expect(body.id).toBe(sessionId);
      expect(body.status).toBe('canceled');
      expect(body.currency).toBeDefined();
      expect(body.line_items).toBeInstanceOf(Array);
      expect(body.totals).toBeInstanceOf(Array);
    });

    it('should cancel ready_for_payment session', async () => {
      // ARRANGE: Create session ready for payment
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
          buyer: TEST_BUYERS.BASIC,
          address: TEST_ADDRESSES.US_RESIDENTIAL,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // Session might be ready_for_payment or not_ready_for_payment
      // depending on whether fulfillment options require selection
      expect(['ready_for_payment', 'not_ready_for_payment']).toContain(
        createResponse.body.status
      );

      // ACT: Cancel the session
      const response = await cancelSession(sessionId);

      // ASSERT
      expect(response.status).toBe(200);

      const body: CancelSessionResponse = response.body;
      expect(body.status).toBe('canceled');
      expect(body.id).toBe(sessionId);
    });

    it('should preserve all session data after cancel', async () => {
      // ARRANGE: Create session with full data
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.TWO_PRODUCTS,
          buyer: TEST_BUYERS.WITH_PHONE,
          address: TEST_ADDRESSES.US_WITH_APT,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Cancel the session
      const response = await cancelSession(sessionId);

      // ASSERT: All data preserved except status
      expect(response.status).toBe(200);

      const body: CancelSessionResponse = response.body;
      expect(body.status).toBe('canceled');

      // Original data should be preserved
      expect(body.line_items.length).toBe(createResponse.body.line_items.length);
      expect(body.buyer?.email).toBe(createResponse.body.buyer?.email);
      expect(body.fulfillment_address).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent session', async () => {
      // ACT: Try to cancel non-existent session
      const response = await cancelSession('nonexistent_session_id');

      // ASSERT
      expect(response.status).toBe(404);
    });

    it('should reject canceling already-canceled session', async () => {
      // ARRANGE: Create and cancel session
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // First cancel
      const firstCancel = await cancelSession(sessionId);
      expect(firstCancel.status).toBe(200);
      expect(firstCancel.body.status).toBe('canceled');

      // ACT: Try to cancel again
      const response = await cancelSession(sessionId);

      // ASSERT: Should reject double cancellation
      // Per spec: canceled sessions cannot be modified
      expect([400, 405, 409]).toContain(response.status);
    });

    it('should reject canceling completed session', async () => {
      // ARRANGE: Create and complete session
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
          buyer: TEST_BUYERS.BASIC,
          address: TEST_ADDRESSES.US_RESIDENTIAL,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // Complete the session
      const completeResponse = await completeSession(
        sessionId,
        buildCompleteSessionRequest()
      );
      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.status).toBe('completed');

      // ACT: Try to cancel completed session
      const response = await cancelSession(sessionId);

      // ASSERT: Should reject cancellation of completed session
      // Per spec: completed sessions cannot be canceled
      expect([400, 405, 409]).toContain(response.status);
    });
  });

  describe('Response Schema Validation', () => {
    it('should return complete session state after cancel', async () => {
      // ARRANGE: Create session with full data
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.TWO_PRODUCTS,
          buyer: TEST_BUYERS.WITH_PHONE,
          address: TEST_ADDRESSES.US_WITH_APT,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Cancel session
      const response = await cancelSession(sessionId);

      // ASSERT: Complete response structure
      expect(response.status).toBe(200);

      const body: CancelSessionResponse = response.body;
      expect(body.id).toBeDefined();
      expect(body.status).toBe('canceled');
      expect(body.currency).toBeDefined();
      expect(body.line_items).toBeInstanceOf(Array);
      expect(body.line_items.length).toBeGreaterThan(0);
      expect(body.totals).toBeInstanceOf(Array);
      expect(body.fulfillment_options).toBeInstanceOf(Array);
      expect(body.messages).toBeInstanceOf(Array);
      expect(body.links).toBeInstanceOf(Array);

      // Buyer and address should be preserved
      expect(body.buyer).toBeDefined();
      expect(body.fulfillment_address).toBeDefined();
    });

    it('should maintain valid totals after cancel', async () => {
      // ARRANGE: Create session
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
          buyer: TEST_BUYERS.BASIC,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Cancel session
      const response = await cancelSession(sessionId);

      // ASSERT: Totals still valid
      expect(response.status).toBe(200);

      const body: CancelSessionResponse = response.body;
      expect(body.totals.length).toBeGreaterThan(0);

      // Totals structure should be valid
      body.totals.forEach((total: any) => {
        expect(total.type).toBeDefined();
        expect(total.display_text).toBeDefined();
        expect(total.amount).toBeDefined();
        expect(typeof total.amount).toBe('number');
      });

      // Should have a 'total' type
      const grandTotal = body.totals.find((t: any) => t.type === 'total');
      expect(grandTotal).toBeDefined();
    });
  });
});
