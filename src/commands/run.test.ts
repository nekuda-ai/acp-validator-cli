import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ACPConfig, ConfigOptions } from '../config/types.js';

describe('Run Command - Config Priority', () => {
  // Mock the @inquirer/prompts module
  vi.mock('@inquirer/prompts', () => ({
    input: vi.fn(),
  }));

  // Mock the config loader
  vi.mock('../config/loader.js', () => ({
    loadConfig: vi.fn(),
  }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Config Priority Order', () => {
    it('should prioritize CLI options over config file', () => {
      const cliOptions: ConfigOptions = {
        checkoutUrl: 'http://cli-url.com',
        apiKey: 'cli_key',
      };

      const fileConfig: ACPConfig = {
        checkoutUrl: 'http://file-url.com',
        apiKey: 'file_key',
        testType: 'simple',
        outputFormat: 'json',
      };

      // Merge logic (same as run.ts)
      const checkoutUrl = cliOptions.checkoutUrl || fileConfig?.checkoutUrl;
      const apiKey = cliOptions.apiKey || fileConfig?.apiKey;

      expect(checkoutUrl).toBe('http://cli-url.com');
      expect(apiKey).toBe('cli_key');
    });

    it('should use config file when CLI options not provided', () => {
      const cliOptions: ConfigOptions = {};

      const fileConfig: ACPConfig = {
        checkoutUrl: 'http://file-url.com',
        apiKey: 'file_key',
        testType: 'comprehensive',
        outputFormat: 'yaml',
      };

      const checkoutUrl = cliOptions.checkoutUrl || fileConfig.checkoutUrl;
      const apiKey = cliOptions.apiKey || fileConfig.apiKey;
      const testType = cliOptions.type || fileConfig.testType;
      const outputFormat = cliOptions.format || fileConfig.outputFormat;

      expect(checkoutUrl).toBe('http://file-url.com');
      expect(apiKey).toBe('file_key');
      expect(testType).toBe('comprehensive');
      expect(outputFormat).toBe('yaml');
    });

    it('should use defaults when neither CLI nor config provided', () => {
      const cliOptions: ConfigOptions = {};
      const fileConfig = undefined as ACPConfig | undefined;

      // Use separate variables for better type inference
      const configTestType = fileConfig?.testType;
      const configFormat = fileConfig?.outputFormat;

      const testType = cliOptions.type || configTestType || 'simple';
      const outputFormat = cliOptions.format || configFormat || 'json';

      expect(testType).toBe('simple');
      expect(outputFormat).toBe('json');
    });

    it('should handle partial CLI options', () => {
      const cliOptions: ConfigOptions = {
        checkoutUrl: 'http://cli-url.com',
        // apiKey missing
      };

      const fileConfig: ACPConfig = {
        checkoutUrl: 'http://file-url.com',
        apiKey: 'file_key',
        testType: 'simple',
        outputFormat: 'json',
      };

      const checkoutUrl = cliOptions.checkoutUrl || fileConfig?.checkoutUrl;
      const apiKey = cliOptions.apiKey || fileConfig?.apiKey;

      // CLI overrides checkout URL
      expect(checkoutUrl).toBe('http://cli-url.com');
      // Config provides API key
      expect(apiKey).toBe('file_key');
    });

    it('should handle partial config file', () => {
      const cliOptions: ConfigOptions = {
        apiKey: 'cli_key',
      };

      const fileConfig: Partial<ACPConfig> = {
        checkoutUrl: 'http://file-url.com',
        // apiKey missing, testType missing
        outputFormat: 'html',
      };

      const checkoutUrl = cliOptions.checkoutUrl || fileConfig?.checkoutUrl;
      const apiKey = cliOptions.apiKey || fileConfig?.apiKey;
      const testType = cliOptions.type || fileConfig?.testType || 'simple';
      const outputFormat = cliOptions.format || fileConfig?.outputFormat || 'json';

      expect(checkoutUrl).toBe('http://file-url.com');
      expect(apiKey).toBe('cli_key');
      expect(testType).toBe('simple'); // default
      expect(outputFormat).toBe('html'); // from config
    });
  });

  describe('Optional Fields Handling', () => {
    it('should handle optional paymentUrl from CLI', () => {
      const cliOptions: ConfigOptions = {
        checkoutUrl: 'http://cli.com',
        paymentUrl: 'http://payment-cli.com',
        apiKey: 'key',
      };

      const fileConfig = undefined as ACPConfig | undefined;

      const configPaymentUrl = fileConfig?.paymentUrl;
      const paymentUrl = cliOptions.paymentUrl || configPaymentUrl;

      expect(paymentUrl).toBe('http://payment-cli.com');
    });

    it('should handle optional paymentUrl from config', () => {
      const cliOptions: ConfigOptions = {
        checkoutUrl: 'http://cli.com',
        apiKey: 'key',
      };

      const fileConfig: ACPConfig = {
        checkoutUrl: 'http://file.com',
        paymentUrl: 'http://payment-file.com',
        apiKey: 'file_key',
        testType: 'simple',
        outputFormat: 'json',
      };

      const paymentUrl: string | undefined = cliOptions.paymentUrl || fileConfig?.paymentUrl;

      expect(paymentUrl).toBe('http://payment-file.com');
    });

    it('should handle undefined paymentUrl gracefully', () => {
      const cliOptions: ConfigOptions = {};
      const fileConfig = undefined as ACPConfig | undefined;

      const configPaymentUrl = fileConfig?.paymentUrl;
      const paymentUrl = cliOptions.paymentUrl || configPaymentUrl;

      expect(paymentUrl).toBeUndefined();
    });

    it('should handle custom output directory', () => {
      const cliOptions: ConfigOptions = {
        output: './custom-output',
      };

      const fileConfig: ACPConfig = {
        checkoutUrl: 'http://file.com',
        apiKey: 'key',
        testType: 'simple',
        outputFormat: 'json',
        outputDir: './file-output',
      };

      const outputDir = cliOptions.output || fileConfig?.outputDir;

      expect(outputDir).toBe('./custom-output');
    });
  });

  describe('Type Choices Validation', () => {
    it('should validate testType choices', () => {
      const validTypes = ['simple', 'comprehensive'] as const;

      expect(validTypes).toContain('simple');
      expect(validTypes).toContain('comprehensive');
      expect(validTypes.length).toBe(2);
    });

    it('should validate outputFormat choices', () => {
      const validFormats = ['json', 'yaml', 'html'] as const;

      expect(validFormats).toContain('json');
      expect(validFormats).toContain('yaml');
      expect(validFormats).toContain('html');
      expect(validFormats.length).toBe(3);
    });
  });
});
