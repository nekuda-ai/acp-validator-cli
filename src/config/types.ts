export interface ACPConfig {
  checkoutUrl: string;
  paymentUrl?: string;
  apiKey: string;
  testType: 'simple' | 'comprehensive';
  outputFormat: 'json' | 'yaml' | 'html';
  outputDir?: string;
  verbose?: boolean;
}

export interface ConfigOptions {
  checkoutUrl?: string;
  paymentUrl?: string;
  apiKey?: string;
  type?: 'simple' | 'comprehensive';
  format?: 'json' | 'yaml' | 'html';
  config?: string;
  output?: string;
  verbose?: boolean;
}
