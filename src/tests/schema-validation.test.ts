/**
 * Schema Validation Tests
 *
 * These tests verify that the toSatisfyApiSpec() custom matcher correctly
 * validates responses against the OpenAPI specification.
 *
 * NOTE: These are development-only tests to verify the validation logic itself.
 * They do not run as part of the CLI tool for merchants.
 */

import { describe, it, expect } from 'vitest';

describe('Schema Validation Matcher', () => {
  describe('toSatisfyApiSpec()', () => {
    it('should pass for a valid response matching the schema', () => {
      // Mock a valid response from POST /checkout_sessions
      const validResponse = {
        status: 201,
        statusCode: 201,
        body: {
          id: 'cs_123',
          status: 'not_ready_for_payment',
          currency: 'usd',
          line_items: [
            {
              id: 'li_123',
              item: {
                id: 'item_123',
                quantity: 1,
              },
              base_amount: 1100,
              discount: 0,
              subtotal: 1100,
              tax: 110,
              total: 1210,
            },
          ],
          totals: [
            {
              type: 'items_base_amount',
              display_text: 'Item(s) total',
              amount: 1100,
            },
            {
              type: 'subtotal',
              display_text: 'Subtotal',
              amount: 1100,
            },
            {
              type: 'tax',
              display_text: 'Tax',
              amount: 110,
            },
            {
              type: 'total',
              display_text: 'Total',
              amount: 1210,
            },
          ],
          fulfillment_options: [],
          messages: [],
          links: [
            {
              type: 'terms_of_use',
              url: 'https://example.com/tos',
            },
            {
              type: 'privacy_policy',
              url: 'https://example.com/privacy',
            },
          ],
        },
        req: {
          method: 'POST',
          path: '/checkout_sessions',
        },
      };

      // This should pass validation
      expect(validResponse).toSatisfyApiSpec();
    });

    it('should fail for a response with missing required fields', () => {
      // Mock an invalid response missing required fields
      const invalidResponse = {
        status: 201,
        statusCode: 201,
        body: {
          id: 'cs_123',
          // Missing: status, currency, line_items, totals, fulfillment_options, messages, links
        },
        req: {
          method: 'POST',
          path: '/checkout_sessions',
        },
      };

      // This should fail validation
      expect(() => {
        expect(invalidResponse).toSatisfyApiSpec();
      }).toThrow();
    });

    it('should fail for a response with incorrect field types', () => {
      // Mock an invalid response with wrong types
      const invalidResponse = {
        status: 201,
        statusCode: 201,
        body: {
          id: 'cs_123',
          status: 'not_ready_for_payment',
          currency: 'usd',
          line_items: [
            {
              id: 'li_123',
              item: {
                id: 'item_123',
                quantity: 1,
              },
              base_amount: '1100', // Should be number, not string
              discount: 0,
              subtotal: 1100,
              tax: 110,
              total: 1210,
            },
          ],
          totals: [
            {
              type: 'items_base_amount',
              display_text: 'Item(s) total',
              amount: 1100,
            },
            {
              type: 'subtotal',
              display_text: 'Subtotal',
              amount: 1100,
            },
            {
              type: 'tax',
              display_text: 'Tax',
              amount: 110,
            },
            {
              type: 'total',
              display_text: 'Total',
              amount: 1210,
            },
          ],
          fulfillment_options: [],
          messages: [],
          links: [
            {
              type: 'terms_of_use',
              url: 'https://example.com/tos',
            },
            {
              type: 'privacy_policy',
              url: 'https://example.com/privacy',
            },
          ],
        },
        req: {
          method: 'POST',
          path: '/checkout_sessions',
        },
      };

      // This should fail validation
      expect(() => {
        expect(invalidResponse).toSatisfyApiSpec();
      }).toThrow();
    });

    it('should fail for a response with invalid status enum value', () => {
      // Mock an invalid response with wrong enum value
      const invalidResponse = {
        status: 201,
        statusCode: 201,
        body: {
          id: 'cs_123',
          status: 'invalid_status', // Not a valid enum value
          currency: 'usd',
          line_items: [
            {
              id: 'li_123',
              item: {
                id: 'item_123',
                quantity: 1,
              },
              base_amount: 1100,
              discount: 0,
              subtotal: 1100,
              tax: 110,
              total: 1210,
            },
          ],
          totals: [
            {
              type: 'items_base_amount',
              display_text: 'Item(s) total',
              amount: 1100,
            },
            {
              type: 'subtotal',
              display_text: 'Subtotal',
              amount: 1100,
            },
            {
              type: 'tax',
              display_text: 'Tax',
              amount: 110,
            },
            {
              type: 'total',
              display_text: 'Total',
              amount: 1210,
            },
          ],
          fulfillment_options: [],
          messages: [],
          links: [
            {
              type: 'terms_of_use',
              url: 'https://example.com/tos',
            },
            {
              type: 'privacy_policy',
              url: 'https://example.com/privacy',
            },
          ],
        },
        req: {
          method: 'POST',
          path: '/checkout_sessions',
        },
      };

      // This should fail validation
      expect(() => {
        expect(invalidResponse).toSatisfyApiSpec();
      }).toThrow();
    });

    it('should fail for undefined status code in spec', () => {
      // Mock a response with status code not defined in spec
      const invalidResponse = {
        status: 418, // I'm a teapot - not defined in spec
        statusCode: 418,
        body: {},
        req: {
          method: 'POST',
          path: '/checkout_sessions',
        },
      };

      // This should fail validation
      expect(() => {
        expect(invalidResponse).toSatisfyApiSpec();
      }).toThrow(/Status 418 not defined/);
    });

    it('should fail for undefined endpoint', () => {
      // Mock a response for endpoint not in spec
      const invalidResponse = {
        status: 200,
        statusCode: 200,
        body: {},
        req: {
          method: 'GET',
          path: '/nonexistent_endpoint',
        },
      };

      // This should fail validation
      expect(() => {
        expect(invalidResponse).toSatisfyApiSpec();
      }).toThrow(/Path \/nonexistent_endpoint not found/);
    });

    it('should fail for undefined HTTP method on valid endpoint', () => {
      // Mock a response for method not defined for this endpoint
      const invalidResponse = {
        status: 200,
        statusCode: 200,
        body: {},
        req: {
          method: 'DELETE', // DELETE not defined for /checkout_sessions
          path: '/checkout_sessions',
        },
      };

      // This should fail validation
      expect(() => {
        expect(invalidResponse).toSatisfyApiSpec();
      }).toThrow(/Method DELETE not defined for path \/checkout_sessions/);
    });

    it('should validate array item schemas correctly', () => {
      // Mock response with invalid array item
      const invalidResponse = {
        status: 201,
        statusCode: 201,
        body: {
          id: 'cs_123',
          status: 'not_ready_for_payment',
          currency: 'usd',
          line_items: [
            {
              id: 'li_123',
              item: {
                id: 'item_123',
                // Missing required field: quantity
              },
              base_amount: 1100,
              discount: 0,
              subtotal: 1100,
              tax: 110,
              total: 1210,
            },
          ],
          totals: [
            {
              type: 'items_base_amount',
              display_text: 'Item(s) total',
              amount: 1100,
            },
            {
              type: 'subtotal',
              display_text: 'Subtotal',
              amount: 1100,
            },
            {
              type: 'tax',
              display_text: 'Tax',
              amount: 110,
            },
            {
              type: 'total',
              display_text: 'Total',
              amount: 1210,
            },
          ],
          fulfillment_options: [],
          messages: [],
          links: [
            {
              type: 'terms_of_use',
              url: 'https://example.com/tos',
            },
            {
              type: 'privacy_policy',
              url: 'https://example.com/privacy',
            },
          ],
        },
        req: {
          method: 'POST',
          path: '/checkout_sessions',
        },
      };

      // This should fail validation
      expect(() => {
        expect(invalidResponse).toSatisfyApiSpec();
      }).toThrow();
    });
  });
});
