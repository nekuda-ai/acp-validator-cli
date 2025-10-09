/**
 * Shared Request Helpers
 * Reusable HTTP request functions for all ACP Checkout endpoints
 * Reduces code duplication and ensures consistent request patterns
 */

import request from 'supertest';
import { generateACPHeaders } from './headers.js';
import type {
  CreateSessionRequest,
  UpdateSessionRequest,
  CompleteSessionRequest,
} from '../../types/acp.js';

// ============================================================================
// Configuration
// ============================================================================

const BASE_URL = process.env.CHECKOUT_URL || 'http://localhost:3004';
const API_KEY = process.env.API_KEY || 'test_key_123';

// ============================================================================
// Checkout Session Endpoints
// ============================================================================

/**
 * POST /checkout_sessions - Create a new checkout session
 */
export async function createSession(
  requestBody: CreateSessionRequest,
  customHeaders?: Record<string, string>
) {
  return request(BASE_URL)
    .post('/checkout_sessions')
    .set(generateACPHeaders({ apiKey: API_KEY }))
    .set(customHeaders || {})
    .send(requestBody);
}

/**
 * GET /checkout_sessions/{id} - Get checkout session details
 */
export async function getSession(sessionId: string) {
  return request(BASE_URL)
    .get(`/checkout_sessions/${sessionId}`)
    .set(generateACPHeaders({ apiKey: API_KEY }));
}

/**
 * POST /checkout_sessions/{id} - Update checkout session
 */
export async function updateSession(
  sessionId: string,
  requestBody: UpdateSessionRequest
) {
  return request(BASE_URL)
    .post(`/checkout_sessions/${sessionId}`)
    .set(generateACPHeaders({ apiKey: API_KEY }))
    .send(requestBody);
}

/**
 * POST /checkout_sessions/{id}/complete - Complete checkout with payment
 */
export async function completeSession(
  sessionId: string,
  requestBody: CompleteSessionRequest,
  customHeaders?: Record<string, string>
) {
  return request(BASE_URL)
    .post(`/checkout_sessions/${sessionId}/complete`)
    .set(generateACPHeaders({ apiKey: API_KEY }))
    .set(customHeaders || {})
    .send(requestBody);
}

/**
 * POST /checkout_sessions/{id}/cancel - Cancel checkout session
 */
export async function cancelSession(sessionId: string) {
  return request(BASE_URL)
    .post(`/checkout_sessions/${sessionId}/cancel`)
    .set(generateACPHeaders({ apiKey: API_KEY }))
    .send({});
}

// ============================================================================
// Helper Utilities
// ============================================================================

/**
 * Extract session ID from create/update response
 */
export function extractSessionId(response: any): string {
  return response.body.id;
}

/**
 * Extract first fulfillment option ID from response
 */
export function extractFirstFulfillmentOptionId(response: any): string | undefined {
  const options = response.body.fulfillment_options;
  return options && options.length > 0 ? options[0].id : undefined;
}
