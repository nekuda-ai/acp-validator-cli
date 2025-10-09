import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { loadConfig, saveConfig } from './loader.js';
import type { ACPConfig } from './types.js';

describe('Config Loader', () => {
  const testConfigDir = '/tmp/acp-test-config';
  const yamlConfigPath = `${testConfigDir}/acp.config.yaml`;
  const jsonConfigPath = `${testConfigDir}/acp.config.json`;

  beforeEach(async () => {
    await mkdir(testConfigDir, { recursive: true });
    process.chdir(testConfigDir);
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await unlink(yamlConfigPath);
    } catch {}
    try {
      await unlink(jsonConfigPath);
    } catch {}
  });

  describe('loadConfig', () => {
    it('should return undefined when no config file exists', async () => {
      const config = await loadConfig();
      expect(config).toBeUndefined();
    });

    it('should load YAML config file', async () => {
      const testConfig: ACPConfig = {
        checkoutUrl: 'http://localhost:3004',
        apiKey: 'test_key',
        testType: 'simple',
        outputFormat: 'json',
      };

      await writeFile(
        yamlConfigPath,
        `checkoutUrl: http://localhost:3004
apiKey: test_key
testType: simple
outputFormat: json`,
        'utf-8'
      );

      const config = await loadConfig();
      expect(config).toEqual(testConfig);
    });

    it('should load JSON config file', async () => {
      const testConfig: ACPConfig = {
        checkoutUrl: 'http://localhost:3004',
        apiKey: 'test_key',
        testType: 'comprehensive',
        outputFormat: 'html',
      };

      await writeFile(jsonConfigPath, JSON.stringify(testConfig), 'utf-8');

      const config = await loadConfig();
      expect(config).toEqual(testConfig);
    });

    it('should load config from custom path', async () => {
      const customPath = `${testConfigDir}/custom.yaml`;
      const testConfig: ACPConfig = {
        checkoutUrl: 'http://custom.com',
        apiKey: 'custom_key',
        testType: 'simple',
        outputFormat: 'yaml',
      };

      await writeFile(
        customPath,
        `checkoutUrl: http://custom.com
apiKey: custom_key
testType: simple
outputFormat: yaml`,
        'utf-8'
      );

      const config = await loadConfig(customPath);
      expect(config).toEqual(testConfig);
    });

    it('should handle optional fields', async () => {
      await writeFile(
        yamlConfigPath,
        `checkoutUrl: http://localhost:3004
apiKey: test_key
testType: simple
outputFormat: json
paymentUrl: http://localhost:3005
outputDir: ./reports`,
        'utf-8'
      );

      const config = await loadConfig();
      expect(config?.paymentUrl).toBe('http://localhost:3005');
      expect(config?.outputDir).toBe('./reports');
    });
  });

  describe('saveConfig', () => {
    it('should save config as YAML', async () => {
      const testConfig: ACPConfig = {
        checkoutUrl: 'http://localhost:3004',
        apiKey: 'test_key',
        testType: 'simple',
        outputFormat: 'json',
      };

      const filename = await saveConfig(testConfig, 'yaml');
      expect(filename).toBe('acp.config.yaml');

      // Verify file was created and can be loaded
      const loaded = await loadConfig();
      expect(loaded).toEqual(testConfig);
    });

    it('should save config as JSON', async () => {
      const testConfig: ACPConfig = {
        checkoutUrl: 'http://localhost:3004',
        apiKey: 'test_key',
        testType: 'comprehensive',
        outputFormat: 'html',
      };

      const filename = await saveConfig(testConfig, 'json');
      expect(filename).toBe('acp.config.json');

      // Verify file was created and can be loaded
      const loaded = await loadConfig();
      expect(loaded).toEqual(testConfig);
    });

    it('should save optional fields', async () => {
      const testConfig: ACPConfig = {
        checkoutUrl: 'http://localhost:3004',
        paymentUrl: 'http://localhost:3005',
        apiKey: 'test_key',
        testType: 'simple',
        outputFormat: 'json',
        outputDir: './custom-reports',
      };

      await saveConfig(testConfig, 'yaml');

      const loaded = await loadConfig();
      expect(loaded?.paymentUrl).toBe('http://localhost:3005');
      expect(loaded?.outputDir).toBe('./custom-reports');
    });
  });
});
