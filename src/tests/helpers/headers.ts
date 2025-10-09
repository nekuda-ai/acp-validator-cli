/**
 * ACP Request Headers
 * Generates required headers for all ACP Checkout API endpoints
 */

import { randomUUID } from 'crypto';

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_API_VERSION = '2025-09-12';
export const DEFAULT_USER_AGENT = 'ACP-Test-CLI/0.1.0';
export const DEFAULT_ACCEPT_LANGUAGE = 'en-US';

// ============================================================================
// Header Generators
// ============================================================================

/**
 * Generate a unique idempotency key (UUID v4)
 */
export function generateIdempotencyKey(): string {
  return randomUUID();
}

/**
 * Generate a unique request ID (UUID v4)
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Generate RFC 3339 timestamp
 * @returns ISO 8601 timestamp (e.g., "2025-09-25T10:30:00Z")
 */
export function generateTimestamp(): string {
  return new Date().toISOString();
}

// ============================================================================
// ACP Headers Builder
// ============================================================================

export interface ACPHeaderOptions {
  apiKey: string;
  apiVersion?: string;
  userAgent?: string;
  acceptLanguage?: string;
  idempotencyKey?: string;
  requestId?: string;
  timestamp?: string;
}

/**
 * Generate all required ACP request headers
 * Per OpenAI Checkout Spec, all endpoints require these headers
 */
export function generateACPHeaders(options: ACPHeaderOptions): Record<string, string> {
  const {
    apiKey,
    apiVersion = DEFAULT_API_VERSION,
    userAgent = DEFAULT_USER_AGENT,
    acceptLanguage = DEFAULT_ACCEPT_LANGUAGE,
    idempotencyKey = generateIdempotencyKey(),
    requestId = generateRequestId(),
    timestamp = generateTimestamp(),
  } = options;

  return {
    'Authorization': `Bearer ${apiKey}`,
    'Accept-Language': acceptLanguage,
    'User-Agent': userAgent,
    'Idempotency-Key': idempotencyKey,
    'Request-Id': requestId,
    'Content-Type': 'application/json',
    'Timestamp': timestamp,
    'API-Version': apiVersion,
  };
}

/**
 * Generate minimal ACP headers (just API key and auto-generated IDs)
 * Useful for quick tests
 */
export function generateMinimalACPHeaders(apiKey: string): Record<string, string> {
  return generateACPHeaders({ apiKey });
}
