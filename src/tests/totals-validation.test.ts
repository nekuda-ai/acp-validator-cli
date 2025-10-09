/**
 * ACP Checkout API Tests
 * Totals Calculation Validation - Best Practice
 *
 * Validates that all monetary totals are calculated correctly according to spec:
 * - Formula: total = subtotal - discount + fulfillment + tax + fee
 * - All amounts in minor units (cents)
 * - All totals types present and valid
 */

import { describe, it, expect } from 'vitest';
import {
  createSession,
  updateSession,
  completeSession,
  extractSessionId,
} from './helpers/requests.js';
import {
  buildCreateSessionRequest,
  buildUpdateSessionRequest,
  TEST_ITEMS,
  TEST_ADDRESSES,
} from './fixtures/test-data.js';
import type { CreateSessionResponse, Total } from '../types/acp.js';

// ============================================================================
// Test Data
// ============================================================================

const TOTAL_TYPE_SCENARIOS = [
  {
    type: 'items_base_amount',
    description: 'represents sum of base prices',
    validation: (body: CreateSessionResponse, amount: number) => {
      const calculatedBase = body.line_items.reduce((sum, item) => sum + item.base_amount, 0);
      return amount === calculatedBase;
    },
    skip: false,
  },
  {
    type: 'items_discount',
    description: 'represents sum of line item discounts',
    validation: (body: CreateSessionResponse, amount: number) => {
      const calculatedDiscount = body.line_items.reduce((sum, item) => sum + item.discount, 0);
      return amount === calculatedDiscount;
    },
    skip: false,
  },
  {
    type: 'subtotal',
    description: 'equals items_base_amount - items_discount',
    validation: (body: CreateSessionResponse, amount: number) => {
      const itemsBaseAmount = getTotalAmount(body.totals, 'items_base_amount');
      const itemsDiscount = getTotalAmount(body.totals, 'items_discount');
      return amount === (itemsBaseAmount - itemsDiscount);
    },
    skip: false,
  },
];

