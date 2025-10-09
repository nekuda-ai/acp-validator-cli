/**
 * ACP Checkout API Tests
 * Tests for POST /checkout_sessions endpoint
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { generateACPHeaders, DEFAULT_API_VERSION } from './helpers/headers.js';
import {
  CREATE_SESSION_SCENARIOS,
  TEST_ITEMS,
  TEST_BUYERS,
  TEST_ADDRESSES,
  buildCreateSessionRequest,
} from './fixtures/test-data.js';
import type { CreateSessionResponse } from '../types/acp.js';

// ============================================================================
// Test Configuration
// ============================================================================

// These will be overridden by CLI config in actual runs
const BASE_URL = process.env.CHECKOUT_URL || 'http://localhost:3004';
const API_KEY = process.env.API_KEY || 'test_key_123';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper to make ACP checkout session creation request
 */
async function createSession(requestBody: object) {
  return request(BASE_URL)
    .post('/checkout_sessions')
    .set(generateACPHeaders({ apiKey: API_KEY }))
    .send(requestBody);
}

// ============================================================================
// Tests
// ============================================================================

describe('POST /checkout_sessions', () => {
  describe('Session Creation - Happy Path', () => {
    it('should create session with minimal data (single item only)', async () => {
      const requestBody = buildCreateSessionRequest({
        items: TEST_ITEMS.SINGLE_PRODUCT,
      });

      const response = await createSession(requestBody);

      // Assert HTTP status
      expect(response.status).toBe(201);

      // Assert required response headers
      expect(response.headers['idempotency-key']).toBeDefined();
      expect(response.headers['request-id']).toBeDefined();

      // Assert response body structure
      const body: CreateSessionResponse = response.body;
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

    it('should satisfy OpenAPI spec (schema validation)', async () => {
      const requestBody = buildCreateSessionRequest({
        items: TEST_ITEMS.SINGLE_PRODUCT,
      });

      const response = await createSession(requestBody);

      expect(response.status).toBe(201);
      expect(response).toSatisfyApiSpec();
    });

    it('should create session with buyer information', async () => {
      const requestBody = buildCreateSessionRequest({
        items: TEST_ITEMS.SINGLE_PRODUCT,
        buyer: TEST_BUYERS.BASIC,
      });

      const response = await createSession(requestBody);

      expect(response.status).toBe(201);

      const body: CreateSessionResponse = response.body;
      expect(body.id).toBeDefined();
      expect(body.buyer).toBeDefined();
      expect(body.buyer?.first_name).toBe(TEST_BUYERS.BASIC.first_name);
      expect(body.buyer?.email).toBe(TEST_BUYERS.BASIC.email);
    });

    it('should create session with shipping address', async () => {
      const requestBody = buildCreateSessionRequest({
        items: TEST_ITEMS.SINGLE_PRODUCT,
        address: TEST_ADDRESSES.US_RESIDENTIAL,
      });

      const response = await createSession(requestBody);

      expect(response.status).toBe(201);

      const body: CreateSessionResponse = response.body;
      expect(body.id).toBeDefined();
      expect(body.fulfillment_address).toBeDefined();
      expect(body.fulfillment_address?.city).toBe(TEST_ADDRESSES.US_RESIDENTIAL.city);
      expect(body.fulfillment_address?.country).toBe(TEST_ADDRESSES.US_RESIDENTIAL.country);

      // When address is provided, shipping options should be available
      expect(body.fulfillment_options.length).toBeGreaterThan(0);
    });
  });

  describe('Session Creation - Parameterized Scenarios', () => {
    // Run all predefined scenarios as parameterized tests
    it.each(CREATE_SESSION_SCENARIOS)(
      'should handle: $name',
      async ({ request: requestBody, description }) => {
        const response = await createSession(requestBody);

        // All scenarios should succeed with 201
        expect(response.status, `Failed: ${description}`).toBe(201);

        const body: CreateSessionResponse = response.body;

        // All responses must have these required fields
        expect(body.id, 'Missing session ID').toBeDefined();
        expect(body.status, 'Missing status').toBeDefined();
        expect(body.currency, 'Missing currency').toBeDefined();
        expect(body.line_items, 'Missing line_items').toBeInstanceOf(Array);
        expect(body.totals, 'Missing totals').toBeInstanceOf(Array);
      }
    );
  });

  describe('Required Headers Validation', () => {
    it('should accept request with all required headers', async () => {
      const requestBody = buildCreateSessionRequest();

      const response = await request(BASE_URL)
        .post('/checkout_sessions')
        .set(generateACPHeaders({
          apiKey: API_KEY,
          apiVersion: DEFAULT_API_VERSION
        }))
        .send(requestBody);

      expect(response.status).toBe(201);
    });

    it('should echo Idempotency-Key in response headers', async () => {
      const requestBody = buildCreateSessionRequest();
      const idempotencyKey = 'test-idempotency-key-123';

      const response = await request(BASE_URL)
        .post('/checkout_sessions')
        .set(generateACPHeaders({
          apiKey: API_KEY,
          idempotencyKey
        }))
        .send(requestBody);

      expect(response.status).toBe(201);
      expect(response.headers['idempotency-key']).toBe(idempotencyKey);
    });

    it('should echo Request-Id in response headers', async () => {
      const requestBody = buildCreateSessionRequest();
      const requestId = 'test-request-id-456';

      const response = await request(BASE_URL)
        .post('/checkout_sessions')
        .set(generateACPHeaders({
          apiKey: API_KEY,
          requestId
        }))
        .send(requestBody);

      expect(response.status).toBe(201);
      expect(response.headers['request-id']).toBe(requestId);
    });
  });

  describe('API Version Handling', () => {
    it('should accept supported API version', async () => {
      const requestBody = buildCreateSessionRequest();

      const response = await request(BASE_URL)
        .post('/checkout_sessions')
        .set(generateACPHeaders({
          apiKey: API_KEY,
          apiVersion: '2025-09-12'
        }))
        .send(requestBody);

      expect(response.status).toBe(201);
    });
  });

  describe('Response Schema Validation', () => {
    it('should return valid line items with proper calculations', async () => {
      const requestBody = buildCreateSessionRequest({
        items: TEST_ITEMS.TWO_PRODUCTS,
      });

      const response = await createSession(requestBody);
      expect(response.status).toBe(201);

      const body: CreateSessionResponse = response.body;

      // Validate line items structure
      body.line_items.forEach((lineItem) => {
        expect(lineItem.id).toBeDefined();
        expect(lineItem.item).toBeDefined();
        expect(lineItem.base_amount).toBeGreaterThanOrEqual(0);
        expect(lineItem.discount).toBeGreaterThanOrEqual(0);
        expect(lineItem.subtotal).toBeGreaterThanOrEqual(0);
        expect(lineItem.tax).toBeGreaterThanOrEqual(0);
        expect(lineItem.total).toBeGreaterThanOrEqual(0);

        // Validate calculation: subtotal = base_amount - discount
        expect(lineItem.subtotal).toBe(lineItem.base_amount - lineItem.discount);

        // Validate calculation: total = subtotal + tax
        expect(lineItem.total).toBe(lineItem.subtotal + lineItem.tax);
      });
    });

    it('should return valid totals array', async () => {
      const requestBody = buildCreateSessionRequest();

      const response = await createSession(requestBody);
      expect(response.status).toBe(201);

      const body: CreateSessionResponse = response.body;

      // Must have at least a total
      expect(body.totals.length).toBeGreaterThan(0);

      // Each total must have required fields
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

    it('should return legal links (ToS, Privacy)', async () => {
      const requestBody = buildCreateSessionRequest();

      const response = await createSession(requestBody);
      expect(response.status).toBe(201);

      const body: CreateSessionResponse = response.body;

      // Links array must exist
      expect(body.links).toBeInstanceOf(Array);

      // Should have at least ToS and Privacy Policy
      const linkTypes = body.links.map((link) => link.type);
      expect(linkTypes).toContain('terms_of_use');
      expect(linkTypes).toContain('privacy_policy');

      // Each link must have a valid URL
      body.links.forEach((link) => {
        expect(link.url).toBeDefined();
        expect(link.url).toMatch(/^https?:\/\//);
      });
    });
  });

  describe('Currency and Locale', () => {
    it('should return currency in ISO 4217 lowercase format', async () => {
      const requestBody = buildCreateSessionRequest();

      const response = await createSession(requestBody);
      expect(response.status).toBe(201);

      const body: CreateSessionResponse = response.body;

      // Currency must be lowercase (e.g., "usd" not "USD")
      expect(body.currency).toBeDefined();
      expect(body.currency).toBe(body.currency.toLowerCase());
      expect(body.currency).toMatch(/^[a-z]{3}$/); // 3-letter code
    });
  });
});
