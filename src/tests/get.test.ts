/**
 * ACP Checkout API Tests
 * Tests for GET /checkout_sessions/{id} endpoint
 */

import { describe, it, expect } from 'vitest';
import { createSession, getSession, extractSessionId } from './helpers/requests.js';
import { buildCreateSessionRequest, TEST_ITEMS, TEST_BUYERS, TEST_ADDRESSES } from './fixtures/test-data.js';
import type { GetSessionResponse } from '../types/acp.js';

// ============================================================================
// Tests
// ============================================================================

describe('GET /checkout_sessions/{id}', () => {
  describe('Retrieve Session - Happy Path', () => {
    it('should retrieve existing session by ID', async () => {
      // ARRANGE: Create a session first
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
          buyer: TEST_BUYERS.BASIC,
          address: TEST_ADDRESSES.US_RESIDENTIAL,
        })
      );
      expect(createResponse.status).toBe(201);
      const sessionId = extractSessionId(createResponse);

      // ACT: Retrieve the session
      const response = await getSession(sessionId);

      // ASSERT: Response structure
      expect(response.status).toBe(200);

      const body: GetSessionResponse = response.body;
      expect(body.id).toBe(sessionId);
      expect(body.status).toBeDefined();
      expect(body.currency).toBeDefined();
      expect(body.line_items).toBeInstanceOf(Array);
      expect(body.line_items.length).toBeGreaterThan(0);
      expect(body.totals).toBeInstanceOf(Array);
      expect(body.fulfillment_options).toBeInstanceOf(Array);
      expect(body.messages).toBeInstanceOf(Array);
      expect(body.links).toBeInstanceOf(Array);
    });

    it('should return same data as create response', async () => {
      // ARRANGE: Create a session
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.TWO_PRODUCTS,
          buyer: TEST_BUYERS.WITH_PHONE,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Retrieve the session
      const getResponse = await getSession(sessionId);

      // ASSERT: Data matches
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.id).toBe(createResponse.body.id);
      expect(getResponse.body.status).toBe(createResponse.body.status);
      expect(getResponse.body.line_items.length).toBe(createResponse.body.line_items.length);

      // Buyer information should match
      expect(getResponse.body.buyer?.email).toBe(createResponse.body.buyer?.email);
    });

    it('should retrieve session with all optional fields', async () => {
      // ARRANGE: Create session with full data
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.TWO_PRODUCTS,
          buyer: TEST_BUYERS.WITH_PHONE,
          address: TEST_ADDRESSES.US_WITH_APT,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Retrieve the session
      const response = await getSession(sessionId);

      // ASSERT: All fields present
      expect(response.status).toBe(200);

      const body: GetSessionResponse = response.body;
      expect(body.buyer).toBeDefined();
      expect(body.buyer?.first_name).toBe(TEST_BUYERS.WITH_PHONE.first_name);
      expect(body.buyer?.email).toBe(TEST_BUYERS.WITH_PHONE.email);

      expect(body.fulfillment_address).toBeDefined();
      expect(body.fulfillment_address?.city).toBe(TEST_ADDRESSES.US_WITH_APT.city);
      expect(body.fulfillment_address?.country).toBe(TEST_ADDRESSES.US_WITH_APT.country);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent session', async () => {
      // ACT: Try to retrieve non-existent session
      const response = await getSession('nonexistent_session_id');

      // ASSERT: 404 error
      expect(response.status).toBe(404);
    });

    it('should return 404 for invalid session ID format', async () => {
      // ACT: Try with invalid ID format
      const response = await getSession('invalid-format-123!@#');

      // ASSERT: 404 error
      expect(response.status).toBe(404);
    });
  });

  describe('Response Headers', () => {
    it('should echo Idempotency-Key in response headers', async () => {
      // ARRANGE: Create session
      const createResponse = await createSession(
        buildCreateSessionRequest()
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Retrieve session
      const response = await getSession(sessionId);

      // ASSERT: Headers present
      expect(response.status).toBe(200);
      expect(response.headers['idempotency-key']).toBeDefined();
      expect(response.headers['request-id']).toBeDefined();
    });
  });

  describe('Response Schema Validation', () => {
    it('should return valid line items structure', async () => {
      // ARRANGE: Create session with multiple items
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.TWO_PRODUCTS,
        })
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Retrieve session
      const response = await getSession(sessionId);

      // ASSERT: Line items structure
      expect(response.status).toBe(200);

      const body: GetSessionResponse = response.body;
      body.line_items.forEach((lineItem) => {
        expect(lineItem.id).toBeDefined();
        expect(lineItem.item).toBeDefined();
        expect(lineItem.base_amount).toBeGreaterThanOrEqual(0);
        expect(lineItem.discount).toBeGreaterThanOrEqual(0);
        expect(lineItem.subtotal).toBeGreaterThanOrEqual(0);
        expect(lineItem.tax).toBeGreaterThanOrEqual(0);
        expect(lineItem.total).toBeGreaterThanOrEqual(0);

        // Validate calculations
        expect(lineItem.subtotal).toBe(lineItem.base_amount - lineItem.discount);
        expect(lineItem.total).toBe(lineItem.subtotal + lineItem.tax);
      });
    });

    it('should return valid totals array', async () => {
      // ARRANGE: Create session
      const createResponse = await createSession(
        buildCreateSessionRequest()
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Retrieve session
      const response = await getSession(sessionId);

      // ASSERT: Totals structure
      expect(response.status).toBe(200);

      const body: GetSessionResponse = response.body;
      expect(body.totals.length).toBeGreaterThan(0);

      body.totals.forEach((total) => {
        expect(total.type).toBeDefined();
        expect(total.display_text).toBeDefined();
        expect(total.amount).toBeDefined();
        expect(typeof total.amount).toBe('number');
      });

      // Should have a 'total' type
      const grandTotal = body.totals.find((t) => t.type === 'total');
      expect(grandTotal).toBeDefined();
    });

    it('should return currency in ISO 4217 lowercase format', async () => {
      // ARRANGE: Create session
      const createResponse = await createSession(
        buildCreateSessionRequest()
      );
      const sessionId = extractSessionId(createResponse);

      // ACT: Retrieve session
      const response = await getSession(sessionId);

      // ASSERT: Currency format
      expect(response.status).toBe(200);

      const body: GetSessionResponse = response.body;
      expect(body.currency).toBeDefined();
      expect(body.currency).toBe(body.currency.toLowerCase());
      expect(body.currency).toMatch(/^[a-z]{3}$/); // 3-letter code
    });
  });
});
