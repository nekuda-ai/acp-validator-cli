# ACP Agentic Checkout Test CLI

<img width="1500" height="500" alt="image" src="https://github.com/user-attachments/assets/99fcf17e-9f2d-4c67-89a3-fb4dcf937c90" />

> **Test and validate your ACP Agentic Checkout implementation**

A CLI tool for testing ACP (Agentic Commerce Protocol) Agentic Checkout API endpoints against OpenAI's official specification. Perfect for merchants building AI-native checkout experiences for ChatGPT and other AI platforms.

## Features

### ✅ Comprehensive Testing
- **Full API Coverage**: Tests all 5 ACP Checkout endpoints (CREATE, UPDATE, COMPLETE, CANCEL, GET)
- **151 Test Cases**: Production-grade test suite covering happy paths, edge cases, and error scenarios
- **Spec Compliance**: Validates responses against OpenAI's official OpenAPI schema

### 🎯 Smart Validation
- **Automatic Schema Validation**: Ensures your API responses match the ACP specification
- **Totals Calculation Checks**: Validates monetary calculations (subtotal, tax, fees, totals)
- **State Management Testing**: Verifies correct checkout session state transitions
- **Idempotency Verification**: Tests retry safety for CREATE and COMPLETE operations

### 📊 Developer-Friendly Output
- **Clear Test Reports**: See exactly what passed and what needs fixing
- **Error Details**: Detailed messages showing what went wrong and why
- **Fast Execution**: Runs 151 tests in seconds

### 🔧 Flexible Configuration
- **Config File**: Use `acp.config.yaml` for persistent settings
- **CLI Arguments**: Override config with command-line flags
- **Interactive Mode**: Prompts for missing required fields

## Installation

### Prerequisites
- **Node.js** 20.0.0 or higher
- **npm** or **yarn**

### Install via npm

```bash
npm install -g @nekuda/acp-test
```

### Install from source

```bash
git clone <repo-url>
cd acp-test-cli
npm install
npm run build
npm link
```

## Quick Start

### 1. Initialize Configuration

Create a config file with your API details:

```bash
acp-test init
```

This creates `acp.config.yaml`:

```yaml
checkoutUrl: https://your-api.com
apiKey: your_api_key_here
apiVersion: '2025-09-29'
```

### 2. Run Tests

Run the full test suite against your API:

```bash
acp-test run
```

Or specify options directly:

```bash
acp-test run \
  --checkout-url https://your-api.com \
  --api-key your_key_here \
  --api-version 2025-09-29
```

### 3. Review Results

The CLI will show you test results in real-time:

```
✓ should create checkout session with items (125ms)
✓ should update session with shipping address (89ms)
✓ should select fulfillment option (76ms)
✓ should complete checkout with payment (152ms)

Test Files  1 passed (1)
     Tests  151 passed (151)
```

## Usage

### Commands

#### `init`
Create or update your ACP test configuration file.

```bash
acp-test init
```

#### `run`
Execute the full ACP compliance test suite.

```bash
acp-test run [options]
```

**Options:**
- `-u, --checkout-url <url>` - Your ACP Checkout API base URL
- `-k, --api-key <key>` - API key for authentication
- `-v, --api-version <version>` - ACP API version (default: `2025-09-29`)
- `-c, --config <path>` - Path to config file (default: `acp.config.yaml`)

#### `validate`
Validate your ACP API implementation.

```bash
acp-test validate [options]
```

Same options as `run` command.

### Configuration File

Create `acp.config.yaml` in your project root:

```yaml
# Required: Your ACP Checkout API endpoint
checkoutUrl: https://api.yourstore.com

# Required: Authentication key
apiKey: sk_test_abc123

# Optional: API version (defaults to latest)
apiVersion: '2025-09-29'

# Optional: Request timeout in milliseconds
timeout: 30000
```

## What Gets Tested

### Core Checkout Flow
- ✅ Session creation with/without addresses
- ✅ Updating items, quantities, and customer details
- ✅ Shipping address validation and fulfillment options
- ✅ Fulfillment selection and cost calculation
- ✅ Payment token handling
- ✅ Session completion and order confirmation
- ✅ Session cancellation

### Validation & Error Handling
- ✅ Missing required fields (`missing` error code)
- ✅ Invalid data formats (`invalid` error code)
- ✅ Out of stock scenarios (`out_of_stock` error code)
- ✅ Payment declines (`payment_declined` error code)
- ✅ Proper HTTP status codes (200, 201, 400, 409)

### Data Integrity
- ✅ Currency format validation (ISO 4217)
- ✅ Address format validation (ISO 3166)
- ✅ Monetary calculations (amounts in minor units)
- ✅ Totals formula: `total = subtotal - discount + fulfillment + tax + fee`
- ✅ Line item calculations: `total = subtotal + tax`, `subtotal = base_amount - discount`

### Advanced Features
- ✅ Idempotency key handling
- ✅ Request ID tracing
- ✅ API versioning
- ✅ Webhook payload validation
- ✅ Links (ToS, Privacy Policy)

## Example Test Output

```
PASS  src/tests/checkout.test.ts (4.2s)
  Checkout Session Management
    ✓ should create session with single item
    ✓ should create session with multiple items
    ✓ should update session with buyer info
    ✓ should add shipping address
    ✓ should retrieve fulfillment options
    ✓ should select shipping method
    ✓ should complete checkout with payment

  Idempotency
    ✓ should return same session for duplicate CREATE with same key
    ✓ should return 409 for same key with different body
    ✓ should return same result for duplicate COMPLETE

  Error Scenarios
    ✓ should handle missing items field (400)
    ✓ should handle invalid postal code
    ✓ should handle out of stock items
    ✓ should handle payment declined

✓ 151 tests passed
```

## Testing Against OpenAI ChatGPT

Before going live with ChatGPT Instant Checkout:

1. **Run Full Test Suite**: Ensure all 151 tests pass
2. **Review Error Handling**: Verify all error codes are implemented
3. **Check Totals**: Confirm monetary calculations are accurate
4. **Test Idempotency**: Verify safe retry behavior
5. **Validate Webhooks**: Ensure order events are emitted correctly

## Development

### Build

```bash
npm run build
```

Outputs compiled CLI to `dist/cli.js` with TypeScript declarations.

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
npm run format
```

### Run Tests

```bash
npm test
```

## Project Structure

```
acp-test-cli/
├── src/
│   ├── cli.ts                 # Main CLI entry point
│   ├── commands/              # CLI command implementations
│   │   ├── init.ts
│   │   ├── run.ts
│   │   └── validate.ts
│   ├── config/                # Configuration handling
│   ├── tests/                 # ACP test suite (151 tests)
│   │   ├── checkout.test.ts
│   │   ├── error-scenarios.test.ts
│   │   ├── idempotency.test.ts
│   │   └── totals-validation.test.ts
│   └── types/                 # TypeScript definitions
├── spec/                      # OpenAPI schema
├── package.json
└── tsup.config.ts             # Build configuration
```

## Resources

- **ACP Documentation**: https://agenticcommerce.dev/
- **OpenAI Commerce Docs**: https://developers.openai.com/commerce
- **Apply for ChatGPT Merchants**: https://chatgpt.com/merchants
- **ACP GitHub**: https://github.com/agentic-commerce-protocol/agentic-commerce-protocol

## Contributing

If you're interested in collaborating or contributing, get in touch at **[founder@nekuda.ai](mailto:founder@nekuda.ai)**.

## License

Licensed under the Apache 2.0 License.

---

