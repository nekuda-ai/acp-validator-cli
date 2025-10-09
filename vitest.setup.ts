import { expect } from 'vitest';
import { Validator } from '@seriousme/openapi-schema-validator';
import path from 'path';
import fs from 'fs';
import Ajv from 'ajv';

// Load ACP Checkout OpenAPI spec
// Try local spec/ directory first (for production build), then protocol submodule (for development)
const specPaths = [
  path.join(__dirname, '../spec/openapi.agentic_checkout.yaml'), // Production/built package
  path.join(__dirname, '../../protocol/spec/openapi/openapi.agentic_checkout.yaml'), // Development (git submodule)
];

const specPath = specPaths.find((p) => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
});

if (!specPath) {
  throw new Error(`OpenAPI spec not found. Tried: ${specPaths.join(', ')}`);
}

// Initialize validator and load spec
const validator = new Validator();
const validationResult = await validator.validate(specPath);

if (!validationResult.valid) {
  console.error('Invalid OpenAPI spec:', validationResult.errors);
  throw new Error('Failed to load OpenAPI specification');
}

// Get dereferenced schema (all $refs resolved)
const schema = validator.resolveRefs();
const ajv = new Ajv({ strict: false, validateFormats: false });

// Create custom matcher for OpenAPI spec validation
expect.extend({
  toSatisfyApiSpec(received: any) {
    const { isNot } = this;

    // Extract response details from supertest response
    const status = received.status || received.statusCode;
    const body = received.body;
    const req = received.req;

    if (!req) {
      return {
        pass: false,
        message: () => 'Response object missing request information',
      };
    }

    // Extract method and path
    const method = req.method?.toLowerCase();
    const path = req.path;

    if (!method || !path) {
      return {
        pass: false,
        message: () => `Cannot determine method (${method}) or path (${path}) from request`,
      };
    }

    // Find the operation in the spec - must be exact match
    const pathItem = (schema.paths as any)?.[path];
    if (!pathItem) {
      return {
        pass: false,
        message: () => `Path ${path} not found in OpenAPI spec`,
      };
    }

    const operation = (pathItem as any)[method];
    if (!operation) {
      return {
        pass: false,
        message: () => `Method ${method.toUpperCase()} not defined for path ${path}`,
      };
    }

    // Check if status code is defined in spec
    const responseSpec = operation.responses?.[status.toString()];
    if (!responseSpec) {
      const validStatuses = Object.keys(operation.responses || {}).join(', ');
      return {
        pass: false,
        message: () =>
          `Status ${status} not defined for ${method.toUpperCase()} ${path}. Valid statuses: ${validStatuses}`,
      };
    }

    // Validate response body against schema if present
    const contentType = 'application/json'; // We only test JSON APIs
    const mediaType = responseSpec.content?.[contentType];

    if (mediaType?.schema) {
      const validate = ajv.compile(mediaType.schema);
      const valid = validate(body);

      if (!valid) {
        return {
          pass: false,
          message: () =>
            `Response body does not match schema for ${method.toUpperCase()} ${path} (${status}):\n${JSON.stringify(
              validate.errors,
              null,
              2
            )}`,
          actual: body,
          expected: mediaType.schema,
        };
      }
    }

    return {
      pass: true,
      message: () =>
        `${method.toUpperCase()} ${path} response (${status}) ${isNot ? 'does not satisfy' : 'satisfies'} OpenAPI spec`,
    };
  },
});
