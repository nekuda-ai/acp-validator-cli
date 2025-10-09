import { cosmiconfig } from 'cosmiconfig';
import type { ACPConfig } from './types.js';

const MODULE_NAME = 'acp';

export async function loadConfig(configPath?: string): Promise<ACPConfig | undefined> {
  const explorer = cosmiconfig(MODULE_NAME, {
    searchPlaces: [
      'acp.config.json',
      'acp.config.yaml',
      'acp.config.yml',
      '.acprc',
      '.acprc.json',
      '.acprc.yaml',
      '.acprc.yml',
    ],
  });

  try {
    const result = configPath
      ? await explorer.load(configPath)
      : await explorer.search();

    if (!result || !result.config) {
      return undefined;
    }

    return result.config as ACPConfig;
  } catch (error) {
    console.error('Error loading config:', error);
    return undefined;
  }
}

export async function saveConfig(config: ACPConfig, format: 'json' | 'yaml' = 'yaml'): Promise<string> {
  const fs = await import('fs/promises');
  const yaml = await import('js-yaml');

  const filename = format === 'json' ? 'acp.config.json' : 'acp.config.yaml';
  const content = format === 'json'
    ? JSON.stringify(config, null, 2)
    : yaml.dump(config);

  await fs.writeFile(filename, content, 'utf-8');
  return filename;
}