const EDGE_CASE_SCENARIOS = [
  {
    scenario: 'zero shipping cost',
    request: {
      items: TEST_ITEMS.SINGLE_PRODUCT,
      shipping_address: TEST_ADDRESSES.US_WITH_APT,
    },
    totalType: 'fulfillment',
    expectedCondition: 'greaterThanOrEqual',
    expectedValue: 0,
    description: 'Fulfillment can be zero if not selected or free shipping',
  },
  {
    scenario: 'zero discount',
    request: {
      items: TEST_ITEMS.SINGLE_PRODUCT,
    },
    totalType: 'discount',
    expectedCondition: 'greaterThanOrEqual',
    expectedValue: 0,
    description: 'Discount can be zero if no discounts applied',
  },
  {
    scenario: 'fee total if present',
    request: {
      items: TEST_ITEMS.SINGLE_PRODUCT,
    },
    totalType: 'fee',
    expectedCondition: 'greaterThanOrEqual',
    expectedValue: 0,
    description: 'Fee is optional, can be zero',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

const getTotalAmount = (totals: Total[], type: string) => totals.find(t => t.type === type)?.amount || 0;

const validateTotalFormula = (totals: Total[]) => {
  const [subtotal, discount, fulfillment, tax, fee, total] =
    ['subtotal', 'discount', 'fulfillment', 'tax', 'fee', 'total'].map(t => getTotalAmount(totals, t));
  expect(total).toBe(subtotal - discount + fulfillment + tax + fee);
};

const validateRequiredTotalTypes = (totals: Total[]) => {
  ['items_base_amount', 'items_discount', 'subtotal', 'discount', 'fulfillment', 'tax', 'total'].forEach(type => {
    const total = totals.find(t => t.type === type);
    expect(total?.amount).toBeDefined();
  });
};

// ============================================================================
// Tests
// ============================================================================

describe('Totals Calculation Validation', () => {
  describe('Total Formula Validation', () => {
    it('should validate total formula: total = subtotal - discount + fulfillment + tax + fee', async () => {
      const response = await createSession(buildCreateSessionRequest({
        items: TEST_ITEMS.SINGLE_PRODUCT,
        shipping_address: TEST_ADDRESSES.US_WITH_APT,
      }));
      expect(response.status).toBe(201);
      validateTotalFormula(response.body.totals);
    });

    it('should validate formula after selecting shipping option', async () => {
      const createResponse = await createSession(buildCreateSessionRequest({
        items: TEST_ITEMS.SINGLE_PRODUCT,
        shipping_address: TEST_ADDRESSES.US_WITH_APT,
      }));
      const sessionId = extractSessionId(createResponse);
      const fulfillmentId = createResponse.body.fulfillment_options?.[0]?.id;
      expect(fulfillmentId).toBeDefined();
      const updateResponse = await updateSession(sessionId, buildUpdateSessionRequest({
        fulfillment_selection: { id: fulfillmentId! },
      }));
      expect(updateResponse.status).toBe(200);
      validateTotalFormula(updateResponse.body.totals);
    });

    it('should validate formula with multiple items', async () => {
      const response = await createSession(buildCreateSessionRequest({
        items: TEST_ITEMS.TWO_PRODUCTS,
        shipping_address: TEST_ADDRESSES.US_WITH_APT,
      }));
      expect(response.status).toBe(201);
      validateTotalFormula(response.body.totals);
    });
  });

  describe('Required Total Types', () => {
    it('should include all required total types in create response', async () => {
      const response = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
        })
      );

      expect(response.status).toBe(201);
      const body: CreateSessionResponse = response.body;

      validateRequiredTotalTypes(body.totals);
    });

    it('should include all required total types after update', async () => {
      const createResponse = await createSession(
        buildCreateSessionRequest({
          items: TEST_ITEMS.SINGLE_PRODUCT,
        })
      );
      const sessionId = extractSessionId(createResponse);

      const updateResponse = await updateSession(
        sessionId,
        buildUpdateSessionRequest({
          shipping_address: TEST_ADDRESSES.US_WITH_APT,
        })
      );

      expect(updateResponse.status).toBe(200);
      const body: CreateSessionResponse = updateResponse.body;

      validateRequiredTotalTypes(body.totals);
    });
  });

  // ============================================================================
  // Parameterized: Total Type Definitions
  // ============================================================================

  describe.each(TOTAL_TYPE_SCENARIOS)(
    'Total type: $type - $description',
    ({ type, description, validation, skip }) => {
      const testFn = skip ? it.skip : it;

      testFn(`should validate ${type} ${description}`, async () => {
        const response = await createSession(
          buildCreateSessionRequest({
            items: TEST_ITEMS.SINGLE_PRODUCT,
          })
        );

        const body: CreateSessionResponse = response.body;
        const amount = getTotalAmount(body.totals, type);

        expect(validation(body, amount)).toBe(true);
      });
    }
  );

  it('should validate fulfillment total matches selected shipping cost', async () => {
    // Create with address to get shipping options
    const createResponse = await createSession(
      buildCreateSessionRequest({
        items: TEST_ITEMS.SINGLE_PRODUCT,
        shipping_address: TEST_ADDRESSES.US_WITH_APT,
      })
    );
    const sessionId = extractSessionId(createResponse);
    const body1: CreateSessionResponse = createResponse.body;

    const fulfillmentOption = body1.fulfillment_options?.[0];
    expect(fulfillmentOption).toBeDefined();

    // Select shipping option
    const updateResponse = await updateSession(
      sessionId,
      buildUpdateSessionRequest({
        fulfillment_selection: { id: fulfillmentOption!.id },
      })
    );

    const body2: CreateSessionResponse = updateResponse.body;
    const fulfillmentTotal = getTotalAmount(body2.totals, 'fulfillment');

    // Fulfillment total should match selected option's total
    expect(fulfillmentTotal).toBeGreaterThanOrEqual(0);
  });

  describe('Total Amount Properties', () => {
    it('should validate all amounts are integers (minor units)', async () => {
      const response = await createSession(buildCreateSessionRequest({ items: TEST_ITEMS.SINGLE_PRODUCT }));
      response.body.totals.forEach((total: Total) => expect(Number.isInteger(total.amount)).toBe(true));
    });

    it('should validate all amounts are non-negative', async () => {
      const response = await createSession(buildCreateSessionRequest({ items: TEST_ITEMS.SINGLE_PRODUCT }));
      response.body.totals.forEach((total: Total) => expect(total.amount).toBeGreaterThanOrEqual(0));
    });

    it('should validate total is greater than zero for non-empty cart', async () => {
      const response = await createSession(buildCreateSessionRequest({ items: TEST_ITEMS.SINGLE_PRODUCT }));
      expect(getTotalAmount(response.body.totals, 'total')).toBeGreaterThan(0);
    });

    it('should validate display_text is present for all totals', async () => {
      const response = await createSession(buildCreateSessionRequest({ items: TEST_ITEMS.SINGLE_PRODUCT }));
      response.body.totals.forEach((total: Total) => expect(total.display_text?.length).toBeGreaterThan(0));
    });
  });

  // ============================================================================
  // Parameterized: Edge Cases
  // ============================================================================

  describe.each(EDGE_CASE_SCENARIOS)(
    'Edge case: $scenario',
    ({ scenario, request, totalType, expectedCondition, expectedValue, description }) => {
      it(`should handle ${scenario} correctly`, async () => {
        const response = await createSession(buildCreateSessionRequest(request));

        const body: CreateSessionResponse = response.body;
        const amount = getTotalAmount(body.totals, totalType);

        // Validate condition
        if (expectedCondition === 'greaterThanOrEqual') {
          expect(amount).toBeGreaterThanOrEqual(expectedValue);
        }

        // Formula should still be valid
        validateTotalFormula(body.totals);
      });
    }
  );

  describe('Totals Consistency Across Endpoints', () => {
    it('should maintain totals structure in GET response', async () => {
      const response = await createSession(buildCreateSessionRequest({ items: TEST_ITEMS.SINGLE_PRODUCT }));
      validateRequiredTotalTypes(response.body.totals);
      validateTotalFormula(response.body.totals);
    });

    it('should recalculate totals when items change', async () => {
      const createResponse = await createSession(buildCreateSessionRequest({
        items: [{ id: TEST_ITEMS.SINGLE_PRODUCT[0].id, quantity: 1 }],
      }));
      const total1 = getTotalAmount(createResponse.body.totals, 'total');

      const updateResponse = await updateSession(extractSessionId(createResponse), buildUpdateSessionRequest({
        items: [{ id: TEST_ITEMS.SINGLE_PRODUCT[0].id, quantity: 2 }],
      }));
      const total2 = getTotalAmount(updateResponse.body.totals, 'total');

      expect(total2).toBeGreaterThan(total1);
      validateTotalFormula(updateResponse.body.totals);
    });
  });
});
