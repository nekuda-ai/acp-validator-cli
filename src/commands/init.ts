import { input, select, confirm } from '@inquirer/prompts';
import type { ACPConfig } from '../config/types.js';
import { saveConfig } from '../config/loader.js';

export async function initCommand(): Promise<void> {
  console.log('\n🚀 ACP Test CLI - Configuration Setup\n');

  const checkoutUrl = await input({
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

  const usePaymentUrl = await confirm({
    message: 'Use separate Payment API URL?',
    default: false,
  });

  let paymentUrl: string | undefined;
  if (usePaymentUrl) {
    paymentUrl = await input({
      message: 'Payment API URL:',
      default: 'http://localhost:3005',
      validate: (value) => {
        if (!value) return true; // Optional
        try {
          new URL(value);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      },
    });
  }

  const apiKey = await input({
    message: 'API Key:',
    default: 'test_key_123',
    validate: (value) => value ? true : 'API Key is required',
  });

  const testType = await select({
    message: 'Test type:',
    choices: [
      { name: 'Simple (happy path only)', value: 'simple' },
      { name: 'Comprehensive (all tests)', value: 'comprehensive' },
    ],
    default: 'simple',
  }) as 'simple' | 'comprehensive';

  const outputFormat = await select({
    message: 'Report format:',
    choices: [
      { name: 'JSON', value: 'json' },
      { name: 'YAML', value: 'yaml' },
      { name: 'HTML', value: 'html' },
    ],
    default: 'json',
  }) as 'json' | 'yaml' | 'html';

  const config: ACPConfig = {
    checkoutUrl,
    paymentUrl: usePaymentUrl ? paymentUrl : undefined,
    apiKey,
    testType,
    outputFormat,
  };

  const configFormat = await select({
    message: 'Save config as:',
    choices: [
      { name: 'YAML (acp.config.yaml)', value: 'yaml' },
      { name: 'JSON (acp.config.json)', value: 'json' },
    ],
    default: 'yaml',
  }) as 'json' | 'yaml';

  const filename = await saveConfig(config, configFormat);

  console.log(`\n✅ Config saved to ${filename}\n`);
  console.log('Run "acp-test run" to start testing!\n');
}
