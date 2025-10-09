/**
 * ACP Happy Path - End-to-End Flow Tests
 * Tests complete checkout flows from creation to completion
 */

import { describe, it, expect } from 'vitest';
import {
  createSession,
  getSession,
  updateSession,
  completeSession,
  extractSessionId,
  extractFirstFulfillmentOptionId,
} from './helpers/requests.js';
import {
  buildCreateSessionRequest,
  buildUpdateSessionRequest,
  buildCompleteSessionRequest,
  TEST_ITEMS,
  TEST_BUYERS,
  TEST_ADDRESSES,
  TEST_PAYMENT_DATA,
} from './fixtures/test-data.js';

// ============================================================================
// Happy Path E2E Tests
// ============================================================================

describe('ACP Happy Path - End-to-End Flow', () => {
  describe('Complete Checkout Flow', () => {
    it('should complete full flow: create → get → update address → update shipping → complete', async () => {
      // STEP 1: Create session with items and buyer
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
          buyer: TEST_BUYERS.BASIC,
        })
      );

      expect(createResponse.status).toBe(201);
      const sessionId = extractSessionId(createResponse);
      expect(sessionId).toBeDefined();
      expect(createResponse.body.status).toBe('not_ready_for_payment');

      // STEP 2: Retrieve session to verify it was created
      const getResponse = await getSession(sessionId);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.id).toBe(sessionId);
      expect(getResponse.body.buyer?.email).toBe(TEST_BUYERS.BASIC.email);

      // STEP 3: Add shipping address
      const updateAddressResponse = await updateSession(
        sessionId,
        buildUpdateSessionRequest({
          address: TEST_ADDRESSES.US_RESIDENTIAL,
        })
      );

      expect(updateAddressResponse.status).toBe(200);
      expect(updateAddressResponse.body.fulfillment_address).toBeDefined();
      expect(updateAddressResponse.body.fulfillment_options.length).toBeGreaterThan(0);

      // STEP 4: Select shipping option (if available)
      const fulfillmentOptionId = extractFirstFulfillmentOptionId(updateAddressResponse);

      if (fulfillmentOptionId) {
        const updateShippingResponse = await updateSession(
          sessionId,
          buildUpdateSessionRequest({
            fulfillmentOptionId,
          })
        );

        expect(updateShippingResponse.status).toBe(200);
        expect(updateShippingResponse.body.fulfillment_option_id).toBe(fulfillmentOptionId);
      }

      // STEP 5: Complete checkout with payment
      const completeResponse = await completeSession(
        sessionId,
        buildCompleteSessionRequest({
          paymentData: TEST_PAYMENT_DATA.MINIMAL,
        })
      );

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.status).toBe('completed');
      expect(completeResponse.body.order_id).toBeDefined();
      expect(typeof completeResponse.body.order_id).toBe('string');
      expect(completeResponse.body.order_id!.length).toBeGreaterThan(0);
    });

    it('should complete minimal flow: create with everything → complete', async () => {
      // STEP 1: Create session with all required data upfront
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
          buyer: TEST_BUYERS.BASIC,
          address: TEST_ADDRESSES.US_RESIDENTIAL,
        })
      );

      expect(createResponse.status).toBe(201);
      const sessionId = extractSessionId(createResponse);

      // Session should have fulfillment options immediately
      expect(createResponse.body.fulfillment_options.length).toBeGreaterThan(0);

      // STEP 2: Select fulfillment option if needed
      const fulfillmentOptionId = extractFirstFulfillmentOptionId(createResponse);

      if (fulfillmentOptionId && createResponse.body.status === 'not_ready_for_payment') {
        const updateResponse = await updateSession(
          sessionId,
          buildUpdateSessionRequest({ fulfillmentOptionId })
        );
        expect(updateResponse.status).toBe(200);
      }

      // STEP 3: Complete checkout directly
      const completeResponse = await completeSession(
        sessionId,
        buildCompleteSessionRequest()
      );

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.status).toBe('completed');
      expect(completeResponse.body.order_id).toBeDefined();
    });

    it('should handle state transitions correctly throughout flow', async () => {
      // STEP 1: Create → not_ready_for_payment
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
        })
      );

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.status).toBe('not_ready_for_payment');
      const sessionId = extractSessionId(createResponse);

      // STEP 2: Add buyer → still not_ready_for_payment
      const updateBuyerResponse = await updateSession(
        sessionId,
        buildUpdateSessionRequest({
          buyer: TEST_BUYERS.WITH_PHONE,
        })
      );

      expect(updateBuyerResponse.status).toBe(200);
      expect(updateBuyerResponse.body.status).toBe('not_ready_for_payment');

      // STEP 3: Add address → still not_ready_for_payment (need shipping selection)
      const updateAddressResponse = await updateSession(
        sessionId,
        buildUpdateSessionRequest({
          address: TEST_ADDRESSES.US_RESIDENTIAL,
        })
      );

      expect(updateAddressResponse.status).toBe(200);
      expect(['not_ready_for_payment', 'ready_for_payment']).toContain(
        updateAddressResponse.body.status
      );

      // STEP 4: Select shipping → ready_for_payment (or stay ready if already there)
      const fulfillmentOptionId = extractFirstFulfillmentOptionId(updateAddressResponse);

      if (fulfillmentOptionId) {
        const updateShippingResponse = await updateSession(
          sessionId,
          buildUpdateSessionRequest({ fulfillmentOptionId })
        );

        expect(updateShippingResponse.status).toBe(200);
        expect(['ready_for_payment', 'not_ready_for_payment']).toContain(
          updateShippingResponse.body.status
        );
      }

      // STEP 5: Complete → completed
      const completeResponse = await completeSession(
        sessionId,
        buildCompleteSessionRequest()
      );

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.status).toBe('completed');
    });
  });

  describe('Multiple Flow Scenarios', () => {
    it('should handle international checkout flow', async () => {
      // STEP 1: Create with Canadian address
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.TWO_PRODUCTS,
          buyer: TEST_BUYERS.INTERNATIONAL,
          address: TEST_ADDRESSES.CANADA_ADDRESS,
        })
      );

      expect(createResponse.status).toBe(201);
      const sessionId = extractSessionId(createResponse);

      // STEP 2: Verify address accepted
      expect(createResponse.body.fulfillment_address?.country).toBe('CA');

      // STEP 3: Select shipping if needed
      const fulfillmentOptionId = extractFirstFulfillmentOptionId(createResponse);

      if (fulfillmentOptionId) {
        await updateSession(
          sessionId,
          buildUpdateSessionRequest({ fulfillmentOptionId })
        );
      }

      // STEP 4: Complete with billing address
      const completeResponse = await completeSession(
        sessionId,
        buildCompleteSessionRequest({
          paymentData: TEST_PAYMENT_DATA.WITH_BILLING,
        })
      );

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.status).toBe('completed');
      expect(completeResponse.body.order_id).toBeDefined();
    });

    it('should handle buyer override in complete request', async () => {
      // STEP 1: Create without buyer
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
          address: TEST_ADDRESSES.US_RESIDENTIAL,
        })
      );

      expect(createResponse.status).toBe(201);
      const sessionId = extractSessionId(createResponse);
      expect(createResponse.body.buyer).toBeUndefined();

      // STEP 2: Select shipping if needed
      const fulfillmentOptionId = extractFirstFulfillmentOptionId(createResponse);

      if (fulfillmentOptionId) {
        await updateSession(
          sessionId,
          buildUpdateSessionRequest({ fulfillmentOptionId })
        );
      }

      // STEP 3: Complete with buyer in complete request
      const completeResponse = await completeSession(
        sessionId,
        buildCompleteSessionRequest({
          paymentData: TEST_PAYMENT_DATA.MINIMAL,
          buyer: TEST_BUYERS.WITH_PHONE,
        })
      );

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.status).toBe('completed');
      expect(completeResponse.body.buyer).toBeDefined();
      expect(completeResponse.body.buyer?.email).toBe(TEST_BUYERS.WITH_PHONE.email);
    });
  });

  describe('Data Persistence Across Requests', () => {
    it('should persist all data from create through complete', async () => {
      // STEP 1: Create with full data
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.TWO_PRODUCTS,
          buyer: TEST_BUYERS.WITH_PHONE,
          address: TEST_ADDRESSES.US_WITH_APT,
        })
      );

      const sessionId = extractSessionId(createResponse);
      const originalLineItemCount = createResponse.body.line_items.length;
      const originalBuyerEmail = createResponse.body.buyer?.email;
      const originalAddress = createResponse.body.fulfillment_address;

      // STEP 2: Get session - verify data persisted
      const getResponse = await getSession(sessionId);

      expect(getResponse.body.line_items.length).toBe(originalLineItemCount);
      expect(getResponse.body.buyer?.email).toBe(originalBuyerEmail);
      expect(getResponse.body.fulfillment_address?.city).toBe(originalAddress?.city);

      // STEP 3: Select shipping
      const fulfillmentOptionId = extractFirstFulfillmentOptionId(createResponse);

      if (fulfillmentOptionId) {
        const updateResponse = await updateSession(
          sessionId,
          buildUpdateSessionRequest({ fulfillmentOptionId })
        );

        // Data still persisted after update
        expect(updateResponse.body.line_items.length).toBe(originalLineItemCount);
        expect(updateResponse.body.buyer?.email).toBe(originalBuyerEmail);
      }

      // STEP 4: Complete - all data preserved in final state
      const completeResponse = await completeSession(
        sessionId,
        buildCompleteSessionRequest({
          paymentData: TEST_PAYMENT_DATA.WITH_BILLING,
        })
      );

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.line_items.length).toBe(originalLineItemCount);
      expect(completeResponse.body.buyer?.email).toBe(originalBuyerEmail);
      expect(completeResponse.body.fulfillment_address?.city).toBe(originalAddress?.city);
      expect(completeResponse.body.order_id).toBeDefined();
    });
  });
});
