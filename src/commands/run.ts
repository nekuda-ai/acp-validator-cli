import { input } from '@inquirer/prompts';
import { startVitest } from 'vitest/node';
import { render } from 'ink';
import React from 'react';
import path from 'path';
import type { ConfigOptions, ACPConfig } from '../config/types.js';
import { loadConfig } from '../config/loader.js';
import YAMLReporter from '../reporters/yaml-reporter.js';
import { StreamReporter } from '../reporters/stream-reporter.js';
import { TestStateManager } from '../core/test-state.js';
import { RunScreen } from '../ui/screens/RunScreen.js';

export async function runCommand(options: ConfigOptions): Promise<void> {
  // Load config from file if --config specified or search default locations
  let config: ACPConfig | undefined = undefined;

  if (options.config) {
    console.log(`Loading config from: ${options.config}`);
    config = await loadConfig(options.config);
    if (!config) {
      console.error(`Config file not found: ${options.config}`);
      process.exit(1);
    }
  } else {
    // Try to load config, but don't fail if not found
    config = await loadConfig();
    if (config) {
      console.log('Loaded config from file\n');
    }
  }

  // Merge CLI options with config file (CLI options take precedence)
  let checkoutUrl = options.checkoutUrl || config?.checkoutUrl;
  let apiKey = options.apiKey || config?.apiKey;

  // Prompt for missing REQUIRED fields (yargs interactive pattern)
  if (!checkoutUrl) {
    checkoutUrl = await input({
      message: 'Checkout API URL:',
      default: 'http://localhost:3004',
      validate: (value) => {
        if (!value) return 'Checkout URL is required';
        try {
          new URL(value);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      },
    });
  }

  if (!apiKey) {
    apiKey = await input({
      message: 'API Key:',
      default: 'test_key_123',
      validate: (value) => value ? true : 'API Key is required',
    });
  }

  // Build final config with defaults for optional fields
  const finalConfig: ACPConfig = {
    checkoutUrl,
    paymentUrl: options.paymentUrl || config?.paymentUrl,
    apiKey,
    testType: options.type || config?.testType || 'simple',
    outputFormat: options.format || config?.outputFormat || 'json',
    outputDir: options.output || config?.outputDir,
    verbose: options.verbose || config?.verbose || false,
  };

  console.log('\nConfiguration:');
  console.log(`  Checkout URL: ${finalConfig.checkoutUrl}`);
  console.log(`  Payment URL: ${finalConfig.paymentUrl || '(same as checkout)'}`);
  console.log(`  Test Type: ${finalConfig.testType}`);
  console.log(`  Output Format: ${finalConfig.outputFormat}`);
  if (finalConfig.outputDir) {
    console.log(`  Output Directory: ${finalConfig.outputDir}`);
  }
  console.log();

  // Set environment variables for tests to read
  process.env.CHECKOUT_URL = finalConfig.checkoutUrl;
  process.env.API_KEY = finalConfig.apiKey;
  if (finalConfig.paymentUrl) {
    process.env.PAYMENT_URL = finalConfig.paymentUrl;
  }
  process.env.TEST_TYPE = finalConfig.testType;

  // Set output file for reporters (YAML reporter reads this)
  if (finalConfig.outputDir) {
    process.env.VITEST_OUTPUT_FILE = getOutputFile(finalConfig.outputFormat, finalConfig.outputDir);
  }

  try {
    // Create test state manager (business logic layer)
    const testState = new TestStateManager();

    // Render Ink UI (non-blocking)
    const { waitUntilExit } = render(
      React.createElement(RunScreen, {
        testState,
        checkoutUrl: finalConfig.checkoutUrl,
        verbose: finalConfig.verbose || false,
      })
    );

    // Build reporters list
    const reporters: any[] = [new StreamReporter(testState)];

    // Add file output reporter if needed
    if (finalConfig.outputDir) {
      reporters.push(getReporter(finalConfig.outputFormat));
    }

    // Start Vitest programmatically
    const vitest = await startVitest(
      'test',
      [], // No CLI filters
      {
        // Only run external merchant validation tests
        include: ['**/src/tests/**/*.test.ts'],
        // Exclude internal CLI tests
        exclude: [
          '**/src/commands/**/*.test.ts',
          '**/src/config/**/*.test.ts',
          '**/node_modules/**',
        ],
        // Disable watch mode
        watch: false,
        // Configure reporters
        reporters,
        // Set output file if directory specified
        ...(finalConfig.outputDir && {
          outputFile: getOutputFile(finalConfig.outputFormat, finalConfig.outputDir),
        }),
        // Run tests in sequence for better logging
        sequence: {
          shuffle: false,
        },
        // Silent mode - suppress vitest's own output
        silent: true,
        ui: false,
      }
    );

    if (!vitest) {
      console.error('Failed to start Vitest');
      process.exit(1);
    }

    // Wait for tests to complete
    await vitest.close();

    // Wait for UI to finish rendering
    await waitUntilExit();

    // Get test results for exit code
    const failedTests = vitest.state.getCountOfFailedTests();

    // Show output file location if generated
    if (finalConfig.outputDir) {
      const reportFile = getOutputFile(finalConfig.outputFormat, finalConfig.outputDir);
      console.log(`\nDetailed report saved: ${reportFile}`);
    }

    // Exit with appropriate code
    process.exit(failedTests === 0 ? 0 : 1);
  } catch (error) {
    console.error('\nError running tests:', error);
    process.exit(1);
  }
}

/**
 * Get the appropriate Vitest reporter based on output format
 */
function getReporter(format: 'json' | 'yaml' | 'html'): 'json' | 'html' | 'default' | YAMLReporter {
  switch (format) {
    case 'json':
      return 'json';
    case 'html':
      // Use Vitest's built-in HTML reporter
      return 'html';
    case 'yaml':
      // Use custom YAML reporter
      return new YAMLReporter();
    default:
      return 'default';
  }
}

/**
 * Get the output file path for the report
 */
function getOutputFile(format: string, outputDir: string): string {
  const filename = `acp-test-report.${format}`;
  return path.join(outputDir, filename);
}
