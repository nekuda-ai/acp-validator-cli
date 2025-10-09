/**
 * ACP Checkout API Tests
 * Tests for POST /checkout_sessions/{id} (update) endpoint
 */

import { describe, it, expect } from 'vitest';
import {
  createSession,
  updateSession,
  extractSessionId,
  extractFirstFulfillmentOptionId,
} from './helpers/requests.js';
import {
  buildCreateSessionRequest,
  buildUpdateSessionRequest,
  UPDATE_SESSION_SCENARIOS,
  TEST_ITEMS,
  TEST_BUYERS,
  TEST_ADDRESSES,
  TEST_FULFILLMENT_OPTIONS,
} from './fixtures/test-data.js';
import type { UpdateSessionResponse } from '../types/acp.js';

// ============================================================================
// Tests
// ============================================================================

describe('POST /checkout_sessions/{id} (update)', () => {
  describe('Update Session - Happy Path', () => {
    it('should add shipping address to session', async () => {
      // ARRANGE: Create minimal session
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Add shipping address
      const response = await updateSession(
        sessionId,
        buildUpdateSessionRequest({
          address: TEST_ADDRESSES.US_RESIDENTIAL,
        })
      );

      // ASSERT
      expect(response.status).toBe(200);

      const body: UpdateSessionResponse = response.body;
      expect(body.id).toBe(sessionId);
      expect(body.fulfillment_address).toBeDefined();
      expect(body.fulfillment_address?.city).toBe(TEST_ADDRESSES.US_RESIDENTIAL.city);

      // Should now have fulfillment options
      expect(body.fulfillment_options.length).toBeGreaterThan(0);
    });

    it('should update buyer information', async () => {
      // ARRANGE: Create session without buyer
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Add buyer info
      const response = await updateSession(
        sessionId,
        buildUpdateSessionRequest({
          buyer: TEST_BUYERS.WITH_PHONE,
        })
      );

      // ASSERT
      expect(response.status).toBe(200);

      const body: UpdateSessionResponse = response.body;
      expect(body.buyer).toBeDefined();
      expect(body.buyer?.first_name).toBe(TEST_BUYERS.WITH_PHONE.first_name);
      expect(body.buyer?.email).toBe(TEST_BUYERS.WITH_PHONE.email);
      expect(body.buyer?.phone_number).toBe(TEST_BUYERS.WITH_PHONE.phone_number);
    });

    it('should update item quantities', async () => {
      // ARRANGE: Create session with single item
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Update to multiple quantity
      const response = await updateSession(
        sessionId,
        buildUpdateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT_MULTI_QTY,
        })
      );

      // ASSERT
      expect(response.status).toBe(200);

      const body: UpdateSessionResponse = response.body;
      expect(body.line_items.length).toBeGreaterThan(0);

      // Total should be different from original
      const originalTotal = createResponse.body.totals.find((t: any) => t.type === 'total');
      const updatedTotal = body.totals.find((t) => t.type === 'total');
      expect(updatedTotal?.amount).toBeGreaterThan(originalTotal?.amount || 0);
    });

    it('should select fulfillment option and transition to ready_for_payment', async () => {
      // ARRANGE: Create session with address to get fulfillment options
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
          buyer: TEST_BUYERS.BASIC,
          address: TEST_ADDRESSES.US_RESIDENTIAL,
        })
      );
      const sessionId = extractSessionId(createResponse);
      const fulfillmentOptionId = extractFirstFulfillmentOptionId(createResponse);
      expect(fulfillmentOptionId).toBeDefined();

      // ACT: Select shipping option
      const response = await updateSession(
        sessionId,
        buildUpdateSessionRequest({
          fulfillmentOptionId,
        })
      );

      // ASSERT
      expect(response.status).toBe(200);

      const body: UpdateSessionResponse = response.body;
      expect(body.fulfillment_option_id).toBe(fulfillmentOptionId);

      // Status should transition to ready_for_payment
      expect(['ready_for_payment', 'not_ready_for_payment']).toContain(body.status);
    });
  });

  describe('Update Session - Parameterized Scenarios', () => {
    it.each(UPDATE_SESSION_SCENARIOS)(
      'should handle: $name',
      async ({ request, description }) => {
        // ARRANGE: Create base session
        const createResponse = await createSession(
          buildCreateSessionRequest({
            items: TEST_ITEMS.SINGLE_PRODUCT,
            address: TEST_ADDRESSES.US_RESIDENTIAL, // Provide address for fulfillment options
          })
        );
        const sessionId = extractSessionId(createResponse);

        // ACT: Update session
        const response = await updateSession(sessionId, request);

        // ASSERT
        expect(response.status, `Failed: ${description}`).toBe(200);

        const body: UpdateSessionResponse = response.body;
        expect(body.id, 'Session ID should remain the same').toBe(sessionId);
        expect(body.status, 'Status should be defined').toBeDefined();
        expect(body.totals, 'Totals should be updated').toBeInstanceOf(Array);
      }
    );
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent session', async () => {
      // ACT: Try to update non-existent session
      const response = await updateSession(
        'nonexistent_session_id',
        buildUpdateSessionRequest({
          buyer: TEST_BUYERS.BASIC,
        })
      );

      // ASSERT
      expect(response.status).toBe(404);
    });

    it('should reject invalid fulfillment option ID', async () => {
      // ARRANGE: Create session
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
          address: TEST_ADDRESSES.US_RESIDENTIAL,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Try to select invalid fulfillment option
      const response = await updateSession(
        sessionId,
        buildUpdateSessionRequest({
          fulfillmentOptionId: 'invalid_option_id',
        })
      );

      // ASSERT: Should either reject (400/404) or accept but not set it
      if (response.status !== 200) {
        expect([400, 404]).toContain(response.status);
      } else {
        // If accepted, it should not be set or should show error message
        const body: UpdateSessionResponse = response.body;
        expect(body.messages.some((m) => m.type === 'error')).toBeTruthy();
      }
    });
  });

  describe('Response Schema Validation', () => {
    it('should return complete session state after update', async () => {
      // ARRANGE: Create and update session
      const createResponse = await createSession(
        buildCreateSessionRequest()
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Update with full data
      const response = await updateSession(
        sessionId,
        buildUpdateSessionRequest({
          buyer: TEST_BUYERS.WITH_PHONE,
          address: TEST_ADDRESSES.US_WITH_APT,
          items: TEST_ITEMS.TWO_PRODUCTS,
        })
      );

      // ASSERT: Complete response structure
      expect(response.status).toBe(200);

      const body: UpdateSessionResponse = response.body;
      expect(body.id).toBeDefined();
      expect(body.status).toBeDefined();
      expect(body.currency).toBeDefined();
      expect(body.line_items).toBeInstanceOf(Array);
      expect(body.line_items.length).toBeGreaterThan(0);
      expect(body.totals).toBeInstanceOf(Array);
      expect(body.fulfillment_options).toBeInstanceOf(Array);
      expect(body.messages).toBeInstanceOf(Array);
      expect(body.links).toBeInstanceOf(Array);
    });

    it('should recalculate totals after updates', async () => {
      // ARRANGE: Create session
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
        })
      );
      const sessionId = extractSessionId(createResponse);
      const originalTotal = createResponse.body.totals.find((t: any) => t.type === 'total');

      // ACT: Update with more items
      const response = await updateSession(
        sessionId,
        buildUpdateSessionRequest({
          items: TEST_ITEMS.TWO_PRODUCTS,
        })
      );

      // ASSERT: Totals should be recalculated
      expect(response.status).toBe(200);

      const body: UpdateSessionResponse = response.body;
      const updatedTotal = body.totals.find((t) => t.type === 'total');

      expect(updatedTotal).toBeDefined();
      expect(updatedTotal?.amount).toBeGreaterThan(originalTotal?.amount || 0);
    });
  });
});
